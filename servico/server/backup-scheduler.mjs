import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';

export function validateBackupSchedule(data={}){
  const enabled=data.enabled??false,intervalHours=data.intervalHours??24,destination=data.destination??'';
  if(typeof enabled!=='boolean'||!Number.isInteger(intervalHours)||intervalHours<1||intervalHours>168||typeof destination!=='string'||(enabled&&!destination.trim()))throw Error('Informe ativação, intervalo inteiro de 1 a 168 horas e pasta de destino.');
  return {enabled,intervalHours,destination};
}
export function readBackupSchedule(root){
  try{return validateBackupSchedule(JSON.parse(readFileSync(join(root,'data','backup-schedule.json'),'utf8')))}catch(error){if(error.code==='ENOENT')return validateBackupSchedule();throw error}
}
export function readBackupStatus(root){
  try{const value=JSON.parse(readFileSync(join(root,'data','backup-schedule-state.json'),'utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value}catch(error){if(error.code==='ENOENT')return {};return {status:'invalid_state'}}
}
export function writeLocalJson(root,name,data){
  const directory=join(root,'data');mkdirSync(directory,{recursive:true});
  const file=join(directory,name),pending=file+'.'+randomUUID()+'.tmp';
  writeFileSync(pending,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});renameSync(pending,file);
}
function runBackup({root,destination,databasePath,keyPath,signal}){
  const script=fileURLToPath(new URL('../scripts/external-backup.mjs',import.meta.url));
  return new Promise((resolve,reject)=>{
    execFile(process.execPath,[script,root,destination,databasePath,keyPath],{windowsHide:true,shell:false,timeout:3600000,maxBuffer:8192,signal},(error,stdout)=>{
      if(error){reject(Error('Backup externo não concluído.'));return}
      try{const result=JSON.parse(stdout);if(typeof result.external!=='string')throw Error();resolve({backup:basename(result.external)})}catch{reject(Error('Resultado de backup inválido.'))}
    });
  });
}
export class BackupScheduler {
  constructor({root,databasePath=join(root,'data','monitoramento.sqlite'),keyPath=join(root,'data','camera.key'),run=runBackup,now=Date.now,log=console.log}){
    Object.assign(this,{root:resolve(root),databasePath:resolve(databasePath),keyPath:resolve(keyPath),run,now,log});this.state=readBackupStatus(root);this.active=null;this.controller=null;this.closed=false;this.timer=null;
  }
  save(data){this.state={...this.state,...data};writeLocalJson(this.root,'backup-schedule-state.json',this.state)}
  start(){if(this.closed||this.timer)return;this.timer=setInterval(()=>void this.tick(),60000);this.timer.unref();void this.tick()}
  async tick(){
    if(this.closed||this.active)return;
    let config;
    try{config=readBackupSchedule(this.root)}catch{
      if(this.state.status!=='config_error')this.log('Backup automático: configuração inválida. Confira CONFIGURAR-BACKUP.');
      try{this.save({status:'config_error'})}catch{}return;
    }
    if(!config.enabled){if(this.state.status!=='disabled')try{this.save({status:'disabled'})}catch{}return}
    const time=this.now(),scheduleKey=createHash('sha256').update(JSON.stringify([config.intervalHours,config.destination,this.databasePath,this.keyPath])).digest('hex');
    if(this.state.scheduleKey===scheduleKey&&Number.isFinite(this.state.nextAttempt)&&time<this.state.nextAttempt)return;
    try{this.save({status:'running',lastAttempt:time,scheduleKey,nextAttempt:time+900000})}catch{this.log('Backup automático: não foi possível registrar o início; nenhuma cópia iniciada.');return}
    this.controller=new AbortController();
    this.active=(async()=>{
      try{
        const result=await this.run({root:this.root,destination:config.destination,databasePath:this.databasePath,keyPath:this.keyPath,signal:this.controller.signal});
        this.save({status:'success',lastSuccess:this.now(),nextAttempt:this.now()+config.intervalHours*3600000,backup:result.backup});
        this.log('Backup automático concluído e verificado no destino externo.');
      }catch{
        try{this.save({status:this.closed?'interrupted':'error',nextAttempt:this.now()+900000})}catch{}
        this.log('Backup automático não concluído. Confira CONFIGURAR-BACKUP; nova tentativa em aproximadamente 15 minutos enquanto o servidor estiver aberto.');
      }
    })();
    try{await this.active}finally{this.active=null;this.controller=null}
  }
  async close(){this.closed=true;clearInterval(this.timer);this.timer=null;this.controller?.abort();await this.active}
}
export function attachBackupScheduler(server,options){
  const scheduler=new BackupScheduler(options);
  server.once('listening',()=>scheduler.start());server.once('close',()=>void scheduler.close());return scheduler;
}
