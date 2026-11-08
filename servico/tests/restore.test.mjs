import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {openDatabase} from '../server/database.mjs';
import {sealConnection,openConnection} from '../server/camera-secrets.mjs';
import {createBackup,verifyBackup,fingerprint} from '../scripts/backup-local.mjs';
import {restoreBackup} from '../scripts/restore-local.mjs';
function fixture(t,{capacity=true}={}){
  const root=mkdtempSync(join(tmpdir(),'invictus-restore-'));mkdirSync(join(root,'data'));
  const db=openDatabase(join(root,'data','monitoramento.sqlite')),key=randomBytes(32),image=Buffer.from([255,216,1,2,255,217]);
  writeFileSync(join(root,'data','camera.key'),key);if(capacity)writeFileSync(join(root,'data','capacity.json'),JSON.stringify({live:32,perOperator:16,captures:2}));
  db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run('o','org','Org','Org');
  db.prepare('INSERT INTO clients VALUES(?,?,?)').run('l','o','Local');
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('c','o','l','Camera',new Date().toISOString());
  db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run('u','o','User','fixture@example.test','unused','admin');
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('fixture-token','u','fixture-csrf',Date.now()+60000);
  db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run('c','o',sealConnection(key,{id:'c',org_id:'o'},{password:'fixture-camera'}),1,1,new Date().toISOString());
  db.prepare('INSERT INTO ai_settings VALUES(?,?,?,?)').run('o',sealConnection(key,{id:'openai-credential',org_id:'o'},{apiKey:'fixture-not-a-real-key'}),1,1);
  db.prepare('INSERT INTO monitoring_service VALUES(?,?,?,?,?,?,?)').run('o','u',1,60,300,100,1);
  db.prepare('INSERT INTO monitoring_jobs VALUES(?,?,?,?,?,?)').run('c','o',0,0,'running','fixture');
  db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run('e','o','c','Pessoa','Alta','Regra',new Date().toISOString());
  db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run('e','o',new Date().toISOString(),image);
  t.after(()=>{db.close();rmSync(root,{recursive:true,force:true})});
  return {root,db,key,image};
}
test('Recuperação conserva fotos e credenciais, pausa apenas a cópia e inclui capacidade',t=>{
  const {root,db,key,image}=fixture(t),backup=createBackup(root),before=fingerprint(join(backup,'monitoramento.sqlite'));
  assert.equal(verifyBackup(backup).format,2);
  const {directory,report}=restoreBackup(root,backup);
  assert.ok(!directory.endsWith('.incompleto'));assert.equal(report.photos,1);assert.equal(report.events,1);assert.equal(report.users,1);assert.equal(report.credentialsChecked,2);assert.equal(report.sessionsRemoved,1);assert.equal(report.servicesPaused,1);assert.equal(report.capacityRestored,true);
  const copy=new DatabaseSync(join(directory,'data','monitoramento.sqlite'),{readOnly:true});
  try{
    assert.equal(copy.prepare('SELECT count(*) n FROM sessions').get().n,0);
    const service=copy.prepare('SELECT enabled,version FROM monitoring_service').get();assert.equal(service.enabled,0);assert.equal(service.version,2);
    assert.equal(copy.prepare('SELECT status FROM monitoring_jobs').get().status,'interrupted');
    assert.deepEqual(Buffer.from(copy.prepare('SELECT image FROM event_evidence').get().image),image);
    assert.equal(openConnection(key,{id:'c',org_id:'o'},copy.prepare('SELECT secret FROM camera_connections').get().secret).password,'fixture-camera');
  }finally{copy.close()}
  assert.deepEqual(readFileSync(join(directory,'data','camera.key')),key);
  assert.equal(JSON.parse(readFileSync(join(directory,'data','capacity.json'))).perOperator,16);
  assert.equal(db.prepare('SELECT enabled FROM monitoring_service').get().enabled,1);assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,1);
  assert.deepEqual(fingerprint(join(backup,'monitoramento.sqlite')),before);verifyBackup(backup);
  const next=restoreBackup(root,backup);assert.notEqual(next.directory,directory);
  assert.ok(!JSON.stringify(report).includes('fixture-camera'));assert.ok(!JSON.stringify(report).includes('fixture-not-a-real-key'));
  for(const [name,expected] of Object.entries(report.files))assert.deepEqual(fingerprint(join(directory,'data',name)),expected);
});
test('Backup antigo de formato 1 continua recuperável sem inventar capacidade',t=>{
  const {root}=fixture(t,{capacity:false}),backup=createBackup(root),path=join(backup,'manifest.json');
  const manifest=JSON.parse(readFileSync(path));manifest.format=1;writeFileSync(path,JSON.stringify(manifest));
  verifyBackup(backup);const restored=restoreBackup(root,backup);
  assert.equal(restored.report.capacityRestored,false);assert.ok(!readdirSync(join(restored.directory,'data')).includes('capacity.json'));
});
test('Alteração de arquivo ou formato desconhecido não gera recuperação concluída',t=>{
  const {root}=fixture(t),backup=createBackup(root),path=join(backup,'manifest.json');
  const manifest=JSON.parse(readFileSync(path));writeFileSync(join(backup,'capacity.json'),'{}');assert.throws(()=>restoreBackup(root,backup),/alterado/);
  manifest.format=999;writeFileSync(path,JSON.stringify(manifest));assert.throws(()=>restoreBackup(root,backup),/Manifesto/);
});
test('Chave incompatível é recusada mesmo quando o hash foi atualizado',t=>{
  const {root,db}=fixture(t),backup=createBackup(root),keyPath=join(backup,'camera.key'),manifestPath=join(backup,'manifest.json');
  writeFileSync(keyPath,randomBytes(32));const manifest=JSON.parse(readFileSync(manifestPath));manifest.files['camera.key']=fingerprint(keyPath);writeFileSync(manifestPath,JSON.stringify(manifest));
  verifyBackup(backup);assert.throws(()=>restoreBackup(root,backup),/credenciais/);
  assert.ok(readdirSync(join(root,'restauracoes')).every(n=>n.endsWith('.incompleto')));assert.equal(db.prepare('SELECT enabled FROM monitoring_service').get().enabled,1);
});
test('Banco futuro é recusado sem substituir instalação',t=>{
  const {root,db}=fixture(t);db.prepare('INSERT INTO schema_migrations VALUES(?)').run(999);
  const backup=createBackup(root);assert.throws(()=>restoreBackup(root,backup),/Versão/);
  assert.ok(readdirSync(join(root,'restauracoes')).every(n=>n.endsWith('.incompleto')));
});
test('Backup recusa capacity.json inválido',t=>{
  const {root}=fixture(t);writeFileSync(join(root,'data','capacity.json'),'{"live":0}');assert.throws(()=>createBackup(root),/Capacidade/);
});
test('Recuperação recusa transações WAL externas e nomes inesperados no manifesto',t=>{
  const {root}=fixture(t),backup=createBackup(root);
  writeFileSync(join(backup,'monitoramento.sqlite-wal'),Buffer.from('fixture-extra'));
  assert.throws(()=>restoreBackup(root,backup),/transações externas/);
  const another=createBackup(root),path=join(another,'manifest.json'),manifest=JSON.parse(readFileSync(path));
  manifest.files['../outside']={bytes:0,sha256:''};writeFileSync(path,JSON.stringify(manifest));
  assert.throws(()=>restoreBackup(root,another),/Manifesto/);
});
