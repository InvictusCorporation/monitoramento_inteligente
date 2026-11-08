import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {deadlineFor} from '../server/event-alerts.mjs';
test('Prazo muda com atribuição, não com versão ou observação, e exclui finalizadas',()=>{
  const base=Date.parse('2026-11-02T12:00:00Z'),policy={enabled:true,waitingMinutes:5,handlingMinutes:15};
  const event={createdAt:new Date(base).toISOString(),status:'Pendente'};
  assert.equal(deadlineFor(event,policy,base+299999),null);assert.equal(deadlineFor(event,policy,base+300000).deadlinePhase,'waiting');
  assert.equal(deadlineFor(event,{...policy,enabled:false},base+9999999),null);
  const assigned={...event,claimedBy:'a',claimedAt:new Date(base+300000).toISOString(),status:'Em análise'};
  assert.equal(deadlineFor(assigned,policy,base+1199999),null);const due=deadlineFor(assigned,policy,base+1200000);assert.equal(due.deadlinePhase,'handling');
  assert.deepEqual(deadlineFor({...assigned,version:99,note:'Alterada'},policy,base+1200000),due);
  assert.equal(deadlineFor({...assigned,claimedAt:new Date(base+1200000).toISOString()},policy,base+1200000),null);
  assert.equal(deadlineFor({...assigned,status:'Finalizada'},policy,base+9999999),null);
});
test('Prazos isolados por empresa, configuração administrativa, aviso ao responsável e administrador',async t=>{
  const db=openDatabase(':memory:');let now=Date.parse('2026-11-02T12:00:00Z');const created=new Date(now).toISOString();
  for(const org of ['a','b']){
    db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
    db.prepare('INSERT INTO clients VALUES(?,?,?)').run('l'+org,org,org);
    db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c'+org,org,'l'+org,org,created);
    db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run('e'+org,org,'c'+org,'Pessoa','Alta','Regra',created);
  }
  const tokens={};let n=0;
  for(const [id,org,role,client] of [['admin','a','admin',null],['op','a','operator',null],['op2','a','operator',null],['client','a','client','la'],['other','b','admin',null]]){
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run(id,org,id,id+'@example.test','unused',role,client);
    const token=String(++n).padStart(64,'0');tokens[id]=token;db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',now+86400000);
  }
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin,now:()=>now});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const req=(path,user='admin',body,csrf='csrf')=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:'invictus_session='+tokens[user],'X-CSRF-Token':csrf,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const alerts=async(user='admin')=>(await req('/api/alerts',user)).json();
  const policy={enabled:true,waitingMinutes:1,handlingMinutes:2,version:0};
  assert.equal((await fetch(base+'/api/alert-policy')).status,401);
  assert.deepEqual(await(await req('/api/alert-policy')).json(),{enabled:false,waitingMinutes:5,handlingMinutes:15,version:0});
  for(const role of ['op','client']){assert.equal((await req('/api/alert-policy',role)).status,403);assert.equal((await req('/api/alert-policy',role,policy)).status,403)}
  assert.equal((await req('/api/alert-policy','admin',policy,'wrong')).status,403);
  for(const value of [{waitingMinutes:0},{handlingMinutes:1441},{waitingMinutes:1.5},{enabled:'true'},{version:-1}])assert.equal((await req('/api/alert-policy','admin',{...policy,...value})).status,400);
  now+=60000;assert.equal((await alerts()).overdueCount,0);
  assert.equal((await req('/api/alert-policy','admin',policy)).status,200);
  assert.equal((await req('/api/alert-policy','admin',policy)).status,409);
  assert.equal((await alerts()).overdueCount,1);assert.equal((await alerts('op2')).overdueCount,1);assert.equal((await alerts('other')).overdueCount,0);
  assert.equal((await req('/api/events/ea/claim','op',{version:1})).status,200);
  assert.equal((await alerts()).count,0);assert.equal((await alerts('op')).count,0);
  now+=120000;const overdue=await alerts('op');assert.equal(overdue.overdueCount,1);assert.equal(overdue.events[0].deadlinePhase,'handling');
  assert.equal((await alerts()).overdueCount,1);assert.equal((await alerts('op2')).count,0);
  db.prepare("UPDATE events SET note='Observação',version=version+1 WHERE id='ea'").run();
  assert.equal((await alerts('op')).events[0].alertKey,overdue.events[0].alertKey);
  assert.equal((await req('/api/events/ea/transfer','op',{version:3,to:'op2',reason:'Troca de turno'})).status,200);
  const assigned=await alerts('op2');assert.equal(assigned.overdueCount,0);assert.equal(assigned.events[0].transferredToMe,true);assert.equal((await alerts('op')).count,0);
  now+=120000;const late=await alerts('op2');assert.equal(late.events[0].transferredToMe,true);assert.equal(late.events[0].overdue,true);
  const insert=db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)');
  for(let i=0;i<30;i++)insert.run('queue-'+i,'a','ca','Nova','Alta','Regra',new Date(now).toISOString());
  const crowded=await alerts();assert.equal(crowded.count,31);assert.equal(crowded.events.length,20);assert.equal(crowded.events[0].id,'ea');
  db.prepare("DELETE FROM events WHERE id LIKE 'queue-%'").run();
  db.prepare("UPDATE events SET status='Finalizada',version=5 WHERE id='ea'").run();assert.equal((await alerts()).count,0);
  assert.equal((await req('/api/alert-policy','admin',{...policy,enabled:false,version:1})).status,200);
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='alerts.policy.updated'").get().n,2);
  assert.equal((await(await req('/api/alert-policy','other')).json()).enabled,false);
});
