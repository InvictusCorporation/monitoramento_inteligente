import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {BackupScheduler,validateBackupSchedule,readBackupStatus,writeLocalJson} from '../server/backup-scheduler.mjs';
import {createExternalBackup,copyExternalBackup,externalDestination} from '../scripts/external-backup.mjs';
import {verifyBackup} from '../scripts/backup-local.mjs';
function setup(t){
  const base=mkdtempSync(join(tmpdir(),'invictus-scheduled-')),root=join(base,'app'),destination=join(base,'external');
  mkdirSync(join(root,'data'),{recursive:true});mkdirSync(destination);
  const databasePath=join(root,'data','monitoramento.sqlite'),keyPath=join(root,'data','camera.key');writeFileSync(keyPath,randomBytes(32));
  const db=new DatabaseSync(databasePath);db.exec('CREATE TABLE fixture(value TEXT); INSERT INTO fixture VALUES(\'committed\')');db.close();
  const configure=(data={})=>writeLocalJson(root,'backup-schedule.json',{enabled:true,intervalHours:1,destination,...data});
  t.after(()=>rmSync(base,{recursive:true,force:true}));return {base,root,destination,databasePath,keyPath,configure};
}
test('Configuração exige intervalo válido e começa desativada',()=>{
  assert.deepEqual(validateBackupSchedule(),{enabled:false,intervalHours:24,destination:''});
  for(const data of [{enabled:true},{intervalHours:0},{intervalHours:169},{intervalHours:1.5},{enabled:'true'}])assert.throws(()=>validateBackupSchedule(data));
});
test('Cópia externa é verificada, não sobrescreve anteriores e recusa pastas da instalação',t=>{
  const h=setup(t),first=createExternalBackup(h.root,h.destination);verifyBackup(first.local);verifyBackup(first.external);
  const second=copyExternalBackup(h.root,first.local,h.destination);assert.notEqual(second,first.external);verifyBackup(second);
  assert.equal(readdirSync(h.destination).length,2);
  assert.throws(()=>externalDestination(h.root,h.root),/fora/);assert.throws(()=>externalDestination(h.root,join(h.root,'data')),/fora/);assert.throws(()=>externalDestination(h.root,h.base),/fora/);assert.throws(()=>externalDestination(h.root,'relative'),/absoluto/);
  const count=readdirSync(join(h.root,'backups')).length;assert.throws(()=>createExternalBackup(h.root,join(h.base,'missing')));assert.equal(readdirSync(join(h.root,'backups')).length,count);
  writeFileSync(join(first.local,'camera.key'),randomBytes(32));assert.throws(()=>copyExternalBackup(h.root,first.local,h.destination),/alterado/);assert.equal(readdirSync(h.destination).length,2);
});
test('Banco e chave de caminhos personalizados são os efetivamente copiados',t=>{
  const h=setup(t),custom=join(h.base,'custom');mkdirSync(custom);
  const databasePath=join(custom,'db.sqlite'),keyPath=join(custom,'encryption.key'),key=randomBytes(32);writeFileSync(keyPath,key);
  const db=new DatabaseSync(databasePath);db.exec('CREATE TABLE selected(value TEXT); INSERT INTO selected VALUES(\'custom-source\')');db.close();
  const result=createExternalBackup(h.root,h.destination,{databasePath,keyPath});
  const copy=new DatabaseSync(join(result.external,'monitoramento.sqlite'),{readOnly:true});try{assert.equal(copy.prepare('SELECT value FROM selected').get().value,'custom-source')}finally{copy.close()}
  assert.deepEqual(readFileSync(join(result.external,'camera.key')),key);
  assert.throws(()=>externalDestination(h.root,custom,{databasePath,keyPath}),/fora/);
});
test('Agendamento respeita intervalo, persiste conclusão e lê desativação sem reiniciar',async t=>{
  const h=setup(t);let now=1000,calls=0;const options={root:h.root,now:()=>now,log(){},run:async()=>{calls++;return {backup:'fixture'}}};
  const scheduler=new BackupScheduler(options);t.after(()=>scheduler.close());await scheduler.tick();assert.equal(calls,0);
  h.configure();await scheduler.tick();assert.equal(calls,1);assert.equal(readBackupStatus(h.root).status,'success');
  now+=3599999;await scheduler.tick();assert.equal(calls,1);await scheduler.close();
  const restarted=new BackupScheduler(options);t.after(()=>restarted.close());await restarted.tick();assert.equal(calls,1);
  now++;await restarted.tick();assert.equal(calls,2);h.configure({enabled:false});now+=3600000;await restarted.tick();assert.equal(calls,2);assert.equal(readBackupStatus(h.root).status,'disabled');
});
test('Execuções não se sobrepõem e fechar o servidor cancela a cópia em andamento',async t=>{
  const h=setup(t);h.configure();let calls=0;
  const scheduler=new BackupScheduler({root:h.root,log(){},run:({signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}))}});
  const pending=scheduler.tick();await scheduler.tick();assert.equal(calls,1);await scheduler.close();await pending;
  assert.equal(readBackupStatus(h.root).status,'interrupted');await scheduler.tick();assert.equal(calls,1);
});
test('Falha não é sucesso e nova tentativa aguarda quinze minutos; configuração inválida não executa',async t=>{
  const h=setup(t);h.configure();let now=1000,calls=0;
  const scheduler=new BackupScheduler({root:h.root,now:()=>now,log(){},run:async()=>{calls++;throw Error('fixture')}});t.after(()=>scheduler.close());
  await scheduler.tick();assert.equal(readBackupStatus(h.root).status,'error');assert.equal(readBackupStatus(h.root).lastSuccess,undefined);
  now+=899999;await scheduler.tick();assert.equal(calls,1);now++;await scheduler.tick();assert.equal(calls,2);
  writeFileSync(join(h.root,'data','backup-schedule.json'),'{} invalid');now+=900000;await scheduler.tick();assert.equal(calls,2);assert.equal(readBackupStatus(h.root).status,'config_error');
});
test('Processo filho executa uma cópia real de banco fictício e registra somente conclusão verificada',async t=>{
  const h=setup(t);h.configure();const scheduler=new BackupScheduler({root:h.root,log(){}});t.after(()=>scheduler.close());
  await scheduler.tick();const status=readBackupStatus(h.root);assert.equal(status.status,'success');assert.ok(status.lastSuccess);
  const names=readdirSync(h.destination);assert.equal(names.length,1);assert.equal(names[0],status.backup);verifyBackup(join(h.destination,names[0]));
});
