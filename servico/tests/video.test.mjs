import {SharedVideoGateway} from '../server/shared-video-gateway.mjs';
import {Mp4Fragments} from '../server/mp4-fragments.mjs';
import {readFileSync} from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { PassThrough } from 'node:stream';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, createOrganization } from '../server/database.mjs';
import { createApp } from '../server/app.mjs';
import { sealConnection, openConnection, loadCameraKey } from '../server/camera-secrets.mjs';
import { parseEndpoints, validateConnection, ffmpegArgs, rtspUrl, VideoGateway } from '../server/video-gateway.mjs';

async function drained(reader){while(!(await reader.read()).done){}return true}

const config={host:'192.168.20.10',port:554,path:'/canal/1',username:'usuario',password:'senha-de-teste'};
const endpointsFor=id=>parseEndpoints(JSON.stringify([{clientId:id,address:'192.168.20.10:554'}]));
function fakeSpawn({silent=false,fail=false}={}) {
  const children=[];
  const run=(executable,args,options)=>{
    const child=new EventEmitter();child.stdout=new PassThrough();child.killed=false;
    child.kill=()=>{if(child.killed)return true;child.killed=true;setImmediate(()=>child.emit('close',0));return true};
    children.push({child,executable,args,options});
    setImmediate(()=>{if(fail){child.emit('error',Error('URL e senha que nunca podem chegar à resposta'));child.emit('close',1)}else if(!silent&&!child.killed)child.stdout.write(readFileSync(new URL('./fixtures/shared-video.mp4',import.meta.url)))});
    return child;
  };
  return {children,run};
}

test('Criptografia vincula o segredo à câmera e à empresa',()=>{
  const key=randomBytes(32),camera={id:'camera-1',org_id:'empresa-1'};
  const sealed=sealConnection(key,camera,config);
  assert.ok(!sealed.includes(config.password));assert.ok(!sealed.includes(config.host));
  assert.deepEqual(openConnection(key,camera,sealed),config);
  assert.throws(()=>openConnection(key,{...camera,id:'camera-2'},sealed));
  assert.throws(()=>openConnection(key,{...camera,org_id:'empresa-2'},sealed));
  assert.throws(()=>openConnection(randomBytes(32),camera,sealed));
  const tampered=JSON.parse(sealed);tampered.tag=Buffer.alloc(16).toString('base64');
  assert.throws(()=>openConnection(key,camera,JSON.stringify(tampered)));
});
test('Chave é persistida e não é recriada quando há conexões existentes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'invictus-key-test-')),path=join(dir,'camera.key');
  try{assert.throws(()=>loadCameraKey(path,{allowCreate:false}),/ausente/);const key=loadCameraKey(path);assert.equal(key.length,32);assert.deepEqual(loadCameraKey(path),key)}
  finally{rmSync(dir,{recursive:true,force:true})}
});
test('Destinos são validados por local; protocolos e argumentos ficam limitados',()=>{
  const endpoints=endpointsFor('local-1');
  assert.deepEqual(validateConnection(config,endpoints,'local-1'),config);
  assert.throws(()=>validateConnection(config,endpoints,'local-2'),/este local/);
  for(const host of ['127.0.0.1','169.254.169.254','0.0.0.0','224.0.0.1','localhost','example.com','::1']) {
    assert.throws(()=>validateConnection({...config,host},endpoints,'local-1'));
  }
  for(const path of ['file:///etc/passwd','//outro-host/video','/canal\nabc','/x\\y'])assert.throws(()=>validateConnection({...config,path},endpoints,'local-1'));
  assert.throws(()=>validateConnection({...config,port:80},endpoints,'local-1'));
  const url=rtspUrl({...config,username:'a@b',password:'x:/ y'});
  assert.match(url,/a%40b:x%3A%2F%20y@192/);
  const args=ffmpegArgs(config);assert.equal(args[args.indexOf('-rtsp_transport')+1],'tcp');assert.ok(args.includes('libx264'));assert.equal(args.at(-1),'pipe:1');
  assert.throws(()=>parseEndpoints('["192.168.20.10:554"]'));
});
test('Gateway limita processos, interrompe por revogação e libera a capacidade',async()=>{
  const fake=fakeSpawn(),gateway=new VideoGateway({executable:'fake',checkExecutable:false,endpoints:endpointsFor('l1'),spawnProcess:fake.run,maxStreams:1,leaseMs:10});
  let allowed=true;
  const opts={owner:'u1',cameraId:'c1',clientId:'l1',authorize:()=>allowed};
  const job=gateway.start(config,opts);await job.ready;
  assert.equal(fake.children[0].options.shell,false);assert.equal(fake.children[0].options.windowsHide,true);
  assert.deepEqual(fake.children[0].options.stdio,['ignore','pipe','ignore']);
  assert.throws(()=>gateway.start(config,{...opts,owner:'u2'}),/Limite/);
  allowed=false;await delay(50);assert.equal(fake.children[0].child.killed,true);assert.equal(gateway.active.size,0);
  gateway.close();
});
test('Mosaico permite quatro canais, bloqueia duplicatas e libera todos ao sair',async()=>{
  const fake=fakeSpawn(),gateway=new VideoGateway({executable:'fake',checkExecutable:false,endpoints:endpointsFor('l1'),spawnProcess:fake.run});
  const opts={owner:'u1',clientId:'l1',authorize:()=>true};
  try {
    const first=gateway.start(config,{...opts,cameraId:'c0'});await first.ready;
    assert.throws(()=>gateway.start(config,{...opts,cameraId:'c0'}),/Limite/);
    for(let i=1;i<4;i++)await gateway.start(config,{...opts,cameraId:'c'+i}).ready;
    assert.equal(gateway.active.size,4);
    assert.throws(()=>gateway.start(config,{...opts,owner:'u2',cameraId:'c4'}),/Limite/);
    gateway.stopOwner('u1');await delay(30);
    assert.equal(gateway.active.size,0);
    assert.ok(fake.children.every(x=>x.child.killed));
    await gateway.start(config,{...opts,cameraId:'c0'}).ready;
  }finally{gateway.close()}
});

test('Gateway falha de modo controlado sem mídia e sem expor mensagens do processo',async()=>{
  const silent=fakeSpawn({silent:true}),gateway=new VideoGateway({executable:'fake',checkExecutable:false,endpoints:endpointsFor('l1'),spawnProcess:silent.run,startupMs:15});
  const pending=gateway.start(config,{owner:'u',cameraId:'c',clientId:'l1',authorize:()=>true}).ready;
  const rejection=assert.rejects(pending,/tempo esperado/);await delay(30);await rejection;gateway.close();
  const failed=fakeSpawn({fail:true}),broken=new VideoGateway({executable:'fake',checkExecutable:false,endpoints:endpointsFor('l1'),spawnProcess:failed.run});
  await assert.rejects(broken.start(config,{owner:'u',cameraId:'c',clientId:'l1',authorize:()=>true}).ready,error=>!error.message.includes('senha')&&error.status===502);
  broken.close();
  assert.throws(()=>new VideoGateway().start(config,{owner:'u',cameraId:'c',clientId:'l1',authorize:()=>true}),/não foi habilitada/);
});

for(const Gateway of [VideoGateway,SharedVideoGateway])test('Integração HTTP com '+Gateway.name,async t=>{
  const db=openDatabase(':memory:'),password=randomBytes(24).toString('hex'),key=randomBytes(32);
  const orgA=await createOrganization(db,{name:'A',slug:'empresa-a',adminName:'Admin A',email:'a@example.test',password});
  const orgB=await createOrganization(db,{name:'B',slug:'empresa-b',adminName:'Admin B',email:'b@example.test',password});
  db.prepare('INSERT INTO clients VALUES(?,?,?)').run('local-a',orgA.orgId,'Casa A');
  db.prepare('INSERT INTO clients VALUES(?,?,?)').run('local-b',orgB.orgId,'Casa B');
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('cam-a',orgA.orgId,'local-a','Câmera A',new Date().toISOString());
  db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('cam-b',orgB.orgId,'local-b','Câmera B',new Date().toISOString());
  const fake=fakeSpawn(),gateway=new Gateway({executable:'fake',checkExecutable:false,endpoints:endpointsFor('local-a'),spawnProcess:fake.run,leaseMs:20});
  const origin='http://127.0.0.1:8087',server=await createApp({db,origin,cameraKey:key,videoGateway:gateway});
  server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{gateway.close();await new Promise(resolve=>server.close(resolve));db.close()});
  async function request(path,method='GET',body,auth={}) {
    return fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth.cookie?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{})},...(body&&method!=='GET'?{body:JSON.stringify(body)}:{})});
  }
  async function login(company,email) {
    const r=await request('/api/login','POST',{company,email,password});assert.equal(r.status,200);const d=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:d.csrf};
  }
  const a=await login('empresa-a','a@example.test'),b=await login('empresa-b','b@example.test');let own,op,clientUser;
  await t.test('salva criptografado e devolve somente metadados redigidos',async()=>{
    const saved=await request('/api/cameras/cam-a/connection','POST',{...config,version:0},a);assert.equal(saved.status,200);
    const row=db.prepare('SELECT secret FROM camera_connections WHERE camera_id=?').get('cam-a');assert.ok(!row.secret.includes(config.password));
    const meta=await(await request('/api/cameras/cam-a/connection','GET',null,a)).json();
    assert.equal(meta.configured,true);assert.equal(meta.version,1);assert.equal(meta.password,undefined);assert.equal(meta.username,undefined);assert.equal(meta.path,undefined);
    const state=await(await request('/api/state','GET',null,a)).json();assert.equal(state.cameras[0].connectionStatus,'configured');assert.ok(!JSON.stringify(state).includes(config.password));
  });
  await t.test('não permite obter, alterar, testar ou assistir câmeras de outra empresa',async()=>{
    for(const [action,method] of [['connection','GET'],['connection','POST'],['test','POST'],['live','POST']])assert.equal((await request('/api/cameras/cam-a/'+action,method,{...config,version:1},b)).status,404);
    assert.equal((await request('/api/cameras/cam-b/connection','POST',{...config,version:0},b)).status,400);
    assert.equal((await request('/api/cameras/cam-a/live','POST')).status,401);
    assert.equal(fake.children.length,0);
  });
  await t.test('cliente configura o próprio local e operador apenas consulta',async()=>{
    const cr=await request('/api/users','POST',{name:'Cliente',email:'cliente@example.test',role:'client',clientId:'local-a',password},a);clientUser=(await cr.json()).id;
    await request('/api/users','POST',{name:'Operador',email:'operador@example.test',role:'operator',password},a);
    own=await login('empresa-a','cliente@example.test');op=await login('empresa-a','operador@example.test');
    assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,version:1},own)).status,200);
    assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,version:2},op)).status,403);
    assert.equal((await request('/api/cameras/cam-a/connection','GET',null,op)).status,200);
    assert.equal((await request('/api/cameras/cam-b/connection','GET',null,own)).status,404);
  });
  await t.test('controle de versão, desabilitação e validação de destino são aplicados',async()=>{
    assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,version:0},a)).status,409);
    assert.equal((await request('/api/cameras/cam-a/connection','POST',{...config,host:'169.254.169.254',version:2},a)).status,400);
    assert.equal((await request('/api/cameras/cam-a/connection','PATCH',{enabled:false,version:2},a)).status,200);
    assert.equal((await request('/api/cameras/cam-a/live','POST',null,a)).status,409);
    assert.equal((await request('/api/cameras/cam-a/connection','PATCH',{enabled:true,version:3},a)).status,200);
  });
  await t.test('teste de conexão finaliza o processo e registra auditoria',async()=>{
    const r=await request('/api/cameras/cam-a/test','POST',null,a);assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
    await delay(10);assert.equal(fake.children.at(-1).child.killed,true);
    assert.equal(db.prepare("SELECT count(*) AS n FROM audit WHERE action='camera.tested'").get().n,1);
  });
  await t.test('vídeo exige CSRF e é encerrado quando o usuário sai',async()=>{
    const noCsrf=await request('/api/cameras/cam-a/live','POST',null,{...a,csrf:''});assert.equal(noCsrf.status,403);
    const r=await request('/api/cameras/cam-a/live','POST',null,a);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'video/mp4');
    const reader=r.body.getReader();assert.ok((await reader.read()).value.length>0);
    assert.equal((await request('/api/logout','POST',{},a)).status,200);
    await delay(10);assert.equal(fake.children.at(-1).child.killed,true);assert.equal(await drained(reader),true);
  });
  await t.test('desativar usuário encerra sua transmissão já aberta',async()=>{
    const r=await request('/api/cameras/cam-a/live','POST',null,own);assert.equal(r.status,200);
    const reader=r.body.getReader();await reader.read();const admin=await login('empresa-a','a@example.test');
    assert.equal((await request('/api/users/'+clientUser,'PATCH',{active:false},admin)).status,200);
    await delay(10);assert.equal(await drained(reader),true);assert.equal(fake.children.at(-1).child.killed,true);
  });
  await t.test('fechar o player encerra o processo; configuração também encerra transmissão',async()=>{
    const r=await request('/api/cameras/cam-a/live','POST',null,op);const reader=r.body.getReader();await reader.read();await reader.cancel();
    await delay(30);assert.equal(fake.children.at(-1).child.killed,true);
    const r2=await request('/api/cameras/cam-a/live','POST',null,op);const reader2=r2.body.getReader();await reader2.read();
    const admin=await login('empresa-a','a@example.test');await request('/api/cameras/cam-a/connection','POST',{...config,version:4},admin);
    assert.equal(await drained(reader2),true);
  });
  if(Gateway===SharedVideoGateway)await t.test('sair de uma sessão preserva o HTTP do outro operador',async()=>{
    const admin=await login('empresa-a','a@example.test');
    const first=await request('/api/cameras/cam-a/live','POST',null,admin);
    const reader=first.body.getReader();await reader.read();
    const count=fake.children.length,child=fake.children.at(-1).child;
    const next=request('/api/cameras/cam-a/live','POST',null,op);
    for(let i=0;i<50&&gateway.viewerCount!==2;i++)await delay(10);
    assert.equal(gateway.viewerCount,2);
    const fragments=[];new Mp4Fragments((init,f)=>fragments.push(f)).push(readFileSync(new URL('./fixtures/shared-video.mp4',import.meta.url)));
    child.stdout.write(fragments.at(-1));
    const second=await next;assert.equal(second.status,200);const other=second.body.getReader();await other.read();
    assert.equal(fake.children.length,count);
    assert.equal((await request('/api/logout','POST',{},admin)).status,200);
    assert.equal(await drained(reader),true);assert.equal(child.killed,false);assert.equal(gateway.viewerCount,1);
    child.stdout.write(fragments.at(-1));assert.equal((await other.read()).done,false);
    await other.cancel();await delay(30);assert.equal(child.killed,true);
  });
});
