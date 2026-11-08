import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase,transaction} from '../server/database.mjs';

test('Evidência persiste no reinício e imagem inválida reverte a ocorrência inteira',()=>{
  const directory=mkdtempSync(join(tmpdir(),'invictus-evidence-')),path=join(directory,'test.sqlite');let db=openDatabase(path);
  const image=Buffer.from([255,216,1,2,3,255,217]);
  try{
    db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('o','o','o','o');
    db.prepare('INSERT INTO clients VALUES(?,?,?)').run('l','o','l');
    db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c','o','l','c','2026-11-02');
    const event=id=>db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run(id,'o','c','Pessoa','Alta','Regra','2026-11-02');
    transaction(db,()=>{event('e');db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run('e','o','2026-11-02',image)});
    assert.throws(()=>transaction(db,()=>{event('bad');db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run('bad','o','2026-11-02',Buffer.alloc(4194305))}));
    assert.equal(db.prepare("SELECT count(*) n FROM events WHERE id='bad'").get().n,0);
    db.close();db=openDatabase(path);
    assert.deepEqual(Buffer.from(db.prepare("SELECT image FROM event_evidence WHERE event_id='e'").get().image),image);
    assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations').get().n,16);
  }finally{db.close();rmSync(directory,{recursive:true,force:true})}
});
