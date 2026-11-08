import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {AIDetector} from '../server/ai-detector.mjs';
import {MonitoringWorker} from '../server/monitoring-worker.mjs';
import {sealConnection} from '../server/camera-secrets.mjs';
import {createApp} from '../server/app.mjs';
function fixture(){
  const db=openDatabase(':memory:'),key=randomBytes(32);let time=Date.parse('2026-11-02T12:00:00Z'),calls=0;
  const u={id:'u',org_id:'o',role:'admin'};
  db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('o','o','Org','Org');
  db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run('u','o','Admin','test@example.com','unused','admin');
  db.prepare('INSERT INTO clients VALUES(?,?,?)').run('l','o','Casa');
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c','o','l','Camera',new Date(time).toISOString());
  db.prepare('INSERT INTO monitoring_locations VALUES(?,?,?,?)').run('l','o',1,1);
  const rule={name:'Regra',enabled:true,priority:'Alta',days:[0,1,2,3,4,5,6],start:'00:00',end:'00:00',timezone:'America/Belem',area:{x:0,y:0,width:100,height:100}};
  db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?)').run('c','o',JSON.stringify(rule),1);
  db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run('c','o',sealConnection(key,{id:'c',org_id:'o'},{host:'192.168.1.64',port:554,path:'/channel',username:'test',password:'fixture'}),1,1,new Date(time).toISOString());
  const gateway={ready:true,active:new Set(),maxStreams:4,close(){},stopOwner(){},snapshot:async()=>Buffer.from([255,216,255,217])};
  const now=()=>time,detect=async()=>{calls++;return 'person'};
  const detector=new AIDetector({db,key,gateway,now,detect});detector.save(u,{version:0,enabled:true,apiKey:'sk-'+randomBytes(32).toString('hex')});
  const worker=new MonitoringWorker({db,detector,now});
  const config={enabled:true,interval:60,cooldown:120,dailyLimit:2,version:0};
  return {db,key,gateway,u,rule,detector,worker,now,detect,config,calls:()=>calls,advance:ms=>time+=ms};
}
async function drain(worker){await Promise.all([...worker.running.values()].map(t=>t.promise))}

test('Intervalos de 10 e 15 segundos respeitam agenda, não sobrepõem análise e mantêm quota',async()=>{
  for(const interval of [10,15]){
    const f=fixture();
    try{
      f.worker.save(f.u,{...f.config,interval});f.worker.tick();await drain(f.worker);assert.equal(f.calls(),1);
      f.advance(interval*1000-1);f.worker.tick();assert.equal(f.calls(),1);
      f.advance(1);f.worker.tick();await drain(f.worker);assert.equal(f.calls(),2);
      f.advance(interval*1000);f.worker.tick();assert.equal(f.calls(),2);assert.equal(f.worker.status('o').state,'daily_limit');
      assert.throws(()=>f.worker.save(f.u,{...f.config,interval:9,version:1}),/intervalo/);
    }finally{await f.worker.close();f.db.close()}
  }
});

test('Intervalo curto não abre duas análises da mesma câmera durante processamento lento',async()=>{
  const f=fixture();let release,calls=0;f.detector.detect=()=>{calls++;return new Promise(r=>release=r)};
  try{
    f.worker.save(f.u,{...f.config,interval:10,dailyLimit:10});f.worker.tick();await new Promise(r=>setImmediate(r));
    f.advance(15000);f.worker.tick();assert.equal(calls,1);assert.equal(f.worker.running.size,1);
    release('person');await drain(f.worker);assert.equal(f.worker.running.size,0);
  }finally{await f.worker.close();f.db.close()}
});
test('cadência bem-sucedida conta desde início sem somar processamento ao intervalo',async()=>{
  const f=fixture();let calls=0;
  f.detector.detect=async()=>{calls++;f.advance(8000);return 'person'};
  try{
    const start=f.now();f.worker.save(f.u,{...f.config,interval:30,dailyLimit:10});f.worker.tick();await drain(f.worker);
    assert.equal(f.db.prepare('SELECT next_at FROM monitoring_jobs').get().next_at,start+30000);
    f.advance(21999);f.worker.tick();assert.equal(calls,1);f.advance(1);f.worker.tick();await drain(f.worker);assert.equal(calls,2);
  }finally{await f.worker.close();f.db.close()}
});
test('análise mais longa que intervalo não agenda no passado e erro mantém pausa desde término',async()=>{
  const f=fixture();f.detector.detect=async()=>{f.advance(45000);return 'person'};
  try{
    f.worker.save(f.u,{...f.config,interval:30,dailyLimit:10});f.worker.tick();await drain(f.worker);
    assert.equal(f.db.prepare('SELECT next_at FROM monitoring_jobs').get().next_at,f.now());
    f.detector.detect=async()=>{f.advance(8000);throw Object.assign(Error('indisponível'),{status:502})};
    f.worker.tick();await drain(f.worker);assert.equal(f.db.prepare('SELECT next_at FROM monitoring_jobs').get().next_at,f.now()+300000);
  }finally{await f.worker.close();f.db.close()}
});
test('Serviço sem sessão ou navegador respeita intervalo, limite diário e retomada no próximo dia',async()=>{
  const f=fixture();try{
    f.worker.tick();assert.equal(f.calls(),0);
    f.worker.save(f.u,f.config);f.worker.tick();await drain(f.worker);assert.equal(f.calls(),1);
    f.worker.tick();assert.equal(f.calls(),1);
    f.advance(60000);f.worker.tick();await drain(f.worker);assert.equal(f.calls(),2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,1);
    f.advance(60000);f.worker.tick();assert.equal(f.calls(),2);assert.equal(f.worker.status('o').state,'daily_limit');
    f.advance(86400000);f.worker.tick();await drain(f.worker);assert.equal(f.calls(),3);
    assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM sessions').get().n,0);
  }finally{await f.worker.close();f.db.close()}
});
test('Recriar worker preserva agenda e configuração; horários e administrador inativo suspendem',async()=>{
  const f=fixture();let second;
  try{
    f.worker.save(f.u,{...f.config,dailyLimit:10});f.worker.tick();await drain(f.worker);await f.worker.close();
    second=new MonitoringWorker({db:f.db,detector:f.detector,now:f.now});second.tick();assert.equal(f.calls(),1);
    f.advance(60000);f.db.prepare('UPDATE monitoring_rules SET config=?').run(JSON.stringify({...f.rule,days:[0]}));second.tick();assert.equal(f.calls(),1);
    f.db.prepare('UPDATE monitoring_rules SET config=?').run(JSON.stringify(f.rule));f.db.prepare('UPDATE users SET active=0').run();second.tick();assert.equal(f.calls(),1);assert.equal(second.status('o').state,'owner_unavailable');
    f.db.prepare('UPDATE users SET active=1').run();second.tick();await drain(second);assert.equal(f.calls(),2);
  }finally{await second?.close();await f.worker.close();f.db.close()}
});
test('Desativar cancela resposta em andamento e evita evento; configuração exige versão e admin',async()=>{
  const f=fixture();let release;
  f.detector.detect=()=>new Promise(resolve=>{release=resolve});
  try{
    assert.throws(()=>f.worker.save({...f.u,role:'client'},f.config),/administrador/);
    assert.throws(()=>f.worker.save(f.u,{...f.config,interval:1}),/intervalo/);
    f.worker.save(f.u,f.config);assert.throws(()=>f.worker.save(f.u,f.config),/alterada/);
    f.worker.tick();await new Promise(r=>setImmediate(r));assert.equal(f.worker.running.size,1);
    f.worker.save(f.u,{...f.config,enabled:false,version:1});release('person');await drain(f.worker);
    assert.equal(f.db.prepare('SELECT count(*) n FROM events').get().n,0);
    assert.equal(f.worker.status('o').state,'disabled');
  }finally{await f.worker.close();f.db.close()}
});
test('Falhas na API aguardam cinco minutos e trabalhos não se sobrepõem',async()=>{
  const f=fixture();let calls=0;
  f.detector.detect=async()=>{calls++;throw Object.assign(new Error('API indisponível'),{status:502})};
  try{f.worker.save(f.u,f.config);f.worker.tick();f.worker.tick();await drain(f.worker);assert.equal(calls,1);f.advance(60000);f.worker.tick();assert.equal(calls,1);f.advance(240000);f.worker.tick();await drain(f.worker);assert.equal(calls,2)}finally{await f.worker.close();f.db.close()}
});
test('HTTP permite configuração apenas para admin com CSRF e devolve estado por empresa',async t=>{
  const f=fixture(),origin='http://127.0.0.1:8087',token=randomBytes(32).toString('hex');
  f.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),'u','csrf',f.now()+3600000);
  const server=await createApp({db:f.db,origin,cameraKey:f.key,videoGateway:f.gateway,now:f.now,aiDetect:f.detect});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));await f.worker.close();f.db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const request=(csrf='csrf')=>fetch(base+'/api/monitoring/service',{method:'POST',headers:{Origin:origin,Cookie:'invictus_session='+token,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:JSON.stringify(f.config)});
  assert.equal((await request('invalid')).status,403);assert.equal((await request()).status,200);assert.equal((await request()).status,409);
  f.db.prepare("UPDATE users SET role='operator'").run();assert.equal((await request()).status,403);
  const data=await (await fetch(base+'/api/monitoring',{headers:{Cookie:'invictus_session='+token}})).json();assert.equal(data.service.state,'owner_unavailable');assert.equal(data.service.dailyLimit,2);
});

test('Fila atende canais adicionais sem ultrapassar duas análises simultâneas',async()=>{
  const f=fixture();try{
    for(const id of ['c2','c3']){
      f.db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(id,'o','l',id,new Date(f.now()).toISOString());
      f.db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?)').run(id,'o',JSON.stringify(f.rule),1);
      f.db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run(id,'o',sealConnection(f.key,{id,org_id:'o'},{host:'192.168.1.64',port:554,path:'/channel',username:'test',password:'fixture'}),1,1,new Date(f.now()).toISOString());
    }
    f.worker.save(f.u,{...f.config,dailyLimit:10});f.worker.tick();assert.equal(f.worker.running.size,2);await drain(f.worker);
    f.worker.tick();assert.equal(f.worker.running.size,1);await drain(f.worker);assert.equal(f.calls(),3);
    assert.equal(f.db.prepare('SELECT count(*) n FROM monitoring_jobs').get().n,3);
  }finally{await f.worker.close();f.db.close()}
});
