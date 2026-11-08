import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('Players independentes são encerrados por chave ou ao sair da página',async()=>{
  let unload;const revoked=[];
  class Source extends EventTarget {static isTypeSupported(){return true}}
  const window={MediaSource:Source,addEventListener:(name,fn)=>{if(name==='pagehide')unload=fn}};
  const context={window,AbortController,DOMException,setTimeout,clearTimeout,URL:{createObjectURL:()=>String(Math.random()),revokeObjectURL:url=>revoked.push(url)}};
  vm.runInNewContext(readFileSync(new URL('../web/live-player.js',import.meta.url),'utf8'),context);
  const video=()=>({pause(){this.paused=true},removeAttribute(){},load(){this.cleared=true}});
  const a=video(),b=video(),c=video(),player=window.InvictusLive;
  const first=player.start({key:'a',video:a,status:{}});
  const second=player.start({key:'b',video:b,status:{}});
  assert.equal(player.players.size,2);
  const replacement=player.start({key:'a',video:c,status:{}});
  await first;assert.equal(a.cleared,true);assert.equal(b.cleared,undefined);
  assert.equal(player.players.size,2);
  player.stop('a');await replacement;assert.equal(c.cleared,true);assert.equal(player.players.size,1);
  unload();await second;assert.equal(b.cleared,true);assert.equal(player.players.size,0);assert.equal(revoked.length,3);
});
