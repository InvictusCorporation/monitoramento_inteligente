import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/database.mjs';
import {retentionPreview} from '../server/retention-preview.mjs';
test('Simulação conta somente fotos antigas finalizadas, isola local e não modifica dados',()=>{
  const db=openDatabase(':memory:'),now=Date.parse('2026-11-02T12:00:00Z');
  try{
    for(const org of ['a','b'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,org);
    for(const [id,org] of [['l1','a'],['l2','a'],['l3','b']]){db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,org,id);db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(id,org,id,id,'2026-01-01')}
    const rows=[['old','a','l1',31,'Finalizada',10],['open','a','l1',60,'Pendente',20],['boundary','a','l1',30,'Finalizada',30],['new','a','l1',2,'Finalizada',40],['local','a','l2',60,'Finalizada',50],['foreign','b','l3',60,'Finalizada',60]];
    for(const [id,org,camera,days,status,bytes] of rows){const date=new Date(now-days*86400000).toISOString();db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at,status) VALUES(?,?,?,?,?,?,?,?)').run(id,org,camera,'Pessoa','Alta','Regra',date,status);db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run(id,org,date,Buffer.alloc(bytes))}
    const local=retentionPreview(db,'a','l1',30,now);assert.equal(local.total,4);assert.equal(local.eligible,1);assert.equal(local.eligibleBytes,10);assert.equal(local.protectedOpen,1);assert.equal(local.simulation,true);
    assert.equal(retentionPreview(db,'a',null,30,now).eligibleBytes,60);
    assert.equal(retentionPreview(db,'a','l1',90,now).eligible,0);
    assert.throws(()=>retentionPreview(db,'a',null,0,now));
    assert.equal(db.prepare('SELECT count(*) n FROM event_evidence').get().n,6);assert.equal(db.prepare('SELECT count(*) n FROM events').get().n,6);
  }finally{db.close()}
});
