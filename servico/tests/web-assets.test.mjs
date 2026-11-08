import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {openDatabase} from '../server/database.mjs';
import {createApp} from '../server/app.mjs';

test('servidor entrega todos os scripts e estilos usados pela página inicial',async t=>{
  const db=openDatabase(':memory:');
  const server=await createApp({db,origin:'http://127.0.0.1:8087'});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));db.close()});
  const base='http://127.0.0.1:'+server.address().port;
  const html=await (await fetch(base+'/')).text();
  const scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
  const styles=[...html.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(scripts.includes('master.js'));
  for(const name of [...scripts,...styles]){
    const response=await fetch(base+'/'+name);
    assert.equal(response.status,200,name);
    assert.match(response.headers.get('content-type'),name.endsWith('.js')?/text\/javascript/:/text\/css/);
    assert.ok((await response.text()).length>0,name);
  }
});
