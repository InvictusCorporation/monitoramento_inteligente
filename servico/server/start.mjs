import {attachBackupScheduler} from './backup-scheduler.mjs';
import {SharedVideoGateway} from './shared-video-gateway.mjs';
import {loadCapacity} from './capacity.mjs';
import { openDatabase } from './database.mjs';
import { createApp } from './app.mjs';
import { loadCameraKey } from './camera-secrets.mjs';
import { parseEndpoints } from './video-gateway.mjs';
import { dirname, resolve } from 'node:path';

const port=Number(process.env.PORT||8087), host=process.env.HOST||'127.0.0.1';
const production=process.env.NODE_ENV==='production';
if(production&&!process.env.APP_ORIGIN)throw Error('Defina APP_ORIGIN com o endereço HTTPS do sistema.');
if(!production&&!['127.0.0.1','localhost','::1'].includes(host))throw Error('Acesso externo exige NODE_ENV=production e HTTPS.');
const origin=process.env.APP_ORIGIN||`http://127.0.0.1:${port}`;
const databasePath=process.env.DB_PATH||resolve('data/monitoramento.sqlite');
const db=openDatabase(databasePath);
const cameraKey=loadCameraKey(process.env.CAMERA_KEY_PATH||resolve(dirname(databasePath),'camera.key'),
  {allowCreate:db.prepare('SELECT count(*) AS count FROM camera_connections').get().count===0&&db.prepare('SELECT count(*) AS n FROM ai_settings').get().n===0});
const videoGateway=new SharedVideoGateway({...loadCapacity(resolve('data/capacity.json')),executable:process.env.FFMPEG_PATH||'',endpoints:parseEndpoints(process.env.CAMERA_ALLOWED_ENDPOINTS)});
const modernUiRoot=process.env.INVICTUS_UI==='modern'?resolve('dist/interface'):null;
const server=await createApp({db,origin,secureCookies:production,cameraKey,videoGateway,modernUiRoot});
const backups=attachBackupScheduler(server,{root:resolve('.'),databasePath,keyPath:process.env.CAMERA_KEY_PATH||resolve(dirname(databasePath),'camera.key')});
server.listen(port,host,()=>console.log(`Invictus Monitoramento: ${origin}`));
async function stop(){await backups.close();await server.stopMonitoring();videoGateway.close();server.close(()=>{db.close();process.exit(0)})}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
