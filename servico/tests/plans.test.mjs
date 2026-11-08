import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {installCommercial,locationLicense} from '../server/commercial.mjs';

test('catálogo master isolado, versionado e aplicado como condições fixas da licença',async t=>{
  const db=openDatabase(':memory:'),tokens={};
  for(const org of ['root','outside','partner'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
  db.prepare('INSERT INTO company_partners VALUES(?,?)').run('partner','root');
  for(const [id,org,master] of [['master','root',true],['ordinary','root',false],['outsider','outside',true],['partner','partner',false]]){
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run(id,org,id,id+'@example.test','unused','admin');
    const token=randomBytes(32).toString('hex');tokens[id]='invictus_session='+token;
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',Date.now()+3600000);
    if(master)db.prepare('INSERT INTO platform_admins VALUES(?)').run(id);
  }
  for(const [id,org] of [['home','root'],['branch','partner']])db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,org,id);
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,who='master',data,method=data?'POST':'GET',csrf='csrf')=>fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:tokens[who]||'','X-CSRF-Token':csrf},...(data?{body:JSON.stringify(data)}:{})});
  const plan={name:'Plano 16',cameraLimit:16,active:true,module:'patrimonial'};
  assert.equal((await req('/api/platform/plans','none')).status,401);
  for(const who of ['ordinary','partner']){
    assert.equal((await req('/api/platform/plans',who)).status,403);
    assert.equal((await req('/api/platform/plans',who,plan)).status,403);
  }
  assert.equal((await req('/api/platform/plans','master',plan,'POST','wrong')).status,403);
  for(const bad of [{cameraLimit:0},{cameraLimit:257},{cameraLimit:1.5},{module:'supermarket'},{active:'true'},{name:' '}])assert.equal((await req('/api/platform/plans','master',{...plan,...bad})).status,400);
  const created=await req('/api/platform/plans','master',plan);assert.equal(created.status,201);const {id}=await created.json();
  assert.equal((await(await req('/api/platform/plans','outsider')).json()).plans.length,0);
  assert.equal((await req('/api/platform/plans/'+id,'outsider',{...plan,version:1},'PATCH')).status,404);
  const foreign=await(await req('/api/platform/plans','outsider',plan)).json();
  const license={module:'patrimonial',enabled:true,plan:'Tampered',cameraLimit:256,expiresAt:null,version:0,planId:id,planVersion:1};
  assert.equal((await req('/api/platform/licenses/home','master',{...license,planId:foreign.id})).status,404);
  assert.equal((await req('/api/platform/licenses/home','master',{...license,planVersion:0})).status,400);
  for(const local of ['home','branch'])assert.equal((await req('/api/platform/licenses/'+local,'master',license)).status,200);
  assert.equal(locationLicense(db,'root','home').plan,'Plano 16');assert.equal(locationLicense(db,'root','home').cameraLimit,16);
  assert.equal(db.prepare('SELECT plan_version FROM license_plan_selections WHERE client_id=?').get('home').plan_version,1);
  const concurrent=await Promise.all([req('/api/platform/plans/'+id,'master',{...plan,name:'Plano 8',cameraLimit:8,version:1},'PATCH'),req('/api/platform/plans/'+id,'master',{...plan,name:'Plano 8',cameraLimit:8,version:1},'PATCH')]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  assert.equal(locationLicense(db,'root','home').cameraLimit,16);
  assert.equal((await req('/api/platform/licenses/home','master',{...license,version:1})).status,409);
  assert.equal((await req('/api/platform/licenses/home','master',{...license,version:1,planVersion:2})).status,200);
  assert.equal(locationLicense(db,'root','home').cameraLimit,8);
  assert.equal(locationLicense(db,'partner','branch').cameraLimit,16);
  assert.equal((await req('/api/platform/plans/'+id,'master',{...plan,active:false,version:2},'PATCH')).status,200);
  assert.equal((await req('/api/platform/licenses/home','master',{...license,version:2,planVersion:3})).status,409);
  assert.equal(locationLicense(db,'root','home').allowed,true);
  assert.equal((await req('/api/platform/licenses/home','master',{module:'patrimonial',enabled:true,plan:'Personalizado',cameraLimit:12,expiresAt:null,version:2})).status,200);
  assert.equal(db.prepare('SELECT * FROM license_plan_selections WHERE client_id=?').get('home'),undefined);
  const before=locationLicense(db,'root','home');installCommercial(db);assert.deepEqual(locationLicense(db,'root','home'),before);
  assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations').get().n,16);
  assert.equal((await req('/api/platform/plans/'+id,'master',undefined,'DELETE')).status,405);
  assert.ok(db.prepare("SELECT 1 FROM audit WHERE action='plan.created'").get());
});
