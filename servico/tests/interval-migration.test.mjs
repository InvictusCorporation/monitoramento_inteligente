import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/database.mjs';

test('Migração do intervalo preserva configurações antigas, aceita 10/15 e reabre sem duplicação',()=>{
  const dir=mkdtempSync(join(tmpdir(),'invictus-interval-')),path=join(dir,'test.sqlite');let db;
  try{
    db=openDatabase(path);
    db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('o','o','Org','Org');
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run('u','o','Admin','test@example.com','unused','admin');
    const sql=db.prepare("SELECT sql FROM sqlite_master WHERE name='monitoring_service'").get().sql;
    db.exec('DROP TABLE monitoring_service');
    db.exec(sql.replace('BETWEEN 10 AND 3600','BETWEEN 30 AND 3600'));
    db.exec('DELETE FROM schema_migrations WHERE version=16');
    db.prepare('INSERT INTO monitoring_service VALUES(?,?,?,?,?,?,?)').run('o','u',1,30,60,50,7);
    const original=db.prepare('SELECT * FROM monitoring_service').get();db.close();db=openDatabase(path);
    assert.deepEqual(db.prepare('SELECT * FROM monitoring_service').get(),original);
    for(const seconds of [10,15])db.prepare('UPDATE monitoring_service SET interval_seconds=?').run(seconds);
    assert.throws(()=>db.prepare('UPDATE monitoring_service SET interval_seconds=?').run(9));
    db.close();db=openDatabase(path);assert.equal(db.prepare('SELECT interval_seconds FROM monitoring_service').get().interval_seconds,15);
    assert.equal(db.prepare('SELECT count(*) n FROM schema_migrations WHERE version=16').get().n,1);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{db?.close();rmSync(dir,{recursive:true,force:true})}
});
