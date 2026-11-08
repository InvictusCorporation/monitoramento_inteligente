import {copyFileSync,constants,mkdirSync,writeFileSync,renameSync,realpathSync,statSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createBackup,verifyBackup} from './backup-local.mjs';

// Use path components rather than string prefixes (e.g. app and app-backups).
function contains(parent,child){const r=relative(parent,child);return r===''||(!r.split(/[\\/]/).includes('..')&&!isAbsolute(r))}
export function externalDestination(root,destination,options={}){
  if(typeof destination!=='string'||!isAbsolute(destination))throw Error('Informe o caminho absoluto de uma pasta externa existente.');
  const target=realpathSync(destination);if(!statSync(target).isDirectory())throw Error('O destino deve ser uma pasta.');
  const protectedRoots=[realpathSync(resolve(root)),...[options.databasePath,options.keyPath].filter(Boolean).map(p=>dirname(realpathSync(resolve(p))))];
  if(protectedRoots.some(p=>contains(p,target)||contains(target,p)))throw Error('Escolha uma pasta fora da instalação e das pastas do banco e da chave.');
  return target;
}
export function copyExternalBackup(root,source,destination,options={}){
  const target=externalDestination(root,destination,options),manifest=verifyBackup(source);
  const name='invictus-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID();
  const pending=join(target,name+'.incompleto'),complete=join(target,name);mkdirSync(pending,{mode:0o700});
  for(const name of Object.keys(manifest.files))copyFileSync(join(source,name),join(pending,name),constants.COPYFILE_EXCL);
  writeFileSync(join(pending,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
  verifyBackup(pending);renameSync(pending,complete);return complete;
}
export function createExternalBackup(root,destination,options={}){
  // Check availability before creating the local snapshot. A missing disk is never replaced by a local fallback.
  const target=externalDestination(root,destination,options);
  const local=createBackup(root,options),external=copyExternalBackup(root,local,target,options);
  return {local,external};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const [root,destination,databasePath,keyPath]=process.argv.slice(2);
    if(!root||!destination||!databasePath||!keyPath)throw Error('Argumentos incompletos.');
    const result=createExternalBackup(root,destination,{databasePath,keyPath});console.log(JSON.stringify(result));
  }catch{console.error('Backup externo não concluído. Confira destino, espaço, permissões e integridade.');process.exitCode=1}
}
