import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { openDatabase, createOrganization } from '../server/database.mjs';
import { createApp } from '../server/app.mjs';

test('Autenticação, isolamento e fluxos da API HTTP', async t => {
  const db = openDatabase(':memory:');
  const password = randomBytes(24).toString('hex');
  const a = await createOrganization(db,{name:'Empresa A',slug:'empresa-a',adminName:'Admin A',email:'admin@example.test',password});
  const b = await createOrganization(db,{name:'Empresa B',slug:'empresa-b',adminName:'Admin B',email:'admin@example.test',password});
  let time = Date.now();
  const origin='http://127.0.0.1:8087';
  const server=await createApp({db,origin,now:()=>time});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
  async function req(path,method='GET',body,auth={},headers={}) {
    const response=await fetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth.cookie?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();return {status:response.status,data,headers:response.headers};
  }
  async function login(company,email='admin@example.test',pass=password) {
    const r=await req('/api/login','POST',{company,email,password:pass});assert.equal(r.status,200);
    return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:r.data.csrf,user:r.data.user};
  }
  let adminA,adminB,clientOne,operator,client1,client2,clientB,camera1,camera2,cameraB,clientUserId;
  await t.test('recusa acesso anônimo e não expõe arquivos do servidor',async()=>{
    for(const path of ['/api/state','/api/users','/api/audit'])assert.equal((await req(path)).status,401);
    for(const path of ['/data/monitoramento.sqlite','/server/app.mjs','/.env'])assert.equal((await req(path)).status,404);
    const response=await fetch(base+'/');assert.equal(response.status,200);assert.match(await response.text(),/Acesse seu ambiente/);
    assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  });
  await t.test('senhas são derivadas, login inválido é genérico e cookies não expõem o hash',async()=>{
    const invalid=await req('/api/login','POST',{company:'empresa-a',email:'admin@example.test',password:'incorreta'});
    const absent=await req('/api/login','POST',{company:'ausente',email:'admin@example.test',password:'incorreta'});
    assert.equal(invalid.status,401);assert.deepEqual(invalid.data,absent.data);
    adminA=await login('empresa-a');adminB=await login('empresa-b');
    assert.equal(adminA.user.role,'admin');assert.equal(adminA.user.password_hash,undefined);
    const stored=db.prepare('SELECT password_hash FROM users WHERE id=?').get(a.userId).password_hash;
    assert.notEqual(stored,password);assert.match(stored,/^scrypt\$/);
    assert.notEqual(db.prepare('SELECT token_hash FROM sessions WHERE user_id=?').get(a.userId).token_hash,adminA.cookie.split('=')[1]);
    const r=await req('/api/login','POST',{company:'empresa-a',email:'admin@example.test',password});
    assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);
  });
  await t.test('protege mutações contra origem externa e CSRF ausente',async()=>{
    assert.equal((await req('/api/clients','POST',{name:'X'},adminA,{Origin:'https://externo.test'})).status,403);
    assert.equal((await req('/api/clients','POST',{name:'X'},adminA,{'X-CSRF-Token':''})).status,403);
    assert.equal((await req('/api/login','POST',{company:'empresa-a',email:'admin@example.test',password},{},{Origin:'https://externo.test'})).status,403);
  });
  await t.test('cadastros pertencem à empresa da sessão mesmo com org_id forjado',async()=>{
    const r1=await req('/api/clients','POST',{name:'Casa 1',org_id:b.orgId},adminA);assert.equal(r1.status,201);client1=r1.data.id;
    client2=(await req('/api/clients','POST',{name:'Casa 2'},adminA)).data.id;
    clientB=(await req('/api/clients','POST',{name:'Casa B'},adminB)).data.id;
    camera1=(await req('/api/cameras','POST',{name:'Portão 1',client:client1},adminA)).data.id;
    camera2=(await req('/api/cameras','POST',{name:'Portão 2',client:client2},adminA)).data.id;
    cameraB=(await req('/api/cameras','POST',{name:'Portão B',client:clientB},adminB)).data.id;
    const data=(await req('/api/state?org_id='+b.orgId,'GET',null,adminA)).data;
    assert.deepEqual(data.clients.map(x=>x.name),['Casa 1','Casa 2']);assert.equal(data.cameras.length,2);
    assert.equal((await req('/api/cameras','POST',{name:'Invasão',client:clientB},adminA)).status,404);
    assert.throws(()=>db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run('invalid',a.orgId,clientB,'invalid',new Date().toISOString()),/FOREIGN KEY/);
  });
  await t.test('cria contas limitadas e recusa vínculo com cliente de outra empresa',async()=>{
    assert.equal((await req('/api/users','POST',{name:'Outro',email:'other@example.test',password,role:'client',clientId:clientB},adminA)).status,404);
    const created=await req('/api/users','POST',{name:'Cliente 1',email:'client@example.test',password,role:'client',clientId:client1},adminA);
    assert.equal(created.status,201);clientUserId=created.data.id;
    assert.equal((await req('/api/users','POST',{name:'Operador',email:'operator@example.test',password,role:'operator'},adminA)).status,201);
    clientOne=await login('empresa-a','client@example.test');operator=await login('empresa-a','operator@example.test');
    const userList=await req('/api/users','GET',null,adminA);
    assert.equal(userList.data.users.length,3);assert.ok(userList.data.users.every(u=>!('password_hash' in u)));
  });
  await t.test('cliente só lê e cadastra câmeras no próprio local; não eleva privilégios',async()=>{
    const data=(await req('/api/state?client='+client2,'GET',null,clientOne)).data;
    assert.equal(data.installation.version,'0.44.0-dev.1');assert.ok(Number.isFinite(Date.parse(data.installation.startedAt)));assert.deepEqual(Object.keys(data.installation).sort(),['startedAt','version']);
    assert.deepEqual(data.clients.map(c=>c.id),[client1]);assert.deepEqual(data.cameras.map(c=>c.id),[camera1]);
    assert.equal((await req('/api/cameras','POST',{name:'Própria',client:client1},clientOne)).status,201);
    assert.equal((await req('/api/cameras','POST',{name:'Outro local',client:client2},clientOne)).status,404);
    for(const [path,method,payload] of [['/api/users','GET'],['/api/audit','GET'],['/api/clients','POST',{name:'X'}],['/api/brand','PATCH',{brand:'X'}],['/api/users','POST',{role:'admin'}]]) {
      assert.equal((await req(path,method,payload,clientOne)).status,403,path);
    }
    assert.equal((await req('/api/users/'+a.userId,'PATCH',{active:false},clientOne)).status,403);
  });
  await t.test('operador gerencia câmeras da empresa sem administrar usuários',async()=>{
    assert.equal((await req('/api/state','GET',null,operator)).data.clients.length,2);
    assert.equal((await req('/api/cameras','POST',{name:'Operador',client:client2},operator)).status,201);
    assert.equal((await req('/api/users','GET',null,operator)).status,403);
    assert.equal((await req('/api/cameras','POST',{name:'Outra empresa',client:clientB},operator)).status,404);
  });
  await t.test('eventos têm isolamento, finalização justificada e controle de concorrência',async()=>{
    const insert=db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)');
    insert.run('e1',a.orgId,camera1,'Evento 1','Alta','Regra 1',new Date().toISOString());
    insert.run('e2',a.orgId,camera2,'Evento 2','Baixa','Regra 2',new Date().toISOString());
    insert.run('eb',b.orgId,cameraB,'Evento B','Alta','Regra B',new Date().toISOString());
    assert.deepEqual((await req('/api/state','GET',null,clientOne)).data.events.map(e=>e.id),['e1']);
    const payload={status:'Finalizada',note:'Verificação realizada',version:1};
    assert.equal((await req('/api/events/e2','PATCH',payload,clientOne)).status,404);
    assert.equal((await req('/api/events/eb','PATCH',payload,adminA)).status,404);
    assert.equal((await req('/api/events/e1','PATCH',{...payload,note:' '},adminA)).status,400);
    assert.equal((await req('/api/events/e1','PATCH',payload,clientOne)).status,200);
    assert.equal((await req('/api/events/e1','PATCH',{...payload,note:'Sobrescrever'},adminA)).status,409);
    assert.equal(db.prepare('SELECT note FROM events WHERE id=?').get('e1').note,'Verificação realizada');
  });
  await t.test('auditoria não mistura empresas e mudanças são registradas',async()=>{
    const data=(await req('/api/audit','GET',null,adminA)).data.entries;
    assert.ok(data.some(e=>e.action==='event.updated'));
    assert.ok(!data.some(e=>e.actor==='Admin B'));
    assert.equal((await req('/api/users/'+b.userId,'PATCH',{active:false},adminA)).status,404);
    assert.equal((await req('/api/users/'+a.userId,'PATCH',{active:false},adminA)).status,400);
  });
  await t.test('Renomear preserva vínculos e impede conflito e acesso a outro local/empresa',async()=>{
    const prior=db.prepare('SELECT name FROM cameras WHERE id=?').get(camera1).name;
    const body={name:'Portão principal',previousName:prior};
    assert.equal((await req('/api/cameras/'+cameraB+'/name','PATCH',body,adminA)).status,404);
    assert.equal((await req('/api/cameras/'+camera2+'/name','PATCH',body,clientOne)).status,404);
    assert.equal((await req('/api/cameras/'+camera1+'/name','PATCH',body,clientOne,{'X-CSRF-Token':'bad'})).status,403);
    assert.equal((await req('/api/cameras/'+camera1+'/name','PATCH',{...body,name:' '},clientOne)).status,400);
    assert.equal((await req('/api/cameras/'+camera1+'/name','PATCH',body,clientOne)).status,200);
    assert.equal((await req('/api/cameras/'+camera1+'/name','PATCH',{...body,name:'Nome antigo'},adminA)).status,409);
    assert.equal(db.prepare('SELECT client_id FROM cameras WHERE id=?').get(camera1).client_id,client1);
    assert.equal(db.prepare("SELECT camera_id FROM events WHERE id='e1'").get().camera_id,camera1);
    const old=db.prepare('SELECT name FROM clients WHERE id=?').get(client1).name;
    assert.equal((await req('/api/clients/'+client1+'/name','PATCH',{name:'Residência',previousName:old},operator)).status,403);
    assert.equal((await req('/api/clients/'+client1+'/name','PATCH',{name:'Residência',previousName:old},adminA)).status,200);
    assert.equal(db.prepare('SELECT client_id FROM users WHERE id=?').get(clientUserId).client_id,client1);
  });
  await t.test('desativação revoga sessões e impede novo login',async()=>{
    assert.equal((await req('/api/users/'+clientUserId,'PATCH',{active:false},adminA)).status,200);
    assert.equal((await req('/api/state','GET',null,clientOne)).status,401);
    assert.equal((await req('/api/login','POST',{company:'empresa-a',email:'client@example.test',password})).status,401);
    assert.equal((await req('/api/users/'+clientUserId,'PATCH',{active:true},adminA)).status,200);
    assert.equal((await req('/api/state','GET',null,clientOne)).status,401);
  });
  await t.test('troca de senha revoga sessões e logout invalida o cookie',async()=>{
    const fresh=await login('empresa-a','client@example.test');const newPassword=randomBytes(24).toString('hex');
    assert.equal((await req('/api/password','POST',{current:password,password:newPassword},fresh)).status,200);
    assert.equal((await req('/api/state','GET',null,fresh)).status,401);
    assert.equal((await req('/api/login','POST',{company:'empresa-a',email:'client@example.test',password})).status,401);
    const newSession=await login('empresa-a','client@example.test',newPassword);
    assert.equal((await req('/api/logout','POST',{},newSession)).status,200);
    assert.equal((await req('/api/state','GET',null,newSession)).status,401);
  });
  await t.test('Redefinição administrativa exige senha atual, isola empresa e revoga sessões sem reativar conta',async()=>{
    const created=await req('/api/users','POST',{name:'Reset',email:'reset@example.test',password,role:'operator'},adminA);
    assert.equal(created.status,201);
    const id=db.prepare("SELECT id FROM users WHERE email='reset@example.test'").get().id;
    const active=await login('empresa-a','reset@example.test');
    const newPassword=randomBytes(24).toString('hex'),path='/api/users/'+id+'/password';
    assert.equal((await req(path,'POST',{current:password,password:newPassword},operator)).status,403);
    assert.equal((await req(path,'POST',{current:password,password:newPassword},adminB)).status,404);
    assert.equal((await req(path,'POST',{current:'wrong',password:newPassword},adminA)).status,400);
    assert.equal((await req(path,'POST',{current:password,password:'short'},adminA)).status,400);
    assert.equal((await req(path,'POST',{current:password,password:newPassword},adminA,{'X-CSRF-Token':'bad'})).status,403);
    const success=await req(path,'POST',{current:password,password:newPassword},adminA);assert.equal(success.status,200);assert.deepEqual(success.data,{ok:true});
    assert.equal((await req('/api/state','GET',null,active)).status,401);
    assert.equal((await req('/api/login','POST',{company:'empresa-a',email:'reset@example.test',password})).status,401);
    const pending=await login('empresa-a','reset@example.test',newPassword);assert.equal(pending.user.passwordChangeRequired,true);
    for(const path of ['/api/state','/api/diagnostics','/api/alerts','/api/events/e1/history'])assert.equal((await req(path,'GET',null,pending)).status,403);
    assert.equal((await req('/api/password','POST',{current:newPassword,password:newPassword},pending)).status,400);
    const ownPassword=randomBytes(24).toString('hex');assert.equal((await req('/api/password','POST',{current:newPassword,password:ownPassword},pending)).status,200);
    assert.equal((await req('/api/session','GET',null,pending)).status,401);
    const unlocked=await login('empresa-a','reset@example.test',ownPassword);assert.equal(unlocked.user.passwordChangeRequired,false);assert.equal((await req('/api/state','GET',null,unlocked)).status,200);
    db.prepare('UPDATE users SET active=0 WHERE id=?').run(id);
    assert.equal((await req(path,'POST',{current:password,password:newPassword},adminA)).status,200);
    assert.equal(db.prepare('SELECT active FROM users WHERE id=?').get(id).active,0);
    assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='user.password.reset' AND target_id=?").get(id).n,2);
    assert.equal((await req('/api/users/'+adminA.user.id+'/password','POST',{current:password,password:newPassword},adminA)).status,400);
  });
  await t.test('Cada conta consulta e encerra somente suas outras sessões com CSRF',async()=>{
    const first=await login('empresa-a'),second=await login('empresa-a');
    assert.equal((await req('/api/sessions')).status,401);
    const data=(await req('/api/sessions','GET',null,first)).data;
    assert.ok(data.active>=2);assert.equal(data.other,data.active-1);assert.deepEqual(Object.keys(data).sort(),['active','currentExpiresAt','other']);
    assert.equal((await req('/api/sessions/revoke-others','POST',{},first,{'X-CSRF-Token':'bad'})).status,403);
    const ended=await req('/api/sessions/revoke-others','POST',{userId:adminB.user.id},first);assert.equal(ended.status,200);assert.ok(ended.data.revoked>=1);
    assert.equal((await req('/api/session','GET',null,second)).status,401);
    assert.equal((await req('/api/session','GET',null,first)).status,200);
    assert.equal((await req('/api/session','GET',null,adminB)).status,200);
    assert.equal((await req('/api/sessions','GET',null,first)).data.other,0);
    assert.equal((await req('/api/sessions/revoke-others','POST',{},first)).data.revoked,0);
    adminA=first;
  });
  await t.test('sessão expira após oito horas',async()=>{
    time+=8*3600000+1;assert.equal((await req('/api/state','GET',null,adminB)).status,401);
  });
  await t.test('limite de tentativas de login é aplicado',async()=>{
    for(let i=0;i<10;i++)assert.equal((await req('/api/login','POST',{company:'empresa-a',email:'limit@example.test',password:'wrong'})).status,401);
    assert.equal((await req('/api/login','POST',{company:'empresa-a',email:'limit@example.test',password:'wrong'})).status,429);
  });
});

test('Banco persiste entre reinícios e a migração é idempotente',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'invictus-test-')),path=join(dir,'test.sqlite');
  let db=openDatabase(path);
  try {
    await createOrganization(db,{name:'Persistente',slug:'persistente',adminName:'Admin',email:'admin@example.test',password:randomBytes(24).toString('hex')});
    db.close();db=openDatabase(path);
    assert.equal(db.prepare('SELECT count(*) AS n FROM organizations').get().n,1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n,16);
  } finally {db.close();rmSync(dir,{recursive:true,force:true})}
});
