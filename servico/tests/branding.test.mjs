import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {branding,validateBranding} from '../server/branding.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
const value={brand:'Marca',primaryColor:'#ffcc00',logoDataUrl:png,version:0};
test('marca valida cores e PNG limitado, rejeitando URLs, SVG e imagens grandes',()=>{
  assert.equal(validateBranding(value).logoDataUrl,png);
  for(const invalid of [{brand:' '},{brand:'a'.repeat(25)},{primaryColor:'red'},{primaryColor:'url(https://test)'},{logoDataUrl:'https://test/logo.png'},{logoDataUrl:'data:image/svg+xml;base64,PHN2Zz4='},{logoDataUrl:'data:image/png;base64,AAAA'},{version:-1},{logoDataUrl:png+'A'.repeat(140000)}])assert.throws(()=>validateBranding({...value,...invalid}),e=>e.status===400);
  const large=Buffer.from(png.slice(22),'base64');large.writeUInt32BE(513,16);
  assert.throws(()=>validateBranding({...value,logoDataUrl:'data:image/png;base64,'+large.toString('base64')}),e=>e.status===400);
});
test('master personaliza parceira sem afetar outras empresas e controla edição concorrente',async t=>{
  const db=openDatabase(':memory:'),tokens={};
  for(const org of ['root','partner','outside'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
  db.prepare('INSERT INTO company_partners VALUES(?,?)').run('partner','root');
  for(const [id,org,role,master] of [['master','root','admin',true],['ordinary','root','admin',false],['partner','partner','admin',false],['outside','outside','admin',true],['op','root','operator',false]]){
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run(id,org,id,id+'@example.test','unused',role);
    const token=randomBytes(32).toString('hex');tokens[id]='invictus_session='+token;
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',Date.now()+3600000);
    if(master)db.prepare('INSERT INTO platform_admins VALUES(?)').run(id);
  }
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,who='master',data,csrf='csrf')=>fetch(base+path,{method:data?'PATCH':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:tokens[who]||'','X-CSRF-Token':csrf},...(data?{body:JSON.stringify(data)}:{})});
  const path='/api/platform/branding/partner';
  assert.equal((await req(path,'none')).status,401);
  for(const who of ['ordinary','partner','op']){assert.equal((await req(path,who)).status,403);assert.equal((await req(path,who,value)).status,403)}
  assert.equal((await req(path,'outside')).status,404);
  assert.equal((await req('/api/platform/branding/outside','master',value)).status,404);
  assert.equal((await req(path,'master',value,'wrong')).status,403);
  assert.equal((await req(path,'master',{...value,logoDataUrl:'x'.repeat(140001)})).status,413);
  assert.equal((await req(path,'master',value)).status,200);
  const partnerState=await(await req('/api/state','partner')).json();assert.equal(partnerState.organization.brand,'Marca');assert.equal(partnerState.organization.branding.logoDataUrl,png);
  const ownState=await(await req('/api/state')).json();assert.equal(ownState.organization.brand,'root');assert.equal(ownState.organization.branding.logoDataUrl,null);
  assert.equal((await req(path,'master',value)).status,409);
  assert.equal((await req('/api/brand','partner',{brand:'Nova marca'})).status,200);
  assert.equal(branding(db,'partner').version,2);assert.equal(branding(db,'partner').logoDataUrl,png);
  assert.equal((await req(path,'master',{...value,version:1})).status,409);
  assert.equal((await req(path,'master',{...value,version:2,logoDataUrl:null,primaryColor:'#1973f9'})).status,200);
  assert.equal(branding(db,'partner').logoDataUrl,null);
  assert.ok(db.prepare("SELECT 1 FROM audit WHERE action='branding.updated'").get());
});
