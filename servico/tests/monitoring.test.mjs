import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {validateRule,inSchedule} from '../server/monitoring.mjs';
const rule={name:'Portão',enabled:true,priority:'Alta',days:[1],start:'22:00',end:'06:00',timezone:'America/Belem',area:{x:10,y:10,width:80,height:80}};
test('Regras antigas preservam pessoas e novos alvos são validados',()=>{
  assert.equal(validateRule(rule).target,'person');
  for(const target of ['person','vehicle','animal'])assert.equal(validateRule({...rule,target}).target,target);
  for(const target of ['face','theft',[],{},''])assert.throws(()=>validateRule({...rule,target}));
});
test('Seleção múltipla preserva combinações e rejeita seleção vazia, repetida ou desconhecida',()=>{
  assert.deepEqual(validateRule(rule).targets,['person']);
  assert.deepEqual(validateRule({...rule,target:'animal'}).targets,['animal']);
  assert.deepEqual(validateRule({...rule,targets:['vehicle','animal']}).targets,['vehicle','animal']);
  for(const targets of [[],['person','person'],['face'],null,'person'])assert.throws(()=>validateRule({...rule,targets}));
});
test('Horários noturnos, limites de intervalo, dias e fuso do local',()=>{
  const r=validateRule(rule);
  assert.equal(inSchedule(r,new Date('2026-11-03T01:00:00Z')),true);
  assert.equal(inSchedule(r,new Date('2026-11-03T08:59:00Z')),true);
  assert.equal(inSchedule(r,new Date('2026-11-03T09:00:00Z')),false);
  assert.equal(inSchedule(r,new Date('2026-11-04T01:00:00Z')),false);
  assert.equal(inSchedule({...r,start:'00:00',end:'00:00'},new Date('2026-11-02T12:00:00Z')),true);
  assert.equal(inSchedule({...r,start:'08:00',end:'18:00'},new Date('2026-11-02T21:00:00Z')),false);
  for(const data of [{days:[]},{days:[1,1]},{start:'25:00'},{timezone:'invalid'},{enabled:'true'},{area:{x:90,y:0,width:20,height:100}},{area:{x:0,y:0,width:0,height:100}}])assert.throws(()=>validateRule({...rule,...data}));
});
test('Regras HTTP isoladas por local, permissões, CSRF e concorrência',async t=>{
  const db=openDatabase(':memory:');
  for(const org of ['a','b'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
  for(const [id,org] of [['l1','a'],['l2','a'],['l3','b']]){db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,org,id);db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c'+id,org,id,id,new Date().toISOString())}
  const tokens={};let n=0;
  for(const [id,org,role,client] of [['admin','a','admin',null],['client','a','client','l1'],['operator','a','operator',null],['other','b','admin',null]]){
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run(id,org,id,id+'@test.com','unused',role,client);
    const token=(++n).toString(16).padStart(64,'0');tokens[id]=token;
    db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,'csrf',Date.now()+60000);
  }
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const request=(path,user='admin',body,csrf='csrf')=>fetch(base+'/api/monitoring'+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:'invictus_session='+tokens[user],'Content-Type':'application/json','X-CSRF-Token':csrf},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await request('/locations/l1','admin',{enabled:true,version:0})).status,200);
  assert.equal((await request('/cameras/cl1','client',{...rule,version:0})).status,200);
  assert.equal((await request('/cameras/cl1','client',{...rule,version:0})).status,409);
  assert.equal((await request('/cameras/cl2','client',{...rule,version:0})).status,404);
  assert.equal((await request('/cameras/cl1','other',{...rule,version:1})).status,404);
  assert.equal((await request('/cameras/cl1','operator',{...rule,version:1})).status,403);
  assert.equal((await request('/cameras/cl1','admin',{...rule,version:1},'bad')).status,403);
  assert.equal((await request('/locations/l1','client',{enabled:false,version:1})).status,200);
  const state=await (await request('','client')).json();
  assert.equal(state.detectorAvailable,false);assert.equal(state.locations.length,1);assert.equal(state.locations[0].enabled,false);assert.equal(state.rules.length,1);assert.equal(state.rules[0].name,rule.name);
  assert.equal((await (await request('','other')).json()).rules.length,0);
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action LIKE 'monitoring.%'").get().n,3);
});
