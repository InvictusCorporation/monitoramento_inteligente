import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function setup(response,range){
  const timers=new Map();let next=0,source,calls=0,clock=0,unauthorized=0;
  class Source extends EventTarget{constructor(){super();source=this}static isTypeSupported(){return true}addSourceBuffer(){const b=new EventTarget();b.buffered=range?{length:1,start:()=>range[0],end:()=>range[1]}:{length:0};b.appendBuffer=()=>queueMicrotask(()=>b.dispatchEvent(new Event('updateend')));return b}}
  const window={MediaSource:Source,addEventListener(){}};
  const video=new EventTarget();Object.defineProperty(video,'src',{set(){queueMicrotask(()=>source.dispatchEvent(new Event('sourceopen')))}});Object.assign(video,{pause(){},removeAttribute(){},load(){},currentTime:0});
  vm.runInNewContext(readFileSync(new URL('../web/live-player.js',import.meta.url),'utf8'),{window,AbortController,DOMException,Date:{now:()=>clock},setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id},clearTimeout:id=>timers.delete(id),URL:{createObjectURL:()=>''+next,revokeObjectURL(){}},fetch:async()=>{calls++;return response(()=>{clock+=301000})}});
  const status={},options={key:'camera',video,status,url:'/live',csrf:'fixture',onUnauthorized:()=>unauthorized++};
  return {player:window.InvictusLive,timers,status,options,calls:()=>calls,unauthorized:()=>unauthorized};
}
test('Falhas temporárias usam espera crescente e parar cancela a reconexão pendente',async()=>{
  const h=setup(()=>({ok:false,status:503,json:async()=>({error:'Indisponível'})}));
  await h.player.start(h.options);assert.equal([...h.timers.values()][0].ms,2000);assert.equal(h.player.players.size,1);
  h.player.stop();assert.equal(h.timers.size,0);assert.equal(h.player.players.size,0);
  await h.player.start({...h.options,retryAttempt:3});assert.equal([...h.timers.values()][0].ms,16000);h.player.stop();
  await h.player.start({...h.options,retryAttempt:6});assert.equal(h.timers.size,0);assert.match(h.status.textContent,/Reconectar/);
});
test('Entrada tardia começa no trecho disponível mesmo quando a distância é menor que oito segundos',async()=>{
  const h=setup(()=>{let n=0;return {ok:true,body:{getReader:()=>({cancel:async()=>{},read:async()=>n++?{done:true}:{done:false,value:new Uint8Array([1])}})}}},[3,4]);
  await h.player.start(h.options);assert.equal(h.options.video.currentTime,3);h.player.stop();
});
test('Sem sessão, sem permissão ou sem capacidade não dispara reconexões automáticas',async()=>{
  for(const status of [401,403,404,409,429]){const h=setup(()=>({ok:false,status,json:async()=>({error:'Bloqueado'})}));await h.player.start(h.options);assert.equal(h.timers.size,0);assert.equal(h.player.players.size,0);assert.equal(h.unauthorized(),status===401?1:0)}
});
test('Fluxo longo encerrado renova conexão sem esgotar tentativas de falha',async()=>{
  const h=setup(advance=>{let n=0;return {ok:true,status:200,body:{getReader:()=>({cancel:async()=>{},read:async()=>{if(n++===0){advance();return {done:false,value:new Uint8Array([1])}}return {done:true}}})}}});
  await h.player.start({...h.options,retryAttempt:6});assert.equal([...h.timers.values()][0].ms,2000);assert.match(h.status.textContent,/Reconectando/);h.player.stop();assert.equal(h.timers.size,0);
});
