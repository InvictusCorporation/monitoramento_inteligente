import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,audit} from '../server/database.mjs';
import {RetentionCleanup} from '../server/retention-cleanup.mjs';
import {createApp} from '../server/app.mjs';
import {once} from 'node:events';
import {randomBytes,createHash} from 'node:crypto';
const now=Date.parse('2026-11-02T12:00:00Z');
function fixture(){
  const db=openDatabase(':memory:');
  for(const org of ['a','b']){
    db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run(org,org,org,org+'@test.example','unused','admin');
    db.prepare('INSERT INTO clients VALUES(?,?,?)').run(org,org,org);db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(org,org,org,org,'2026-01-01');
  }
  function add(id,org='a',days=31,status='Finalizada'){
    const at=new Date(now-days*86400000).toISOString();
    db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at,status) VALUES(?,?,?,?,?,?,?,?)').run(id,org,org,'Evento','Alta','Regra',at,status);
    db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run(id,org,at,Buffer.alloc(10));
  }
  return {db,add,actor:{id:'a',org_id:'a'},service:new RetentionCleanup()};
}
test('limpeza preserva abertas/recentes/outra empresa, detecta alterações e registra exclusão uma única vez',()=>{
  const {db,add,actor,service}=fixture();try{
    add('old');add('open','a',60,'Pendente');add('new','a',2);add('boundary','a',30);add('foreign','b');
    const before=service.prepare(db,actor,'a',30,now);assert.equal(before.batchCount,1);assert.equal(before.protectedOpen,1);
    const run=(token=before.token,authorize=()=>actor)=>service.execute(db,{token,confirmation:'EXCLUIR FOTOS',now,authorize,onDelete:(u,id)=>audit(db,u,'event.image.deleted',id)});
    assert.throws(()=>run(before.token,()=>({id:'b',org_id:'b'})),e=>e.status===409);
    db.prepare("UPDATE events SET status='Pendente',version=version+1 WHERE id='old'").run();assert.throws(()=>run(),e=>e.status===409);
    assert.equal(db.prepare('SELECT count(*) n FROM event_evidence').get().n,5);
    db.prepare("UPDATE events SET status='Finalizada',version=version+1 WHERE id='old'").run();
    const fresh=service.prepare(db,actor,'a',30,now);
    assert.throws(()=>service.execute(db,{token:fresh.token,confirmation:'sim',now,authorize:()=>actor}),e=>e.status===400);
    assert.deepEqual(run(fresh.token),{deleted:1,deletedBytes:10});assert.throws(()=>run(fresh.token),e=>e.status===409);
    assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,5);assert.equal(db.prepare('SELECT count(*) n FROM event_evidence').get().n,4);
    assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='event.image.deleted'").get().n,1);
    assert.equal(service.prepare(db,actor,'a',30,now).token,null);
  }finally{db.close()}
});
test('prévia expira, autorização é revalidada e falha de auditoria reverte todas as exclusões',()=>{
  const {db,add,actor,service}=fixture();try{
    add('first');add('second');const prepare=()=>service.prepare(db,actor,null,30,now);
    assert.throws(()=>service.execute(db,{token:prepare().token,confirmation:'EXCLUIR FOTOS',now:now+300000,authorize:()=>actor}),e=>e.status===409);
    assert.throws(()=>service.execute(db,{token:prepare().token,confirmation:'EXCLUIR FOTOS',now,authorize(){throw Error('revoked')}}),/revoked/);
    let calls=0;assert.throws(()=>service.execute(db,{token:prepare().token,confirmation:'EXCLUIR FOTOS',now,authorize:()=>actor,onDelete(){if(++calls===2)throw Error('audit failed')}}),/audit failed/);
    assert.equal(db.prepare('SELECT count(*) n FROM event_evidence').get().n,2);
  }finally{db.close()}
});
test('lote limitado a 500 fotos exige nova prévia para as restantes',()=>{
  const {db,add,actor,service}=fixture();try{
    for(let i=0;i<501;i++)add('e'+i);
    const first=service.prepare(db,actor,null,30,now);assert.equal(first.eligible,501);assert.equal(first.batchCount,500);
    const result=service.execute(db,{token:first.token,confirmation:'EXCLUIR FOTOS',now,authorize:()=>actor,onDelete(){}});assert.equal(result.deleted,500);
    assert.equal(service.prepare(db,actor,null,30,now).batchCount,1);
  }finally{db.close()}
});
test('HTTP exige administrador e CSRF, mantém ocorrência e informa foto removida',async t=>{
  const {db,add}=fixture();add('old');
  db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run('op','a','op','op@test.example','unused','operator');
  const tokens={};for(const id of ['a','b','op']){const token=randomBytes(32).toString('hex');tokens[id]='invictus_session='+token;db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',now+3600000)}
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin,now:()=>now});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});const base='http://127.0.0.1:'+server.address().port;
  const req=(path,who='a',data,csrf='csrf')=>fetch(base+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',Cookie:tokens[who]||'','X-CSRF-Token':csrf},...(data?{body:JSON.stringify(data)}:{})});
  const path='/api/evidence/retention/prepare',input={days:30,client:'a'};
  assert.equal((await req(path,'none',input)).status,401);assert.equal((await req(path,'op',input)).status,403);assert.equal((await req(path,'a',input,'wrong')).status,403);
  assert.equal((await req(path,'b',input)).status,404);assert.equal((await req(path,'a',{days:0})).status,400);
  const preview=await(await req(path,'a',input)).json();const confirm={token:preview.token,confirmation:'EXCLUIR FOTOS'};
  assert.equal((await req('/api/evidence/retention/execute','b',confirm)).status,409);
  assert.equal((await req('/api/evidence/retention/execute','op',confirm)).status,403);
  assert.equal((await req('/api/evidence/retention/execute','a',confirm,'wrong')).status,403);
  assert.equal((await req('/api/evidence/retention/execute','a',confirm)).status,200);
  const state=await(await req('/api/state')).json();assert.equal(state.events.length,1);assert.equal(state.events[0].hasEvidence,0);assert.equal(state.events[0].evidenceRemoved,1);
  assert.equal((await req('/api/events/old/image')).status,404);
});
