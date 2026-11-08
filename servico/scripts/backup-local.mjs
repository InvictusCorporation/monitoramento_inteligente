import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,renameSync,openSync,readSync,closeSync,lstatSync} from 'node:fs';
import {validateCapacity} from '../server/capacity.mjs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';

export function fingerprint(path){
  if(!lstatSync(path).isFile())throw Error('O backup exige arquivos regulares, sem links.');
  const fd=openSync(path,'r'),digest=createHash('sha256'),buffer=Buffer.alloc(1024*1024);let bytes=0;
  try{let count;while((count=readSync(fd,buffer,0,buffer.length,null))>0){digest.update(buffer.subarray(0,count));bytes+=count}}
  finally{closeSync(fd)}
  return {bytes,sha256:digest.digest('hex')};
}
export function verifyBackup(directory){
  for(const suffix of ['-wal','-journal']){
    try{if(lstatSync(join(directory,'monitoramento.sqlite'+suffix)).size>0)throw Error('O backup contém transações externas ao manifesto. Use uma cópia concluída por FAZER-BACKUP.')}
    catch(error){if(error.code!=='ENOENT')throw error}
  }
  if(!lstatSync(join(directory,'manifest.json')).isFile())throw Error('Manifesto deve ser um arquivo regular.');
  const manifest=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
  const names=Object.keys(manifest.files||{}).sort().join(',');
  if(![1,2].includes(manifest.format)||!['camera.key,monitoramento.sqlite',...(manifest.format===2?['camera.key,capacity.json,monitoramento.sqlite']:[])].includes(names))throw Error('Manifesto de backup inválido.');
  for(const name of Object.keys(manifest.files)){
    const actual=fingerprint(join(directory,name));
    if(actual.sha256!==manifest.files[name]?.sha256||actual.bytes!==manifest.files[name]?.bytes)throw Error('Backup incompleto ou alterado: '+name);
    if(name==='camera.key'&&actual.bytes!==32)throw Error('Chave inválida.');
  }
  if(manifest.files['capacity.json'])validateCapacity(JSON.parse(readFileSync(join(directory,'capacity.json'),'utf8')));
  const db=new DatabaseSync(join(directory,'monitoramento.sqlite'),{readOnly:true});
  try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Banco do backup inválido.')}finally{db.close()}
  return manifest;
}
export function createBackup(root,options={}){
  root=resolve(root);
  const keyPath=options.keyPath||join(root,'data','camera.key'),key=readFileSync(keyPath);
  if(key.length!==32)throw Error('A chave de câmeras não é válida.');
  const source=new DatabaseSync(options.databasePath||join(root,'data','monitoramento.sqlite'),{readOnly:true});
  const base=join(root,'backups');mkdirSync(base,{recursive:true});
  const name='invictus-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
  const pending=join(base,name+'.incompleto'),complete=join(base,name);
  mkdirSync(pending,{mode:0o700});
  try{
    source.exec('PRAGMA busy_timeout=5000');
    source.prepare('VACUUM INTO ?').run(join(pending,'monitoramento.sqlite'));
    if(!readFileSync(keyPath).equals(key))throw Error('A chave mudou durante o backup. Tente novamente com o servidor fechado.');
    writeFileSync(join(pending,'camera.key'),key,{flag:'wx',mode:0o600});
    const names=['monitoramento.sqlite','camera.key'];
    try{
      const capacity=readFileSync(join(root,'data','capacity.json'));
      validateCapacity(JSON.parse(capacity.toString('utf8')));
      writeFileSync(join(pending,'capacity.json'),capacity,{flag:'wx',mode:0o600});names.push('capacity.json');
    }catch(error){if(error.code!=='ENOENT')throw error}
    const files={};
    for(const file of names){
      files[file]=fingerprint(join(pending,file));
    }
    const manifest={format:2,createdAt:new Date().toISOString(),files};
    writeFileSync(join(pending,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
    verifyBackup(pending);renameSync(pending,complete);return complete;
  }finally{source.close()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv[2]==='--verify'){
      if(!process.argv[3])throw Error('Informe a pasta do backup.');
      verifyBackup(resolve(process.argv[3]));console.log('Backup íntegro. Nenhum dado foi restaurado.');
    }else{
      const directory=createBackup(fileURLToPath(new URL('../',import.meta.url)));
      console.log('Backup criado e verificado em:\n'+directory);
      console.log('Guarde essa pasta em local protegido: contém fotos, cadastros e a chave das credenciais.');
    }
  }catch(error){console.error('Backup não concluído: '+(error.code==='ENOENT'?'Banco ou chave não encontrados. Inicie e configure o sistema primeiro.':error.message));process.exitCode=1}
}
