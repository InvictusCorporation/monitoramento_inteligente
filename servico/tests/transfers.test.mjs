import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
test('Transferência aplica escopo, responsável, destinatário, conflito, auditoria e alerta individual',async t=>{
  const db=openDatabase(':memory:');
  for(const org of ['a','b']){
    db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
    db.prepare('INSERT INTO clients VALUES(?,?,?)').run('l'+org,org,org);
    db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c'+org,org,'l'+org,org,new Date().toISOString());
    db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at,note) VALUES(?,?,?,?,?,?,?,?)').run('e'+org,org,'c'+org,'Pessoa','Alta','Regra',new Date().toISOString(),'Nota original');
  }
  const tokens={};let n=0;
  for(const [id,org,role,client] of [['admin','a','admin',null],['op1','a','operator',null],['op2','a','operator',null],['disabled','a','operator',null],['password','a','operator',null],['client','a','client','la'],['other','b','operator',null]]){
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run(id,org,id,id+'@example.test','unused',role,client);
    tokens[id]=String(++n).padStart(64,'0');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(tokens[id]).digest('hex'),id,'csrf',Date.now()+60000);
  }
  db.prepare("UPDATE users SET active=0 WHERE id='disabled'").run();db.prepare("UPDATE users SET must_change_password=1 WHERE id='password'").run();
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,user='op1',body,csrf='csrf')=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:'invictus_session='+tokens[user],'X-CSRF-Token':csrf,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const move=(user,to,version=2,reason='Troca de turno',csrf='csrf')=>req('/api/events/ea/transfer',user,{to,version,reason},csrf);
  assert.equal((await fetch(base+'/api/operators')).status,401);
  assert.equal((await req('/api/operators','client')).status,403);
  const list=await(await req('/api/operators')).json();assert.deepEqual(list.operators.map(u=>u.id),['admin','op1','op2']);assert.ok(!JSON.stringify(list).includes('email'));
  assert.equal((await move('op1','op2',1)).status,409); // not claimed
  assert.equal((await req('/api/events/ea/claim','op1',{version:1})).status,200);
  assert.equal((await move('other','op2')).status,404);assert.equal((await move('client','op2')).status,403);
  assert.equal((await move('op2','admin')).status,403);assert.equal((await move('op1','op2',2,'ok','wrong')).status,403);
  for(const to of ['op1','client','other','disabled','password','missing'])assert.equal((await move('op1',to)).status,400);
  for(const reason of ['', '  ', 'x'.repeat(1001)])assert.equal((await move('op1','op2',2,reason)).status,400);
  assert.equal((await move('op1','op2',2.5)).status,400);assert.equal((await move('op1','op2',1)).status,409);
  db.exec("CREATE TRIGGER reject_transfer BEFORE INSERT ON event_transfers BEGIN SELECT RAISE(ABORT,'fixture'); END");
  assert.equal((await move('op1','op2')).status,500);
  assert.equal(db.prepare("SELECT actor_id FROM event_claims WHERE event_id='ea'").get().actor_id,'op1');
  assert.equal(db.prepare("SELECT version FROM events WHERE id='ea'").get().version,2);
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='event.transferred'").get().n,0);
  db.exec('DROP TRIGGER reject_transfer');
  const results=await Promise.all([move('op1','op2',2,'<script>motivo</script>'),move('admin','admin',2,'Redistribuição')]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  let event=db.prepare('SELECT * FROM events WHERE id=?').get('ea');assert.equal(event.version,3);assert.equal(event.note,'Nota original');assert.equal(event.status,'Em análise');
  assert.equal(db.prepare('SELECT count(*) n FROM event_transfers').get().n,1);
  const transfer=db.prepare('SELECT * FROM event_transfers').get();const recipient=transfer.to_user_id;
  const alerts=await(await req('/api/alerts',recipient)).json();assert.equal(alerts.count,1);assert.equal(alerts.events[0].transferredToMe,true);assert.equal(alerts.events[0].alertKey,'transfer:'+transfer.audit_id);
  assert.equal((await(await req('/api/alerts','op1')).json()).count,0);
  const hist=await(await req('/api/events/ea/history','op2')).json();assert.equal(hist.entries[0].action,'event.transferred');assert.equal(hist.entries[0].transferredFrom,'op1');assert.equal(hist.entries[0].transferredTo,recipient);assert.equal(hist.entries[0].transferReason,transfer.reason);
  assert.equal((await req('/api/events/ea/history','other')).status,404);
  db.prepare('UPDATE users SET active=0 WHERE id=?').run(recipient);
  // Administrator can recover an assignment whose owner was disabled (use op2 if admin was the recipient).
  if(recipient==='admin')db.prepare("UPDATE users SET active=1 WHERE id='admin'").run();
  assert.equal((await move('admin','op1',3,'Retomada pelo plantão')).status,200);
  assert.equal((await(await req('/api/alerts','op1')).json()).count,1);
  db.prepare("UPDATE events SET status='Finalizada',version=5 WHERE id='ea'").run();
  assert.equal((await move('op1','admin',5)).status,409);assert.equal((await(await req('/api/alerts','op1')).json()).count,0);
  db.prepare("UPDATE users SET name='Nome alterado' WHERE id='op1'").run();
  const history=await(await req('/api/events/ea/history','admin')).json();assert.equal(history.entries[0].transferredTo,'op1');
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='event.transferred'").get().n,2);
});
