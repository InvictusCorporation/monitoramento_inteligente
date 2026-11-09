import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {openDatabase,createOrganization} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {VideoGateway,parseEndpoints} from '../server/video-gateway.mjs';
import {openConnection} from '../server/camera-secrets.mjs';

test('Preservar credenciais exige mesmo destino e mantém autorização, versão e redação',async t=>{
 const db=openDatabase(':memory:'),password=randomBytes(24).toString('hex'),key=randomBytes(32),secret=randomBytes(24).toString('hex');
 const a=await createOrganization(db,{name:'A',slug:'empresa-a',adminName:'Admin',email:'a@example.test',password});
 const b=await createOrganization(db,{name:'B',slug:'empresa-b',adminName:'Outro',email:'b@example.test',password});
 for(const [id,org,local] of [['cam-a',a.orgId,'local-a'],['empty-a',a.orgId,'local-a'],['other-cam-a',a.orgId,'other-a'],['cam-b',b.orgId,'local-b']]){
  if(id!=='empty-a')db.prepare('INSERT INTO clients VALUES(?,?,?)').run(local,org,local);
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(id,org,local,id,new Date().toISOString());
 }
 const endpoints=parseEndpoints(JSON.stringify([
  {clientId:'local-a',address:'192.168.1.64:554'},
  {clientId:'local-a',address:'192.168.1.65:554'},
  {clientId:'local-a',address:'192.168.1.64:8554'},
  {clientId:'other-a',address:'192.168.1.64:554'},
  {clientId:'local-b',address:'192.168.1.64:554'}
 ]));
 const gateway=new VideoGateway({executable:'fixture-only',checkExecutable:false,endpoints}),origin='http://127.0.0.1:8087',server=await createApp({db,origin,cameraKey:key,videoGateway:gateway});
 server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{gateway.close();await new Promise(resolve=>server.close(resolve));db.close()});
 async function request(path,method='GET',body,auth={}){return fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth.cookie?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{})},...(body!==undefined&&method!=='GET'?{body:JSON.stringify(body)}:{})})}
 async function login(company,email){const response=await request('/api/login','POST',{company,email,password});assert.equal(response.status,200);const data=await response.json();return{cookie:response.headers.get('set-cookie').split(';')[0],csrf:data.csrf}}
 const admin=await login('empresa-a','a@example.test'),other=await login('empresa-b','b@example.test');
 assert.equal((await request('/api/users','POST',{name:'Operador',email:'operator@example.test',role:'operator',password},admin)).status,201);
 assert.equal((await request('/api/users','POST',{name:'Cliente',email:'client@example.test',role:'client',clientId:'local-a',password},admin)).status,201);
 const operator=await login('empresa-a','operator@example.test'),client=await login('empresa-a','client@example.test'),config={host:'192.168.1.64',port:554,path:'/original',username:'fixture-user',password:secret,profile:'manual',channel:1,stream:1};
 assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,version:0},admin)).status,200);
 const preserved=await request('/api/cameras/cam-a/connection','POST',{...config,port:'554',path:'/atualizado',username:'',password:'',preserveCredentials:true,version:1},admin);
 assert.equal(preserved.status,200);assert.deepEqual(await preserved.json(),{ok:true});
 const row=db.prepare('SELECT * FROM camera_connections WHERE camera_id=?').get('cam-a');assert.equal(row.version,2);
 const opened=openConnection(key,{id:'cam-a',org_id:a.orgId},row.secret);assert.equal(opened.password,secret);assert.equal(opened.username,'fixture-user');assert.equal(opened.path,'/atualizado');assert.equal(opened.port,554);
 for(const response of [await request('/api/cameras/cam-a/connection','GET',null,admin),await request('/api/state','GET',null,admin)]){
  const text=JSON.stringify(await response.json());assert.ok(!text.includes(secret));assert.ok(!text.includes('fixture-user'));assert.ok(!text.includes('"password"'));assert.ok(!text.includes('"username"'));
 }
 const before=row.secret;
 assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,preserveCredentials:true,version:1},admin)).status,409);
 const changedHost=await request('/api/cameras/cam-a/connection','POST',{...config,host:'192.168.1.65',preserveCredentials:true,version:2},admin);
 assert.equal(changedHost.status,400);assert.match((await changedHost.json()).error,/informe usuário e senha novamente/i);
 const changedPort=await request('/api/cameras/cam-a/connection','POST',{...config,port:8554,preserveCredentials:true,version:2},admin);
 assert.equal(changedPort.status,400);assert.match((await changedPort.json()).error,/informe usuário e senha novamente/i);
 assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,host:'169.254.169.254',preserveCredentials:true,version:2},admin)).status,400);
 assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,preserveCredentials:true,version:2},operator)).status,403);
 assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,preserveCredentials:true,version:2},other)).status,404);
 assert.equal((await request('/api/cameras/other-cam-a/connection','POST',{...config,preserveCredentials:true,version:0},client)).status,404);
 assert.equal(db.prepare('SELECT secret,version FROM camera_connections WHERE camera_id=?').get('cam-a').secret,before);
 assert.equal(db.prepare('SELECT version FROM camera_connections WHERE camera_id=?').get('cam-a').version,2);
 assert.equal((await request('/api/cameras/empty-a/connection','POST',{...config,preserveCredentials:true,version:0},admin)).status,400);
 assert.equal(db.prepare('SELECT count(*) n FROM camera_connections WHERE camera_id=?').get('empty-a').n,0);
 const missing=await request('/api/cameras/empty-a/connection','POST',{host:config.host,port:config.port,path:config.path,version:0},admin);assert.equal(missing.status,400);
 assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,preserveCredentials:true,version:2},{...admin,csrf:'wrong'})).status,403);
 const clientSaved=await request('/api/cameras/cam-a/connection','POST',{...config,path:'/cliente',preserveCredentials:true,version:2},client);
 assert.equal(clientSaved.status,200);assert.deepEqual(await clientSaved.json(),{ok:true});
 assert.equal(db.prepare('SELECT version FROM camera_connections WHERE camera_id=?').get('cam-a').version,3);
 const newSecret=randomBytes(24).toString('hex'),newHost=await request('/api/cameras/cam-a/connection','POST',{...config,host:'192.168.1.65',username:'new-fixture-user',password:newSecret,version:3},admin);
 assert.equal(newHost.status,200);const newHostText=JSON.stringify(await newHost.json());assert.ok(!newHostText.includes(newSecret));assert.ok(!newHostText.includes('new-fixture-user'));assert.ok(!newHostText.includes('password'));assert.ok(!newHostText.includes('username'));
 const afterHost=db.prepare('SELECT * FROM camera_connections WHERE camera_id=?').get('cam-a'),hostConfig=openConnection(key,{id:'cam-a',org_id:a.orgId},afterHost.secret);
 assert.equal(afterHost.version,4);assert.equal(hostConfig.host,'192.168.1.65');assert.equal(hostConfig.password,newSecret);
 const secondSecret=randomBytes(24).toString('hex'),newPort=await request('/api/cameras/cam-a/connection','POST',{...config,port:8554,username:'port-user',password:secondSecret,version:4},admin);
 assert.equal(newPort.status,200);assert.deepEqual(await newPort.json(),{ok:true});
 const afterPort=db.prepare('SELECT * FROM camera_connections WHERE camera_id=?').get('cam-a'),portConfig=openConnection(key,{id:'cam-a',org_id:a.orgId},afterPort.secret);
 assert.equal(afterPort.version,5);assert.equal(portConfig.host,'192.168.1.64');assert.equal(portConfig.port,8554);assert.equal(portConfig.password,secondSecret);
});
