import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {createBackup,verifyBackup} from '../scripts/backup-local.mjs';
test('Backup inclui commits WAL e chave, preserva origem e detecta alteração',()=>{
  const root=mkdtempSync(join(tmpdir(),'invictus-backup-'));mkdirSync(join(root,'data'));
  const db=new DatabaseSync(join(root,'data','monitoramento.sqlite'));
  try{
    db.exec('PRAGMA journal_mode=WAL; CREATE TABLE records(id INTEGER PRIMARY KEY,photo BLOB)');
    const photo=Buffer.from([255,216,1,255,217]),key=randomBytes(32);
    writeFileSync(join(root,'data','camera.key'),key);db.prepare('INSERT INTO records(photo) VALUES(?)').run(photo);
    const directory=createBackup(root);verifyBackup(directory);
    assert.ok(!directory.endsWith('.incompleto'));assert.deepEqual(readFileSync(join(directory,'camera.key')),key);
    const restored=new DatabaseSync(join(directory,'monitoramento.sqlite'),{readOnly:true});
    try{assert.deepEqual(Buffer.from(restored.prepare('SELECT photo FROM records').get().photo),photo)}finally{restored.close()}
    assert.equal(db.prepare('SELECT count(*) n FROM records').get().n,1);
    const second=createBackup(root);assert.notEqual(second,directory);
    writeFileSync(join(directory,'camera.key'),randomBytes(32));assert.throws(()=>verifyBackup(directory),/alterado/);
    verifyBackup(second);
  }finally{db.close();rmSync(root,{recursive:true,force:true})}
});
test('Backup recusa instalação incompleta sem criar um banco vazio',()=>{
  const root=mkdtempSync(join(tmpdir(),'invictus-backup-empty-'));mkdirSync(join(root,'data'));
  try{assert.throws(()=>createBackup(root));writeFileSync(join(root,'data','camera.key'),Buffer.alloc(32));assert.throws(()=>createBackup(root))}finally{rmSync(root,{recursive:true,force:true})}
});
