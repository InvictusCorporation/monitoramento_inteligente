import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {PassThrough} from 'node:stream';
import {openDatabase,createOrganization} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {locationLicense} from '../server/commercial.mjs';
import {sealConnection} from '../server/camera-secrets.mjs';
import {AIDetector} from '../server/ai-detector.mjs';
test('Cadastro de parceira revalida autorização e reverte se o registro de auditoria falhar',async()=>{
  const db=openDatabase(':memory:');db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('root','root','Root','Root');
  const data={name:'Child',slug:'child',adminName:'Admin',email:'fixture@example.test',password:'fixture-password-only-123!'};
  try{
    await assert.rejects(createOrganization(db,data,{parentId:'root',authorize(){throw Error('revoked')}}),/revoked/);
    await assert.rejects(createOrganization(db,data,{parentId:'root',onCreated(){throw Error('audit failed')}}),/audit failed/);
    assert.equal(db.prepare('SELECT count(*) n FROM organizations').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM company_partners').get().n,0);
  }finally{db.close()}
});

test('Master cria parceira isolada, agrupa locais e controla licença no servidor',async t=>{
  const db=openDatabase(':memory:');let now=Date.now();const key=randomBytes(32),tokens={};
  for(const org of ['root','outside'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
  function user(id,org,role='admin'){
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run(id,org,id,id+'@example.test','unused',role);
    const token=randomBytes(32).toString('hex');tokens[id]={cookie:'invictus_session='+token,csrf:'csrf'};
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',now+3600000);
  }
  user('master','root');user('ordinary','root');user('op','root','operator');user('outsider','outside');
  db.prepare('INSERT INTO platform_admins VALUES(?)').run('master');
  db.prepare('INSERT INTO commercial_centrals VALUES(?)').run('root');
  db.prepare('INSERT INTO clients VALUES(?,?,?)').run('legacy','root','Local antigo');db.prepare('INSERT INTO clients VALUES(?,?,?)').run('foreign','outside','Outro local');
  db.prepare('INSERT INTO commercial_legacy_locations VALUES(?,?)').run('legacy','root');
  let job;const gateway={ready:true,maxStreams:4,maxSnapshots:2,snapshotCount:0,close(){job?.stop()},stopOwner(){},stopCamera(){job?.stop()},start(config,options){const stream=new PassThrough();let ended=false;job={authorize:options.authorize,ready:Promise.resolve({first:Buffer.from('fixture'),stream}),stop(){if(ended)return;ended=true;stream.destroy();options.onEnd()},touch(){}};return job}};
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin,cameraKey:key,videoGateway:gateway,now:()=>now});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{gateway.close();await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,who='master',body,method=body?'POST':'GET')=>fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:tokens[who]?.cookie||'','X-CSRF-Token':tokens[who]?.csrf||''},...(body?{body:JSON.stringify(body)}:{})});
  const password='fixture-initial-password-123!',newPassword='fixture-new-password-456!';
  const partner={name:'Parceira',slug:'partner-test',adminName:'Dono',email:'owner@example.test',password};
  for(const who of ['ordinary','op','outsider']){assert.equal((await req('/api/platform/companies',who)).status,403);assert.equal((await req('/api/platform/companies',who,partner)).status,403)}
  assert.equal((await fetch(base+'/api/platform/companies')).status,401);
  assert.equal(locationLicense(db,'root','legacy',now).status,'legacy');
  const newRootLocal=await(await req('/api/clients','master',{name:'Novo local da central'})).json();
  assert.equal(locationLicense(db,'root',newRootLocal.id,now).status,'pending');
  const response=await req('/api/platform/companies','master',partner);assert.equal(response.status,201);const company=await response.json();
  const listing=await(await req('/api/platform/companies')).json();assert.equal(listing.companies.length,2);assert.ok(!JSON.stringify(listing).includes('outside'));assert.ok(!JSON.stringify(listing).includes(password));
  const login=async pass=>{const r=await req('/api/login','none',{company:partner.slug,email:partner.email,password:pass});const data=await r.json();assert.equal(r.status,200);tokens.partner={cookie:r.headers.get('set-cookie').split(';')[0],csrf:data.csrf};return data};
  assert.equal((await login(password)).user.passwordChangeRequired,true);assert.equal((await req('/api/state','partner')).status,403);
  assert.equal((await req('/api/password','partner',{current:password,password:newPassword})).status,200);await login(newPassword);
  assert.equal((await req('/api/platform/companies','partner')).status,403);
  const customer=await(await req('/api/customers','partner',{name:'Rede de lojas'})).json();
  const local=await(await req('/api/clients','partner',{name:'Unidade 1',customerId:customer.id})).json();
  const local2=await(await req('/api/clients','partner',{name:'Unidade 2',customerId:customer.id})).json();
  assert.equal((await req('/api/clients','ordinary',{name:'Invasão',customerId:customer.id})).status,404);
  const state=await(await req('/api/state','partner')).json();assert.equal(state.clients.length,2);assert.ok(state.clients.every(l=>l.customerId===customer.id));assert.equal(state.clients[0].license.status,'pending');assert.equal(state.user.platformAdmin,false);
  assert.equal((await req('/api/cameras','partner',{name:'Camera',client:local.id})).status,403);
  const license={module:'patrimonial',enabled:true,plan:'Plano 1 câmera',cameraLimit:1,expiresAt:new Date(now+60000).toISOString(),version:0};
  assert.equal((await req('/api/platform/licenses/'+local.id,'partner',license)).status,403);
  assert.equal((await req('/api/platform/licenses/foreign','master',license)).status,404);
  assert.equal((await req('/api/platform/licenses/'+local.id,'master',{...license,module:'supermarket'})).status,400);
  assert.equal((await req('/api/platform/licenses/'+local.id,'master',license)).status,200);
  const adds=await Promise.all([req('/api/cameras','partner',{name:'A',client:local.id}),req('/api/cameras','partner',{name:'B',client:local.id})]);assert.deepEqual(adds.map(r=>r.status).sort(),[201,409]);
  const camera=await adds.find(r=>r.status===201).json();assert.equal((await req('/api/platform/licenses/'+local.id,'master',license)).status,409);
  assert.equal((await req('/api/cameras/'+camera.id+'/live','master',{})).status,404);
  const config={host:'192.168.1.64',port:554,path:'/fixture',username:'fixture',password:'fixture'};
  db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run(camera.id,company.id,sealConnection(key,{id:camera.id,org_id:company.id},config),1,1,new Date(now).toISOString());
  const live=await req('/api/cameras/'+camera.id+'/live','partner',{});assert.equal(live.status,200);const reader=live.body.getReader();await reader.read();assert.equal(job.authorize(),true);
  assert.equal((await req('/api/platform/licenses/'+local.id,'master',{...license,version:1,enabled:false})).status,200);
  assert.equal((await reader.read()).done,true);assert.equal(job.authorize(),false);
  assert.equal((await req('/api/cameras/'+camera.id+'/preview','partner',{})).status,403);assert.equal((await req('/api/cameras/'+camera.id+'/analyze','partner',{})).status,403);
  assert.equal((await req('/api/platform/licenses/'+local.id,'master',{...license,version:2})).status,200);now+=60000;
  assert.equal((await req('/api/cameras/'+camera.id+'/live','partner',{})).status,403);assert.equal(locationLicense(db,company.id,local.id,now).status,'expired');
  const detector=new AIDetector({db,key,gateway,now:()=>now});assert.throws(()=>detector.eligibility({org_id:company.id,role:'admin'},camera.id),e=>e.status===403);detector.close();
  assert.equal((await req('/api/clients/'+local2.id+'/customer','partner',{customerId:customer.id,previousCustomerId:null})).status,409);
  assert.equal((await req('/api/clients/legacy/customer','ordinary',{customerId:customer.id,previousCustomerId:null})).status,404);
  db.prepare("DELETE FROM platform_admins WHERE user_id='master'").run();assert.equal((await req('/api/platform/companies')).status,403);
  assert.equal(locationLicense(db,'root',newRootLocal.id,now).status,'pending');
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='partner.created'").get().n,1);
});
