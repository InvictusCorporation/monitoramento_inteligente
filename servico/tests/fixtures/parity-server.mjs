// Parity browser fixture: real HTTP app + temporary SQLite, no real RTSP/OpenAI.
import {openDatabase,createOrganization,hashPassword} from '../../server/database.mjs';
import {createApp} from '../../server/app.mjs';
import {VideoGateway,parseEndpoints} from '../../server/video-gateway.mjs';
import {sealConnection} from '../../server/camera-secrets.mjs';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'invictus-parity-')),db=openDatabase(join(dir,'fixture.sqlite')),password=randomBytes(24).toString('hex'),key=randomBytes(32),port=Number(process.env.FIXTURE_PORT||8098);
const org=await createOrganization(db,{name:'Empresa paridade',slug:'parity',adminName:'Master paridade',email:'master@example.test',password});
db.prepare('INSERT INTO platform_admins VALUES(?)').run(org.userId);
for(const [id,name,role,client] of [['admin2','Admin operação','admin',null],['operator1','Operador um','operator',null],['operator2','Operador dois','operator',null]])db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run(id,org.orgId,name,id+'@example.test',await hashPassword(password),role,client);
db.prepare('INSERT INTO commercial_customers VALUES(?,?,?)').run('customer-a',org.orgId,'Cliente inicial');
for(const [id,name] of [['aurora','Residencial Aurora'],['norte','Comercial Norte']]){
 db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,org.orgId,name);db.prepare('INSERT INTO customer_locations VALUES(?,?,?)').run(id,org.orgId,'customer-a');db.prepare('INSERT INTO monitoring_locations VALUES(?,?,?,?)').run(id,org.orgId,1,1);
 for(let index=1;index<=3;index++){
  const camera=id+'-'+index,event='event-'+camera;
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(camera,org.orgId,id,name+' · Câmera '+index,new Date().toISOString());
  db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run(event,org.orgId,camera,'Pessoa detectada','Alta','Perímetro',new Date().toISOString());
  const config={enabled:true,name:'Perímetro',priority:'Alta',days:[0,1,2,3,4,5,6],start:'00:00',end:'00:00',timezone:'America/Sao_Paulo',area:{x:0,y:0,width:100,height:100},...(index===1?{target:'person'}:{targets:['person','vehicle'],pausedTargets:[]})};
  db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?)').run(camera,org.orgId,JSON.stringify(config),1);
  const connection={host:'192.168.20.10',port:554,path:'/fixture',username:'fixture',password:randomBytes(16).toString('hex')};
  db.prepare('INSERT INTO camera_connections VALUES(?,?,?,?,?,?)').run(camera,org.orgId,sealConnection(key,{id:camera,org_id:org.orgId},connection),1,1,new Date().toISOString());
 }
}
db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run('client1',org.orgId,'Cliente local','client1@example.test',await hashPassword(password),'client','aurora');
db.prepare('INSERT INTO ai_settings VALUES(?,?,?,?)').run(org.orgId,sealConnection(key,{id:'openai-credential',org_id:org.orgId},{apiKey:'sk-fixture_not_a_real_credential_123456'}),1,1);
db.prepare('INSERT INTO commercial_plans VALUES(?,?,?,?,?,?)').run('plan-initial',org.orgId,'Essencial',8,1,1);
const image=await readFile(new URL('./occurrence.jpg',import.meta.url));
db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run('event-aurora-1',org.orgId,new Date().toISOString(),image);
const old=new Date(Date.now()-40*86400000).toISOString();
db.prepare("INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at,status,note) VALUES(?,?,?,?,?,?,?,'Finalizada','Verificação fixture')").run('event-old',org.orgId,'aurora-2','Veículo detectado','Baixa','Perímetro',old);
db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run('event-old',org.orgId,old,image);
const media=await readFile(new URL('./shared-video.mp4',import.meta.url));
const gateway=new VideoGateway({executable:'fixture-only',checkExecutable:false,endpoints:parseEndpoints(JSON.stringify(['aurora','norte'].map(clientId=>({clientId,address:'192.168.20.10:554'})))),spawnProcess:(_executable,args)=>{const snapshot=args.includes('image2pipe'),child=new EventEmitter();child.stdout=new PassThrough();child.kill=()=>{if(child.killed)return;child.killed=true;clearInterval(timer);child.stdout.end();setImmediate(()=>child.emit('close',0))};const timer=setInterval(()=>{},1000);setImmediate(()=>{child.stdout.write(snapshot?image:media);if(snapshot){clearInterval(timer);child.stdout.end();setImmediate(()=>child.emit('close',0))}});return child}});
const server=await createApp({db,origin:'http://127.0.0.1:'+port,cameraKey:key,videoGateway:gateway,modernUiRoot:new URL('../../dist/interface/',import.meta.url),aiDetect:async({targets})=>Object.fromEntries(targets.map(target=>[target,target]))});
await writeFile(join(dir,'browser-login.json'),JSON.stringify({origin:'http://127.0.0.1:'+port,password,users:{master:{company:'parity',email:'master@example.test'},admin:{company:'parity',email:'admin2@example.test'},operator:{company:'parity',email:'operator1@example.test'},client:{company:'parity',email:'client1@example.test'}}}),{mode:0o600});
server.listen(port,'127.0.0.1',()=>console.log('Fixture de paridade pronta; credenciais temporárias: '+join(dir,'browser-login.json')));
async function stop(){await server.stopMonitoring();gateway.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();await rm(dir,{recursive:true,force:true});process.exit(0)}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
