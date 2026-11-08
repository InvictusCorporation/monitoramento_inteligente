import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {setTimeout as delay} from 'node:timers/promises';
import {validateCapacity} from '../server/capacity.mjs';
import {VideoGateway,parseEndpoints} from '../server/video-gateway.mjs';
test('Duas contas têm tetos próprios; parar uma não encerra a outra e só libera após fechar o processo',async()=>{
  const children=[];
  const gateway=new VideoGateway({executable:'fake',checkExecutable:false,maxStreams:4,maxStreamsPerOwner:2,endpoints:parseEndpoints('[{"clientId":"l","address":"192.168.1.64:554"}]'),spawnProcess:()=>{
    const c=new EventEmitter();c.stdout=new PassThrough();c.kill=()=>true;children.push(c);return c;
  }});
  const config={host:'192.168.1.64',port:554,path:'/channel',username:'fixture',password:'fixture'};
  const open=async(owner,cameraId)=>{const s=gateway.start(config,{owner,cameraId,clientId:'l',authorize:()=>true});children.at(-1).stdout.write('fixture');await s.ready;return s};
  try{
    await open('a','1');await open('a','2');
    assert.throws(()=>gateway.start(config,{owner:'a',cameraId:'3',clientId:'l',authorize:()=>true}),/desta conta/);
    await open('b','1');await open('b','2');assert.equal(children.length,4);
    gateway.stopOwner('a');assert.equal(gateway.ownerLiveCount('a'),2);assert.equal(children[2].stdout.destroyed,false);
    children[0].emit('close');children[1].emit('close');assert.equal(gateway.ownerLiveCount('a'),0);assert.equal(gateway.ownerLiveCount('b'),2);
    await open('a','3');assert.equal(gateway.liveCount,3);
  }finally{gateway.close();for(const c of children)c.emit('close')}
});
test('Capacidade possui limites explícitos e padrão de 8 vídeos mais 2 capturas',()=>{
  assert.deepEqual(validateCapacity(),{maxStreams:8,maxSnapshots:2,maxStreamsPerOwner:8});
  for(const value of [{live:0},{live:65},{captures:0},{captures:9},{live:1.5},{perOperator:0},{live:8,perOperator:9},{perOperator:1.5}])assert.throws(()=>validateCapacity(value));
  assert.equal(validateCapacity({live:16,captures:2}).maxStreams,16);
});
test('16 vídeos ocupados não bloqueiam duas capturas e cada grupo mantém seu teto',async()=>{
  const children=[];const gateway=new VideoGateway({executable:'fake',checkExecutable:false,maxStreams:16,maxSnapshots:2,endpoints:parseEndpoints('[{"clientId":"l","address":"192.168.1.64:554"}]'),spawnProcess:()=>{
    const c=new EventEmitter();c.stdout=new PassThrough();c.kill=()=>{setImmediate(()=>c.emit('close',1));return true};children.push(c);return c;
  }});
  const config={host:'192.168.1.64',port:554,path:'/channel',username:'fixture',password:'fixture'};
  const options={owner:'u',cameraId:'c',clientId:'l',authorize:()=>true};
  try{
    for(let n=0;n<16;n++){const stream=gateway.start(config,{...options,cameraId:'c'+n});children.at(-1).stdout.write('fixture');await stream.ready}
    const capture={...options,area:{x:0,y:0,width:100,height:100}};
    const first=gateway.snapshot(config,capture),second=gateway.snapshot(config,{...capture,cameraId:'other'});
    assert.equal(gateway.liveCount,16);assert.equal(gateway.snapshotCount,2);assert.equal(gateway.active.size,18);
    assert.throws(()=>gateway.start(config,{...options,cameraId:'overflow'}),/Limite/);assert.throws(()=>gateway.snapshot(config,capture),/Limite/);
    for(const c of children.slice(-2)){c.stdout.write(Buffer.from([255,216,255,217]));c.emit('close',0)}
    await Promise.all([first,second]);assert.equal(gateway.snapshotCount,0);assert.equal(gateway.liveCount,16);
  }finally{gateway.close();await delay(25);assert.equal(gateway.active.size,0)}
});
