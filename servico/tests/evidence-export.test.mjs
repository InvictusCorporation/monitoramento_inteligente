import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';
import {evidenceFilename} from '../server/evidence-export.mjs';
test('Nome da evidência não permite caminhos ou injeção de cabeçalhos',()=>{
  const name=evidenceFilename('../Portão"\r\nX-Test: yes','2026-11-02T01:00:00-03:00','e');
  assert.match(name,/^invictus-Portao-X-Test-yes-2026-11-02T04-00-00-000Z-e.jpg$/);
  assert.equal(evidenceFilename('','bad',''),'invictus-camera-sem-data-ocorrencia.jpg');
});
test('Download preserva bytes, exige sessão, isola locais/empresas e audita solicitação',async t=>{
  const db=openDatabase(':memory:'),origin='http://127.0.0.1:8087';
  for(const o of ['o1','o2'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(o,o,o,o);
  for(const [id,o] of [['l1','o1'],['l2','o1'],['l3','o2']])db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,o,id);
  const image=Buffer.from([255,216,1,2,255,217]);
  for(const [id,o,l] of [['c1','o1','l1'],['c2','o1','l2'],['c3','o2','l3']]){
    db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(id,o,l,'Portão','2026-11-02');
    db.prepare('INSERT INTO events(id,org_id,camera_id,title,priority,rule,created_at) VALUES(?,?,?,?,?,?,?)').run(id,o,id,'Pessoa','Alta','Regra','2026-11-02T00:00:00Z');
    db.prepare('INSERT INTO event_evidence VALUES(?,?,?,?)').run(id,o,'2026-11-02',image);
  }
  db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run('u','o1','Cliente','u@example.com','unused','client','l1');
  const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),'u','csrf',Date.now()+60000);
  const server=await createApp({db,origin});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await server.stopMonitoring();await new Promise(r=>server.close(r));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const get=(id,cookie=true,suffix='?download=1')=>fetch(base+'/api/events/'+id+'/image'+suffix,{headers:cookie?{Cookie:'invictus_session='+token}:{}});
  assert.equal((await get('c1',false)).status,401);
  for(const id of ['c2','c3','missing'])assert.equal((await get(id)).status,404);
  const res=await get('c1');assert.equal(res.status,200);assert.match(res.headers.get('content-disposition'),/^attachment; filename="invictus-Portao-/);assert.match(res.headers.get('cache-control'),/no-store/);assert.equal(res.headers.get('content-type'),'image/jpeg');assert.deepEqual(Buffer.from(await res.arrayBuffer()),image);
  assert.match((await get('c1',true,'')).headers.get('content-disposition'),/^inline/);
  assert.equal(db.prepare("SELECT count(*) n FROM audit WHERE action='event.image.downloaded'").get().n,1);
  assert.equal(db.prepare('SELECT count(*) n FROM ai_usage').get().n,0);
  db.prepare("UPDATE users SET active=0 WHERE id='u'").run();assert.equal((await get('c1')).status,401);
});
