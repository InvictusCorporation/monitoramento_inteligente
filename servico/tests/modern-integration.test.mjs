import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm,writeFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {openDatabase,createOrganization} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';

test('SPA operacional no servidor real: segurança, atendimento e persistência',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'invictus-modern-')),file=join(dir,'fixture.sqlite');
 let db=openDatabase(file),time=Date.now();
 const password=randomBytes(24).toString('hex');
 const a=await createOrganization(db,{name:'Fixture A',slug:'fixture-a',adminName:'Admin',email:'a@example.test',password});
 const b=await createOrganization(db,{name:'Fixture B',slug:'fixture-b',adminName:'Outro',email:'b@example.test',password});
 for(const [id,org] of [['a',a.orgId],['b',b.orgId],['a2',a.orgId]]){db.prepare('INSERT INTO clients VALUES(?,?,?)').run('local-'+id,org,id);db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('cam-'+id,org,'local-'+id,id,new Date().toISOString());db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run('event-'+id,org,'cam-'+id,'Pessoa','Alta','Portão',new Date().toISOString())}
 const origin='http://127.0.0.1:8087',server=await createApp({db,origin,now:()=>time,modernUiRoot:new URL('../dist/interface/',import.meta.url)});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await server.stopMonitoring();server.closeAllConnections();await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true})});
 const req=(path,method='GET',body,auth={},extra={})=>fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth.cookie?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
 const login=async(company,email)=>{const r=await req('/api/login','POST',{company,email,password});assert.equal(r.status,200);const data=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:data.csrf}};
 const auth=await login('fixture-a','a@example.test'),other=await login('fixture-b','b@example.test');
 await t.test('assets externes, CSP estrita e nenhuma API desconhecida vira HTML',async()=>{const r=await req('/');const html=await r.text();assert.match(html,/INVICTUS/);assert.doesNotMatch(html,/<script(?![^>]*src=)[^>]*>[^<]+/);assert.doesNotMatch(r.headers.get('content-security-policy'),/unsafe-inline|unsafe-eval/);for(const path of ['/api/missing','/interface/assets/../../data/fixture.sqlite','/interface/%2e%2e/server/app.mjs','/interface/assets/nope.js','/server/app.mjs','/.env','/data/camera.key']){const res=await req(path,'GET',null,auth);assert.equal(res.status,404,path);assert.match(res.headers.get('content-type'),/application\/json/)}assert.equal((await req('/legado/')).status,200);assert.equal((await req('/api/state')).status,401)});
 await t.test('login, CSRF, state e isolamento por empresa/local',async()=>{assert.equal((await req('/api/events/event-a/claim','POST',{version:1},auth,{'X-CSRF-Token':''})).status,403);assert.equal((await req('/api/events/event-a/claim','POST',{version:1},other)).status,404);assert.equal((await req('/api/events/event-a/claim','POST',{version:1},auth,{Origin:'https://external.test'})).status,403);const state=await(await req('/api/state','GET',null,auth)).json();assert.equal(state.cameras.length,2);assert.ok(state.cameras.every(c=>typeof c.id==='string'));await req('/api/users','POST',{name:'Cliente',email:'client@example.test',password,role:'client',clientId:'local-a'},auth);const own=await login('fixture-a','client@example.test');const scoped=await(await req('/api/state','GET',null,own)).json();assert.deepEqual(scoped.cameras.map(c=>c.id),['cam-a']);assert.equal((await req('/api/events/event-a2','PATCH',{version:1,status:'Finalizada',note:'Teste'},own)).status,404)});
 const rule={name:'Portão',enabled:true,priority:'Alta',days:[1,3],start:'22:00',end:'06:00',timezone:'America/Belem',area:{x:10,y:10,width:80,height:80},targets:['person','vehicle'],pausedTargets:[],version:0};
 await t.test('leitura de JSON antigo não migra silenciosamente; observação persiste sem finalizar ou pausar',async()=>{
  const {targets,pausedTargets,version,...fields}=rule;
  for(const config of [{...fields,target:'person'},{...fields,targets}]){
   db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?) ON CONFLICT(camera_id) DO UPDATE SET config=excluded.config').run('cam-a2',a.orgId,JSON.stringify(config),1);
   const before=db.prepare("SELECT config FROM monitoring_rules WHERE camera_id='cam-a2'").get().config;
   const monitor=await(await req('/api/monitoring','GET',null,auth)).json();assert.equal(monitor.rules.find(r=>r.camera==='cam-a2').version,1);
   assert.equal(db.prepare("SELECT config FROM monitoring_rules WHERE camera_id='cam-a2'").get().config,before);
  }
  assert.equal((await req('/api/events/event-a2/claim','POST',{version:1},auth)).status,200);
  assert.equal((await req('/api/events/event-a2','PATCH',{version:2,status:'Em análise',note:' Observação preservada '},auth)).status,200);
  const saved=db.prepare("SELECT status,note,version FROM events WHERE id='event-a2'").get();assert.equal(saved.status,'Em análise');assert.equal(saved.note,'Observação preservada');assert.equal(saved.version,3);
  assert.equal((await req('/api/events/event-a2','PATCH',{version:2,status:'Em análise',note:'Antiga'},auth)).status,409);
  const config=JSON.parse(db.prepare("SELECT config FROM monitoring_rules WHERE camera_id='cam-a2'").get().config);assert.equal(config.pausedTargets,undefined);
 });
 await t.test('claim, nota obrigatória, conflito e finalização sem pausa implícita',async()=>{assert.equal((await req('/api/monitoring/cameras/cam-a','POST',rule,auth)).status,200);assert.equal((await req('/api/events/event-a/claim','POST',{version:1},auth)).status,200);assert.equal((await req('/api/events/event-a','PATCH',{version:2,status:'Finalizada',note:''},auth)).status,400);assert.equal((await req('/api/events/event-a','PATCH',{version:2,status:'Finalizada',note:'Verificado'},auth)).status,200);assert.equal((await req('/api/events/event-a','PATCH',{version:2,status:'Finalizada',note:'Antiga'},auth)).status,409);const monitor=await(await req('/api/monitoring','GET',null,auth)).json();assert.deepEqual(monitor.rules[0].pausedTargets,[]);assert.equal((await(await req('/api/events/event-a/history','GET',null,auth)).json()).entries.length,2)});
 await t.test('pausa/reativação atômica preserva regra e persiste no SQLite',async()=>{assert.equal((await req('/api/events/event-a','PATCH',{version:3,status:'Em análise',note:'Verificado',alertAction:'pause:person'},auth)).status,400);assert.equal((await req('/api/events/event-a','PATCH',{version:3,status:'Finalizada',note:'Pausa justificada',alertAction:'pause:person'},auth)).status,200);let monitor=await(await req('/api/monitoring','GET',null,auth)).json();assert.deepEqual(monitor.rules[0].pausedTargets,['person']);const persisted=openDatabase(file);try{assert.deepEqual(JSON.parse(persisted.prepare("SELECT config FROM monitoring_rules WHERE camera_id='cam-a'").get().config).pausedTargets,['person'])}finally{persisted.close()}assert.equal((await req('/api/events/event-a','PATCH',{version:4,status:'Finalizada',note:'Retomada',alertAction:'resume:person'},auth)).status,200);monitor=await(await req('/api/monitoring','GET',null,auth)).json();assert.deepEqual(monitor.rules[0].days,rule.days);assert.deepEqual(monitor.rules[0].area,rule.area);assert.deepEqual(monitor.rules[0].pausedTargets,[]);const reopened=openDatabase(file);try{assert.equal(reopened.prepare("SELECT note FROM events WHERE id='event-a'").get().note,'Retomada');assert.deepEqual(JSON.parse(reopened.prepare("SELECT config FROM monitoring_rules WHERE camera_id='cam-a'").get().config).pausedTargets,[])}finally{reopened.close()}});
 await t.test('sessão expirada é 401, nunca dados privados ou HTML',async()=>{time+=8*3600000+1;assert.equal((await req('/api/state','GET',null,auth)).status,401);assert.equal((await req('/api/session','GET',null,auth)).status,401)});
});

test('static build recusa symlinks',async()=>{const dir=await mkdtemp(join(tmpdir(),'invictus-symlink-')),db=openDatabase(':memory:');try{await mkdir(join(dir,'assets'));await writeFile(join(dir,'index.html'),'fixture');await symlink(join(dir,'index.html'),join(dir,'assets','escape.js'));await assert.rejects(createApp({db,origin:'http://127.0.0.1:8087',modernUiRoot:dir}),/Symlink/)}finally{db.close();await rm(dir,{recursive:true,force:true})}});