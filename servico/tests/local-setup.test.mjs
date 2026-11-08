import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase,verifyPassword} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {VideoGateway} from '../server/video-gateway.mjs';
import {createLocalSetup,localSettings} from '../server/local-setup.mjs';
import {openConnection} from '../server/camera-secrets.mjs';

test('Primeiro acesso cria o ambiente uma única vez e guarda a configuração protegida',async t=>{
  const db=openDatabase(':memory:'),key=randomBytes(32),token=randomBytes(32).toString('hex'),gateway=new VideoGateway();
  const setup=createLocalSetup({db,key,gateway,token});
  const server=await createApp({db,origin:'http://127.0.0.1:8087',localSetup:setup});
  server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
  const password=randomBytes(16).toString('hex'),dvrPassword=randomBytes(16).toString('hex');
  const data={name:'Tiago Teste',email:'teste@example.test',password,confirm:password,dvrUsername:'operador',dvrPassword};
  async function req(method='GET',body,setupToken=token,origin='http://127.0.0.1:8087') {
    return fetch(base+'/api/local-setup',{method,headers:{Origin:origin,'Content-Type':'application/json','X-Setup-Token':setupToken},...(body?{body:JSON.stringify(body)}:{})});
  }
  await t.test('exige token local e origem correta',async()=>{
    assert.equal((await req('GET',null,'')).status,403);
    assert.equal((await req('GET',null,'é'.repeat(64))).status,403);
    assert.equal((await req('POST',data,token,'https://outro.example')).status,403);
    assert.equal((await req()).status,200);
  });
  await t.test('falhas de validação não deixam cadastros parciais',async()=>{
    assert.equal((await req('POST',{...data,confirm:'diferente'})).status,400);
    assert.equal((await req('POST',{...data,dvrPassword:''})).status,400);
    assert.equal(db.prepare('SELECT count(*) AS n FROM organizations').get().n,0);
  });
  await t.test('cria conta, local e canal com senha derivada e segredo criptografado',async()=>{
    const r=await req('POST',data);assert.equal(r.status,201);assert.deepEqual(await r.json(),{company:'invictus',email:data.email});
    const u=db.prepare('SELECT * FROM users').get();assert.ok(await verifyPassword(password,u.password_hash));
    const c=db.prepare('SELECT * FROM cameras').get(),row=db.prepare('SELECT * FROM camera_connections').get();
    assert.ok(!row.secret.includes(dvrPassword));
    const cfg=openConnection(key,c,row.secret);assert.equal(cfg.host,'192.168.1.64');assert.equal(cfg.port,554);assert.equal(cfg.channel,1);assert.equal(cfg.password,dvrPassword);
    assert.deepEqual(localSettings(db),[{clientId:c.client_id,address:'192.168.1.64:554'}]);
    assert.ok(gateway.endpoints.has(c.client_id+'|192.168.1.64:554'));
  });
  await t.test('bloqueia a repetição da instalação',async()=>{
    assert.equal((await req('POST',data)).status,409);
    assert.equal((await req()).status,409);
    assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);
  });
});
test('Token de instalação expira e primeiro acesso não pode ser exposto em produção',async()=>{
  const db=openDatabase(':memory:'),key=randomBytes(32),token=randomBytes(32).toString('hex'),gateway=new VideoGateway();
  try {
    let time=0;const setup=createLocalSetup({db,key,gateway,token,now:()=>time});time=3600001;
    assert.throws(()=>setup.status(token),/expirou/);
    await assert.rejects(createApp({db,origin:'https://example.test',secureCookies:true,localSetup:setup}),/somente/);
  }finally{db.close()}
});
