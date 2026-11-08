import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import {SharedVideoGateway} from '../server/shared-video-gateway.mjs';
import {parseEndpoints} from '../server/video-gateway.mjs';
import {Mp4Fragments} from '../server/mp4-fragments.mjs';
import {readFileSync} from 'node:fs';
const box=(type,payload='fixture')=>{const b=Buffer.alloc(8+Buffer.byteLength(payload));b.writeUInt32BE(b.length);b.write(type,4);b.write(payload,8);return b};
const init=Buffer.concat([box('ftyp'),box('moov')]);
const fragment=n=>Buffer.concat([box('moof',String(n)),box('mdat',String(n))]);
const config={host:'192.168.1.64',port:554,path:'/camera',username:'fixture',password:'fixture'};
const options={owner:'a',cameraId:'c',clientId:'l',orgId:'org',version:1,authorize:()=>true};

test('Conexão padrão atravessa seis minutos sem renovação forçada e ainda encerra por revogação',async t=>{
  t.mock.timers.enable({apis:['setTimeout','setInterval']});
  const {g,children,send}=harness({idleMs:1000000,leaseMs:1000});let allowed=true;
  try{
    const a=g.start(config,{...options,authorize:()=>allowed});send(Buffer.concat([init,fragment(1)]));const first=await a.ready;
    t.mock.timers.tick(360000);
    assert.equal(children[0].killed,false);assert.equal(first.stream.destroyed,false);assert.equal(g.viewerCount,1);
    send(fragment(2));assert.deepEqual(first.stream.read(),fragment(2));
    allowed=false;t.mock.timers.tick(1001);assert.equal(first.stream.destroyed,true);assert.equal(children[0].killed,true);
  }finally{g.close();t.mock.timers.reset()}
});
test('Vídeo sintético real do FFmpeg mantém quatro fragmentos íntegros com leitura fracionada',()=>{
  const input=readFileSync(new URL('./fixtures/shared-video.mp4',import.meta.url));
  const fragments=[];let initialization;
  const parser=new Mp4Fragments((i,f)=>{initialization=i;fragments.push(f)});
  for(let n=0;n<input.length;n+=137)parser.push(input.subarray(n,n+137));
  assert.equal(fragments.length,4);assert.ok(initialization.includes(Buffer.from('avcC')));
  const replay=[];const late=new Mp4Fragments((i,f)=>replay.push(f));late.push(Buffer.concat([initialization,...fragments.slice(2)]));
  assert.deepEqual(replay,fragments.slice(2));assert.equal(parser.pending.length,0);
});
function harness(extra={}){
  const children=[];
  const g=new SharedVideoGateway({executable:'fake',checkExecutable:false,endpoints:parseEndpoints('[{"clientId":"l","address":"192.168.1.64:554"},{"clientId":"l2","address":"192.168.1.64:554"}]'),leaseMs:10,...extra,spawnProcess:()=>{
    const child=new EventEmitter();child.stdout=new PassThrough();child.killed=false;
    child.kill=()=>{if(!child.killed){child.killed=true;setImmediate(()=>child.emit('close'))}return true};children.push(child);return child;
  }});
  return {g,children,send:(data,index=0)=>children[index].stdout.write(data)};
}
test('Parser recompõe cabeçalhos divididos e entrega somente fragmentos completos',()=>{
  const seen=[],p=new Mp4Fragments((i,f)=>seen.push([i,f]));
  for(const byte of Buffer.concat([init,fragment(1)]))p.push(Buffer.from([byte]));
  assert.equal(seen.length,1);assert.deepEqual(seen[0],[init,fragment(1)]);
  p.push(box('moof','2'));assert.equal(seen.length,1);p.push(box('mdat','2'));assert.equal(seen.length,2);
  for(const input of [Buffer.alloc(8),box('mdat'),box('moov')])assert.throws(()=>new Mp4Fragments(()=>{}).push(input));
  const huge=Buffer.alloc(8);huge.writeUInt32BE(3*1024*1024);assert.throws(()=>new Mp4Fragments(()=>{}).push(huge));
});
test('Duas contas usam um processo; entrada tardia recebe inicialização e próximo fragmento',async()=>{
  const {g,children,send}=harness();
  try{
    const a=g.start(config,options);send(Buffer.concat([init,fragment(1)]));const first=await a.ready;
    const b=g.start(config,{...options,owner:'b'});let opened=false;b.ready.then(()=>opened=true);
    send(box('moof','2'));await delay(5);assert.equal(opened,false);
    send(box('mdat','2'));const second=await b.ready;
    assert.deepEqual(second.first,Buffer.concat([init,fragment(2)]));assert.deepEqual(first.stream.read(),fragment(2));
    assert.equal(children.length,1);assert.equal(g.liveCount,1);assert.equal(g.viewerCount,2);
    g.stopOwner('a');assert.equal(children[0].killed,false);send(fragment(3));assert.deepEqual(second.stream.read(),fragment(3));
    b.stop();await delay(10);assert.equal(children[0].killed,true);assert.equal(g.liveCount,0);assert.equal(g.viewerCount,0);
  }finally{g.close()}
});
test('Revogação individual não encerra outra conta; configuração encerra ambas',async()=>{
  const {g,children,send}=harness();let allowed=true;
  try{
    const a=g.start(config,{...options,authorize:()=>allowed}),b=g.start(config,{...options,owner:'b'});
    send(Buffer.concat([init,fragment(1)]));const [ar,br]=await Promise.all([a.ready,b.ready]);
    allowed=false;await delay(30);assert.equal(ar.stream.destroyed,true);assert.equal(br.stream.destroyed,false);assert.equal(children[0].killed,false);
    g.stopCamera('c');await delay(10);assert.equal(br.stream.destroyed,true);assert.equal(g.liveCount,0);
  }finally{g.close()}
});
test('Empresa, local, câmera, versão e configuração nunca compartilham produtor diferente',async()=>{
  const {g,children,send}=harness({maxStreams:8});
  try{
    const variants=[{}, {orgId:'other'}, {clientId:'l2'}, {cameraId:'other'}, {version:2}, {changed:true}];
    for(const [n,v] of variants.entries()){
      const job=g.start(v.changed?{...config,path:'/other'}:config,{...options,...v,owner:'u'+n});
      send(Buffer.concat([init,fragment(1)]),n);await job.ready;
    }
    assert.equal(children.length,6);
    assert.throws(()=>g.start(config,{...options,owner:'denied',authorize:()=>false}),e=>e.status===401);assert.equal(children.length,6);
  }finally{g.close()}
});
test('Limites contam visualizações mesmo quando há um único processo',async()=>{
  const {g,children,send}=harness({maxStreams:2,maxStreamsPerOwner:1});
  try{
    const a=g.start(config,options);send(Buffer.concat([init,fragment(1)]));await a.ready;
    assert.throws(()=>g.start(config,{...options,cameraId:'other'}),e=>e.status===429);
    const b=g.start(config,{...options,owner:'b'});send(fragment(2));await b.ready;
    assert.throws(()=>g.start(config,{...options,owner:'third'}),e=>e.status===429);assert.equal(children.length,1);
  }finally{g.close()}
});
test('Consumidor lento é encerrado sem travar a entrega para outro',async()=>{
  const {g,children,send}=harness();g.maxViewerBuffer=80;
  try{
    const a=g.start(config,options),b=g.start(config,{...options,owner:'b'});send(Buffer.concat([init,fragment(1)]));
    const [slow,fast]=await Promise.all([a.ready,b.ready]);let bytes=0;fast.stream.on('data',c=>bytes+=c.length);
    for(let i=2;i<15;i++)send(fragment(i));await delay(10);
    assert.equal(slow.stream.destroyed,true);assert.equal(fast.stream.destroyed,false);assert.ok(bytes>80);assert.equal(children[0].killed,false);
  }finally{g.close()}
});
test('Vídeo inválido rejeita todos os interessados e libera o processo',async()=>{
  const {g,send}=harness();
  const a=g.start(config,options),b=g.start(config,{...options,owner:'b'});
  send(Buffer.alloc(16));await Promise.all([assert.rejects(a.ready,/inválido/),assert.rejects(b.ready,/inválido/)]);
  await delay(10);assert.equal(g.viewerCount,0);assert.equal(g.liveCount,0);g.close();
});
test('Cancelar antes do primeiro quadro e renovar por tempo encerram todos os recursos',async()=>{
  const {g,children,send}=harness({sessionMs:80});
  const first=g.start(config,options);first.stop();await assert.rejects(first.ready);await delay(10);
  assert.equal(g.viewerCount,0);assert.equal(g.liveCount,0);
  const next=g.start(config,options);send(Buffer.concat([init,fragment(1)]),1);const live=await next.ready;
  await delay(110);assert.equal(live.stream.destroyed,true);assert.equal(children[1].killed,true);assert.equal(g.producers.size,0);assert.equal(g.liveCount,0);g.close();
});
