import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {once,EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {openDatabase} from '../server/database.mjs';
import {AIDetector,detectPerson} from '../server/ai-detector.mjs';
import {sealConnection} from '../server/camera-secrets.mjs';
import {createApp} from '../server/app.mjs';
import {VideoGateway,parseEndpoints} from '../server/video-gateway.mjs';
import {snapshotArgs} from '../server/snapshot.mjs';
import {changeAlertPause,validateRule} from '../server/monitoring.mjs';
const rule={name:'Portão',enabled:true,priority:'Alta',days:[0,1,2,3,4,5,6],start:'00:00',end:'00:00',timezone:'America/Belem',area:{x:10,y:20,width:50,height:60}};
const config={host:'192.168.1.64',port:554,path:'/cam/realmonitor?channel=1&subtype=1',username:'test',password:'fixture-only'};
const testKey='sk-'+randomBytes(32).toString('hex');
test('Pausa valida categorias, preserva outras e interrompe captura quando todas estão pausadas',async()=>{
  const f=fixture(async({targets})=>{assert.deepEqual(targets,['person']);return 'person'});
  try{
    assert.throws(()=>validateRule({...rule,pausedTargets:['vehicle']}));
    assert.throws(()=>validateRule({...rule,pausedTargets:['person','person']}));
    f.db.prepare('UPDATE monitoring_rules SET config=?').run(JSON.stringify({...rule,targets:['vehicle','person']}));
    changeAlertPause(f.db,f.u,'camera','pause:vehicle');
    const result=await f.engine.analyze(f.u,'camera');assert.deepEqual(result.detectedTargets,['person']);
    changeAlertPause(f.db,f.u,'camera','pause:person');f.advance(31000);
    const count=f.captures();await assert.rejects(f.engine.analyze(f.u,'camera'),/pausadas/);assert.equal(f.captures(),count);
    const reopened=new AIDetector({db:f.db,key:f.key,gateway:f.gateway,now:f.now,detect:async()=> 'vehicle'});
    await assert.rejects(reopened.analyze(f.u,'camera'),/pausadas/);
    changeAlertPause(f.db,f.u,'camera','resume:vehicle');f.advance(301000);
    assert.deepEqual((await reopened.analyze(f.u,'camera')).detectedTargets,['vehicle']);reopened.close();
    assert.deepEqual(JSON.parse(f.db.prepare('SELECT config FROM monitoring_rules').get().config).pausedTargets,['person']);
    assert.throws(()=>changeAlertPause(f.db,{...f.u,org_id:'other'},'camera','pause:person'),/não possui/);
  }finally{f.engine.close();f.db.close()}
});
test('Pausa descarta resultado iniciado antes de finalizar atendimento',async()=>{
  let f;f=fixture(async()=>{changeAlertPause(f.db,f.u,'camera','pause:person');return 'person'});
  try{await assert.rejects(f.engine.analyze(f.u,'camera'),/pausadas|mudou/);assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,0)}finally{f.engine.close();f.db.close()}
});
test('Finalização e pausa HTTP são atômicas, auditadas e protegidas por CSRF, versão e empresa',async t=>{
  const f=fixture();const first=await f.engine.analyze(f.u,'camera'),origin='http://127.0.0.1:8087';
  const tokens={};
  for(const [id,org,role,client] of [['admin','org','admin',null],['operator','org','operator',null],['client','org','client','local'],['outsider','other','admin',null]]){
    if(org==='other')f.db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
    if(id!=='admin')f.db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run(id,org,id,id+'@test.com','unused',role,client);
    const token=randomBytes(32).toString('hex');tokens[id]=token;f.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',f.now()+60000);
  }
  const server=await createApp({db:f.db,origin,now:f.now,cameraKey:f.key,videoGateway:f.gateway});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));f.engine.close();f.db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const request=(user,data,csrf='csrf')=>fetch(base+'/api/events/'+first.eventId,{method:'PATCH',headers:{Origin:origin,Cookie:'invictus_session='+tokens[user],'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});
  const data={status:'Finalizada',note:'Atendido; pausar pessoas para teste',version:1,alertAction:'pause:person'};
  assert.equal((await request('outsider',data)).status,404);
  assert.equal((await request('client',data)).status,403);
  assert.equal((await request('admin',data,'wrong')).status,403);
  assert.equal((await request('admin',{...data,version:99})).status,409);
  assert.equal((await request('admin',{...data,alertAction:'pause:vehicle'})).status,409);
  assert.equal(f.db.prepare('SELECT version FROM events').get().version,1);
  assert.equal((await request('operator',data)).status,200);
  assert.deepEqual(JSON.parse(f.db.prepare('SELECT config FROM monitoring_rules').get().config).pausedTargets,['person']);
  assert.equal(f.db.prepare("SELECT count(*) n FROM audit WHERE action='event.alerts.pause:person'").get().n,1);
  const state=await (await fetch(base+'/api/state',{headers:{Cookie:'invictus_session='+tokens.admin}})).json();
  assert.deepEqual(state.events.find(e=>e.id===first.eventId).pausedTargets,['person']);
  assert.equal((await request('operator',{...data,version:2,alertAction:'resume:person'})).status,200);
  assert.deepEqual(JSON.parse(f.db.prepare('SELECT config FROM monitoring_rules').get().config).pausedTargets,[]);
});
function fixture(detect=async()=> 'person'){
  const db=openDatabase(':memory:'),key=randomBytes(32);let time=Date.parse('2026-11-02T12:00:00Z'),captures=0;
  db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('org','org','org','org');
  db.prepare('INSERT INTO clients VALUES(?,?,?)').run('local','org','Casa');
  const u={id:'admin',org_id:'org',role:'admin'};
  db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run(u.id,u.org_id,'Admin','a@test.com','unused','admin');
  const camera={id:'camera',org_id:'org'};
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(camera.id,'org','local','Câmera',new Date(time).toISOString());
  db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run('camera','org',sealConnection(key,camera,config),1,1,new Date(time).toISOString());
  db.prepare('INSERT INTO monitoring_locations VALUES(?,?,?,?)').run('local','org',1,1);
  db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?)').run('camera','org',JSON.stringify(rule),1);
  const gateway={ready:true,close(){},snapshot:async(c,o)=>{captures++;assert.deepEqual(o.area,rule.area);return Buffer.from([255,216,255,217])}};
  const engine=new AIDetector({db,key,gateway,now:()=>time,detect});engine.save(u,{apiKey:testKey,enabled:true,version:0});
  return {db,key,u,gateway,engine,advance:ms=>time+=ms,now:()=>time,captures:()=>captures};
}
test('IA protege chave, cria ocorrência, suprime repetição e respeita local, regra, horário e orçamento',async()=>{
  const f=fixture();try{
    assert.ok(!JSON.stringify(f.engine.settings('org')).includes(testKey));assert.ok(!f.db.prepare('SELECT secret FROM ai_settings').get().secret.includes(testKey));
    const first=await f.engine.analyze(f.u,'camera');assert.ok(first.eventId);
    assert.deepEqual(Buffer.from(f.db.prepare('SELECT image FROM event_evidence WHERE event_id=?').get(first.eventId).image),Buffer.from([255,216,255,217]));
    assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,1);
    await assert.rejects(f.engine.analyze(f.u,'camera'),/10 segundos/);
    f.advance(31000);assert.equal((await f.engine.analyze(f.u,'camera')).duplicateSuppressed,true);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_evidence').get().n,1);
    f.advance(300000);assert.ok((await f.engine.analyze(f.u,'camera')).eventId);
    f.db.prepare('UPDATE monitoring_locations SET enabled=0').run();await assert.rejects(f.engine.analyze(f.u,'camera'),/Habilite/);
    f.db.prepare('UPDATE monitoring_locations SET enabled=1').run();f.advance(31000);
    f.db.prepare('UPDATE monitoring_rules SET config=?').run(JSON.stringify({...rule,days:[0]}));await assert.rejects(f.engine.analyze(f.u,'camera'),/horário/);
    f.db.prepare('UPDATE monitoring_rules SET config=?').run(JSON.stringify(rule));
    f.db.prepare('UPDATE ai_usage SET count=100').run();await assert.rejects(f.engine.analyze(f.u,'camera'),/Limite diário/);
    assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_evidence').get().n,2);
  }finally{f.engine.close();f.db.close()}
});
test('IA descarta resultados após mudança de regra e não cria ocorrência para ausência ou incerteza',async()=>{
  let f;f=fixture(async()=>{f.db.prepare('UPDATE monitoring_rules SET version=version+1').run();return 'person'});
  try{
    await assert.rejects(f.engine.analyze(f.u,'camera'),/configuração mudou/);assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,0);
    for(const value of ['absent','uncertain']){f.engine.detect=async()=>value;f.advance(31000);assert.equal((await f.engine.analyze(f.u,'camera')).eventId,null)}
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_evidence').get().n,0);
    f.advance(31000);await assert.rejects(f.engine.analyze(f.u,'camera',{authorize:()=>false}),/cancelada/);
    assert.equal(f.engine.busy.size,0);
  }finally{f.engine.close();f.db.close()}
});

test('Veículos e animais usam o alvo da regra e geram título e imagem correspondentes',async()=>{
  const f=fixture(async({target})=>target);
  try{
    for(const [target,title] of [['vehicle','Veículo detectado'],['animal','Animal detectado']]){
      f.db.prepare('UPDATE monitoring_rules SET config=?,version=version+1').run(JSON.stringify({...rule,target}));
      const result=await f.engine.analyze(f.u,'camera');assert.equal(result.outcome,target);assert.equal(result.target,target);
      const event=f.db.prepare('SELECT title FROM events WHERE id=?').get(result.eventId);assert.ok(event.title.startsWith(title));
      assert.ok(f.db.prepare('SELECT image FROM event_evidence WHERE event_id=?').get(result.eventId));f.advance(301000);
    }
    f.engine.detect=async()=> 'person';
    await assert.rejects(f.engine.analyze(f.u,'camera'),/Resultado inválido/);
    assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,2);
  }finally{f.engine.close();f.db.close()}
});

test('Contrato da API restringe respostas ao alvo solicitado',async()=>{
  for(const target of ['vehicle','animal']){
    const fetchImpl=async(url,options)=>{const body=JSON.parse(options.body);assert.deepEqual(body.text.format.schema.properties.outcome.enum,[target,'absent','uncertain']);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({outcome:target})}]}]}))};
    assert.equal(await detectPerson({target,key:testKey,image:Buffer.from('fixture'),fetchImpl}),target);
  }
  await assert.rejects(detectPerson({target:'face',key:testKey,image:Buffer.alloc(0)}),/Tipo de detecção/);
});
test('Categorias simultâneas geram uma ocorrência, uma foto e uma consulta por captura',async()=>{
  let calls=0;
  const f=fixture(async({targets})=>{calls++;assert.deepEqual(targets,['person','vehicle','animal']);return {person:'person',vehicle:'vehicle',animal:'uncertain'}});
  try{
    f.db.prepare('UPDATE monitoring_rules SET config=?').run(JSON.stringify({...rule,targets:['person','vehicle','animal']}));
    const result=await f.engine.analyze(f.u,'camera');assert.deepEqual(result.detectedTargets,['person','vehicle']);assert.deepEqual(result.uncertainTargets,['animal']);
    assert.equal(calls,1);assert.equal(f.db.prepare('SELECT count FROM ai_usage').get().count,1);
    assert.equal(f.db.prepare('SELECT count(*) n FROM event_evidence').get().n,1);
    const title=f.db.prepare('SELECT title FROM events').get().title;assert.match(title,/Pessoa detectada/);assert.match(title,/Veículo detectado/);assert.doesNotMatch(title,/Animal detectado/);
    f.advance(31000);const duplicate=await f.engine.analyze(f.u,'camera');assert.equal(duplicate.duplicateSuppressed,true);assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,1);
    f.advance(31000);f.engine.detect=async()=>({person:'absent',vehicle:'absent',animal:'uncertain'});assert.equal((await f.engine.analyze(f.u,'camera')).eventId,null);
    f.advance(31000);f.engine.detect=async()=>({person:'person',vehicle:'vehicle'});await assert.rejects(f.engine.analyze(f.u,'camera'),/inválido/);
  }finally{f.engine.close();f.db.close()}
});
test('API múltipla exige resposta de cada categoria e envia só uma imagem',async()=>{
  const targets=['person','animal'];let calls=0;
  const fetchImpl=async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.deepEqual(body.text.format.schema.required,targets);assert.equal(body.input[0].content.filter(x=>x.type==='input_image').length,1);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({person:'absent',animal:'animal'})}]}]}))};
  assert.deepEqual(await detectPerson({targets,key:testKey,image:Buffer.from('fixture'),fetchImpl}),{person:'absent',animal:'animal'});assert.equal(calls,1);
  await assert.rejects(detectPerson({targets,key:testKey,image:Buffer.from('fixture'),fetchImpl:async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"person":"person","animal":"animal","vehicle":"vehicle"}'}]}]}))}),/inconclusivo/);
});
test('Contrato OpenAI usa imagem recortada, JSON estrito, sem armazenamento e sem vazamento de erros',async()=>{
  const result=await detectPerson({key:testKey,image:Buffer.from('jpeg-fixture'),fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.redirect,'error');
    const data=JSON.parse(options.body);assert.equal(data.store,false);assert.equal(data.text.format.strict,true);assert.equal(data.input[0].content[1].type,'input_image');
    return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"outcome":"person"}'}]}]}));
  }});assert.equal(result,'person');
  for(const status of [401,429,500])await assert.rejects(detectPerson({key:testKey,image:Buffer.alloc(0),fetchImpl:async()=>new Response(testKey,{status})}),e=>!e.message.includes(testKey));
  await assert.rejects(detectPerson({key:testKey,image:Buffer.alloc(0),fetchImpl:async()=>new Response(JSON.stringify({status:'incomplete',output:[]}))}),/incompleta/);
});
test('Captura respeita limite próprio do gateway, valida JPEG e encerra processo no cancelamento',async()=>{
  const children=[];const gateway=new VideoGateway({executable:'fake',checkExecutable:false,maxStreams:1,maxSnapshots:1,endpoints:parseEndpoints('[{"clientId":"local","address":"192.168.1.64:554"}]'),spawnProcess:(exe,args,options)=>{
    assert.equal(options.shell,false);const c=new EventEmitter();c.stdout=new PassThrough();c.kill=()=>{setImmediate(()=>c.emit('close',1));return true};children.push(c);return c;
  }});
  const opts={owner:'admin',cameraId:'camera',clientId:'local',area:rule.area};
  const args=snapshotArgs(config,rule.area);assert.match(args[args.indexOf('-vf')+1],/crop=iw\*0.5:ih\*0.6:iw\*0.1:ih\*0.2/);
  const pending=gateway.snapshot(config,opts);assert.throws(()=>gateway.snapshot(config,opts),/Limite/);
  children[0].stdout.write(Buffer.from([255,216,255,217]));children[0].emit('close',0);assert.equal((await pending).length,4);assert.equal(gateway.active.size,0);
  const controller=new AbortController();const aborting=gateway.snapshot(config,{...opts,signal:controller.signal});const rejection=assert.rejects(aborting,/cancelada/);controller.abort();await rejection;await new Promise(r=>setImmediate(r));assert.equal(gateway.active.size,0);gateway.close();
});
test('Rotas IA exigem administrador para chave, CSRF e câmera autorizada sem devolver segredo',async t=>{
  const f=fixture();const origin='http://127.0.0.1:8087';
  const token=randomBytes(32).toString('hex');f.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),'admin','csrf',f.now()+60000);
  const server=await createApp({db:f.db,origin,now:f.now,cameraKey:f.key,videoGateway:f.gateway,aiDetect:async()=> 'person'});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));f.db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const request=(path,body,csrf='csrf')=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:'invictus_session='+token,'Content-Type':'application/json','X-CSRF-Token':csrf},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await request('/api/cameras/camera/analyze',{},'wrong')).status,403);
  assert.equal((await request('/api/cameras/unknown/analyze',{})).status,404);
  const response=await request('/api/cameras/camera/analyze',{});assert.equal(response.status,200);const {eventId}=await response.json();assert.ok(eventId);
  const imagePath='/api/events/'+eventId+'/image';
  assert.equal((await fetch(base+imagePath)).status,401);
  const photo=await request(imagePath);assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/jpeg');assert.match(photo.headers.get('cache-control'),/no-store/);
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()),Buffer.from([255,216,255,217]));
  assert.equal((await (await request('/api/state')).json()).events[0].hasEvidence,1);
  f.db.prepare('INSERT INTO clients VALUES(?,?,?)').run('other-local','org','Outro local');
  f.db.prepare("UPDATE users SET role='client',client_id='other-local' WHERE id='admin'").run();assert.equal((await request(imagePath)).status,404);
  f.db.prepare("UPDATE users SET client_id='local' WHERE id='admin'").run();assert.equal((await request(imagePath)).status,200);
  f.db.prepare("UPDATE users SET role='admin',client_id=NULL WHERE id='admin'").run();
  assert.equal((await request('/api/events/absent/image')).status,404);
  const metadata=await (await request('/api/monitoring')).text();assert.ok(!metadata.includes(testKey));assert.ok(!metadata.includes('secret'));
  f.db.prepare("UPDATE users SET role='operator' WHERE id='admin'").run();assert.equal((await request('/api/ai/settings',{enabled:false,version:1})).status,403);
  f.db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('other-org','other-org','Other','Other');
  f.db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run('other-admin','other-org','Other','other@test.com','unused','admin');
  f.db.prepare("UPDATE sessions SET user_id='other-admin'").run();assert.equal((await request(imagePath)).status,404);
});
