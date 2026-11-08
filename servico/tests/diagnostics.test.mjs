import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cameraHealth,diagnostics} from '../server/diagnostics.mjs';
import {openDatabase} from '../server/database.mjs';
const now=Date.parse('2026-11-02T12:00:00Z');
const rule={enabled:true,name:'Teste',priority:'Alta',days:[0,1,2,3,4,5,6],start:'00:00',end:'00:00',timezone:'America/Belem',area:{x:0,y:0,width:100,height:100}};
const row={connection_version:1,connection_enabled:1,location_enabled:1,rule_config:JSON.stringify(rule),checked_at:new Date(now-30000).toISOString()};
const options={service:{enabled:true,state:'scheduled',interval:60},ai:{configured:true,enabled:true,available:true,used:0,dailyLimit:100},videoReady:true,now};
test('Diagnóstico distingue pausas, falhas, atraso e atividade sem afirmar câmera online',()=>{
  assert.equal(cameraHealth(row,options).code,'scheduled');
  for(const [patch,code] of [[{connection_version:null},'unconfigured'],[{connection_enabled:0},'camera_disabled'],[{rule_config:null},'no_rule'],[{rule_config:'invalid'},'invalid_rule'],[{location_enabled:0},'location_disabled'],[{rule_config:JSON.stringify({...rule,enabled:false})},'rule_disabled'],[{rule_config:JSON.stringify({...rule,days:[0]})},'outside_schedule'],[{job_status:'error'},'last_error'],[{job_status:'interrupted'},'interrupted'],[{checked_at:null},'awaiting_first'],[{checked_at:new Date(now-300000).toISOString()},'delayed']])assert.equal(cameraHealth({...row,...patch},options).code,code);
  assert.equal(cameraHealth(row,{...options,busy:true}).code,'analyzing');
  assert.equal(cameraHealth(row,{...options,videoReady:false}).code,'video_unavailable');
  assert.equal(cameraHealth(row,{...options,service:{...options.service,enabled:false}}).code,'service_disabled');
  assert.equal(cameraHealth(row,{...options,service:{...options.service,state:'owner_unavailable'}}).code,'owner_unavailable');
  assert.equal(cameraHealth(row,{...options,ai:{...options.ai,enabled:false}}).code,'ai_unavailable');
  assert.equal(cameraHealth(row,{...options,ai:{...options.ai,used:100}}).code,'daily_limit');
});
test('Diagnóstico só lê câmeras autorizadas e não retorna credenciais, caminho RTSP ou foto',()=>{
  const db=openDatabase(':memory:');
  try{
    for(const org of ['a','b'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
    for(const [local,org] of [['l1','a'],['l2','a'],['l3','b']]){db.prepare('INSERT INTO clients VALUES(?,?,?)').run(local,org,local);db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c'+local,org,local,'Câmera '+local,new Date(now).toISOString());db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run('c'+local,org,'secret-fixture-never-return',1,1,new Date(now).toISOString())}
    const deps={worker:{status:()=>options.service},detector:{settings:()=>options.ai,busy:new Map()},gateway:{ready:true},now};
    for(const [id,org,camera,bytes] of [['e1','a','cl1',5],['e2','a','cl2',9],['e3','b','cl3',15]]){
      db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run(id,org,camera,'Pessoa','Alta','Regra','2026-11-02T12:00:00Z');
      db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run(id,org,'2026-11-02T12:00:00Z',Buffer.alloc(bytes));
    }
    db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run('legacy','a','cl1','Teste','Alta','Regra','2026-11-01');
    const admin=diagnostics(db,{org_id:'a',role:'admin'},deps);assert.equal(admin.cameras.length,2);
    const client=diagnostics(db,{org_id:'a',role:'client',client_id:'l1'},deps);assert.equal(client.cameras.length,1);assert.equal(client.cameras[0].id,'cl1');
    const other=diagnostics(db,{org_id:'b',role:'admin'},deps);assert.equal(other.cameras.length,1);assert.equal(other.cameras[0].id,'cl3');
    assert.equal(admin.cameras.reduce((n,c)=>n+c.evidence.bytes,0),14);
    assert.deepEqual(client.cameras[0].evidence,{events:2,photos:1,bytes:5,oldest:'2026-11-02T12:00:00Z',newest:'2026-11-02T12:00:00Z'});
    assert.equal(other.cameras[0].evidence.bytes,15);
    db.prepare('DELETE FROM event_evidence').run();
    assert.deepEqual(diagnostics(db,{org_id:'a',role:'client',client_id:'l1'},deps).cameras[0].evidence,{events:2,photos:0,bytes:0,oldest:null,newest:null});
    assert.ok(!JSON.stringify(admin).includes('secret-fixture'));assert.equal(db.prepare('SELECT count(*) n FROM ai_usage').get().n,0);
  }finally{db.close()}
});
