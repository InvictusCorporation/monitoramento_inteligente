import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function loadCameraKey(path, { allowCreate=true }={}) {
  try {
    const key=readFileSync(path);
    if(key.length!==32)throw Error('Chave de câmeras inválida. Restaure a chave original.');
    return key;
  } catch(error) {
    if(error.code!=='ENOENT')throw error;
    if(!allowCreate)throw Error('Chave de câmeras ausente. Restaure a chave original antes de iniciar.');
    mkdirSync(dirname(path),{recursive:true});
    const key=randomBytes(32);
    try{writeFileSync(path,key,{flag:'wx',mode:0o600});return key}
    catch(error){if(error.code==='EEXIST')return loadCameraKey(path,{allowCreate:false});throw error}
  }
}
export function sealConnection(key, camera, config) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(Buffer.from(camera.org_id+'\0'+camera.id));
  const data=Buffer.concat([cipher.update(JSON.stringify(config),'utf8'),cipher.final()]);
  return JSON.stringify({v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')});
}
export function openConnection(key, camera, secret) {
  const sealed=JSON.parse(secret);
  if(sealed.v!==1)throw Error('Formato inválido.');
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(sealed.iv,'base64'));
  decipher.setAAD(Buffer.from(camera.org_id+'\0'+camera.id));
  decipher.setAuthTag(Buffer.from(sealed.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(sealed.data,'base64')),decipher.final()]).toString('utf8'));
}
