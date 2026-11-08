import {attachBackupScheduler} from '../server/backup-scheduler.mjs';
import {SharedVideoGateway} from '../server/shared-video-gateway.mjs';
import {loadCapacity} from '../server/capacity.mjs';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { openDatabase } from '../server/database.mjs';
import { createApp } from '../server/app.mjs';
import { loadCameraKey } from '../server/camera-secrets.mjs';
import { parseEndpoints } from '../server/video-gateway.mjs';
import { createLocalSetup,localSettings } from '../server/local-setup.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const runtime=JSON.parse(await readFile(resolve('data/local-runtime.json'),'utf8'));
const db=openDatabase(),key=loadCameraKey(resolve('data/camera.key'),{allowCreate:db.prepare('SELECT count(*) AS n FROM camera_connections').get().n===0&&db.prepare('SELECT count(*) AS n FROM ai_settings').get().n===0});
const gateway=new SharedVideoGateway({...loadCapacity(resolve('data/capacity.json')),executable:runtime.ffmpeg,endpoints:parseEndpoints(JSON.stringify(localSettings(db)))});
const first=db.prepare('SELECT count(*) AS n FROM organizations').get().n===0;
const token=randomBytes(32).toString('hex');
const origin='http://127.0.0.1:8087';
const server=await createApp({db,origin,cameraKey:key,videoGateway:gateway,localSetup:first?createLocalSetup({db,key,gateway,token}):null});
const backups=attachBackupScheduler(server,{root:resolve('.')});
server.once('error',error=>{gateway.close();db.close();console.error(error.code==='EADDRINUSE'?'A porta 8087 já está em uso. Se o Invictus já estiver aberto, use essa janela; caso contrário, encerre a outra instalação e tente novamente.':'Não foi possível iniciar o servidor local.');process.exitCode=1});
server.listen(8087,'127.0.0.1',async()=>{
  const url=first?origin+'/local-setup.html#setup='+token:origin;
  // Private fallback link: never shipped, logged, committed, or sent to another service.
  await writeFile(resolve('data/ABRIR-INVICTUS.html'),`<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Abrir Invictus</title><a href="${url}">Abrir Invictus Monitoramento</a>`,{mode:0o600});
  console.log('Invictus iniciado. Mantenha esta janela aberta durante o teste.');
  console.log(first?'Crie sua conta na página que será aberta. Se ela não abrir, abra data/ABRIR-INVICTUS.html.':'Acesse http://127.0.0.1:8087 e entre na sua conta.');
  execFile('cmd.exe',['/d','/c','start','',url],{windowsHide:true},error=>{if(error)console.log('Abra o arquivo data/ABRIR-INVICTUS.html para acessar.')});
});
async function stop(){await backups.close();await server.stopMonitoring();gateway.close();server.close(()=>{db.close();process.exit(0)})}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
