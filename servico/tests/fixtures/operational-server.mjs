// Controlled browser fixture: real HTTP app + temporary SQLite + original MP4 gateway.
// No real RTSP subprocess, AI credentials, persistent install data or default account.
import {openDatabase,createOrganization} from '../../server/database.mjs';
import {createApp} from '../../server/app.mjs';
import {VideoGateway,parseEndpoints} from '../../server/video-gateway.mjs';
import {sealConnection} from '../../server/camera-secrets.mjs';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir=await mkdtemp(join(tmpdir(),'invictus-browser-')),db=openDatabase(join(dir,'fixture.sqlite'));
const password=randomBytes(24).toString('hex'),key=randomBytes(32),port=Number(process.env.FIXTURE_PORT||8097);
const org=await createOrganization(db,{name:'Empresa de validação',slug:'fixture',adminName:'Operador de validação',email:'operator@example.test',password});
db.prepare('INSERT INTO platform_admins VALUES(?)').run(org.userId);
for(const [id,name] of [['aurora','Residencial Aurora'],['norte','Comercial Norte'],['centro','Loja Centro']]){
 db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,org.orgId,name);
 db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('cam-'+id,org.orgId,id,name+' · Portão',new Date().toISOString());
 db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run('event-'+id,org.orgId,'cam-'+id,'Pessoa detectada','Alta','Perímetro',new Date().toISOString());
 const config={enabled:true,name:'Perímetro',priority:'Alta',days:[0,1,2,3,4,5,6],start:'00:00',end:'00:00',timezone:'America/Sao_Paulo',area:{x:0,y:0,width:100,height:100},...(id==='aurora'?{target:'person'}:id==='norte'?{targets:['person','vehicle']}:{targets:['person','vehicle','animal'],pausedTargets:[]})};
 db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?)').run('cam-'+id,org.orgId,JSON.stringify(config),1);
 const connection={host:'192.168.20.10',port:554,path:'/fixture',username:'fixture',password:randomBytes(16).toString('hex')};
 db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run('cam-'+id,org.orgId,sealConnection(key,{id:'cam-'+id,org_id:org.orgId},connection),1,1,new Date().toISOString());
}
const pending=await createOrganization(db,{name:'Primeiro acesso fixture',slug:'initial',adminName:'Inicial',email:'initial@example.test',password});
db.prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(pending.userId);
const image=await readFile(new URL('./occurrence.jpg',import.meta.url));
db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run('event-aurora',org.orgId,new Date().toISOString(),image);
const media=await readFile(new URL('./shared-video.mp4',import.meta.url));
const gateway=new VideoGateway({executable:'fixture-only',checkExecutable:false,endpoints:parseEndpoints(JSON.stringify(['aurora','norte','centro'].map(clientId=>({clientId,address:'192.168.20.10:554'})))),spawnProcess:()=>{
 const child=new EventEmitter();child.stdout=new PassThrough();child.kill=()=>{if(child.killed)return;child.killed=true;clearInterval(timer);child.stdout.end();setImmediate(()=>child.emit('close',0))};
 const timer=setInterval(()=>{},1000);setImmediate(()=>child.stdout.write(media));return child;
}});
const server=await createApp({db,origin:'http://127.0.0.1:'+port,cameraKey:key,videoGateway:gateway,modernUiRoot:new URL('../../dist/interface/',import.meta.url)});
// Secret fixture credentials stay in a mode-600 file under /tmp; never stdout.
await writeFile(join(dir,'browser-login.json'),JSON.stringify({company:'fixture',email:'operator@example.test',password,initialCompany:'initial',initialEmail:'initial@example.test'}),{mode:0o600});
server.listen(port,'127.0.0.1',()=>console.log('Fixture pronta; credenciais temporárias: '+join(dir,'browser-login.json')));
async function stop(){await server.stopMonitoring();gateway.close();server.closeAllConnections();await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});process.exit(0)}
process.on('SIGTERM',stop);process.on('SIGINT',stop);