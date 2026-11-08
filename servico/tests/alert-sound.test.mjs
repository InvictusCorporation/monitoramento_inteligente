import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('aviso dura seis segundos, permite ajuste e silencia imediatamente sem sobrepor sons',async()=>{
  const oscillators=[],levels=[];const nodes=new Map();
  const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{setAttribute(){},replaceChildren(){}});return nodes.get(id)}};
  const window={addEventListener(){}};
  vm.runInNewContext(readFileSync(new URL('../web/alerts.js',import.meta.url),'utf8'),{window,document,clearTimeout(){}});
  const alerts=window.InvictusAlerts;
  alerts.audio={state:'running',currentTime:100,destination:{},close:()=>Promise.resolve(),createOscillator(){const o={frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){},stops:[],stop(at){this.stops.push(at)}};oscillators.push(o);return o},createGain(){return {connect(){},disconnect(){},gain:{setValueAtTime:v=>levels.push(v),linearRampToValueAtTime:v=>levels.push(v)}}}};
  alerts.sound=true;alerts.beep();assert.equal(oscillators[0].stops[0],106);
  alerts.beep();assert.equal(oscillators.length,1);
  await alerts.toggleSound();assert.equal(alerts.sound,false);assert.equal(oscillators[0].stops.at(-1),undefined);assert.equal(alerts.tone,null);
  alerts.sound=true;alerts.duration=10;alerts.volume=100;alerts.beep();assert.equal(oscillators[1].stops[0],110);assert.ok(levels.includes(.18));
  alerts.stop();assert.equal(alerts.tone,null);assert.equal(alerts.sound,false);
});
test('consulta normal agenda dois segundos e falhas recuam para dez sem sobreposição',async()=>{
  const timers=new Map(),nodes=new Map();let next=0,fail=false;
  const node=()=>({classList:{toggle(){}},setAttribute(){},replaceChildren(){},append(){}});
  const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node};
  const window={addEventListener(){}};
  vm.runInNewContext(readFileSync(new URL('../web/alerts.js',import.meta.url),'utf8'),{window,document,AbortController,Date,setTimeout:(fn,delay)=>{timers.set(++next,{fn,delay});return next},clearTimeout:id=>timers.delete(id)});
  const alerts=window.InvictusAlerts,api=async()=>{if(fail)throw Error('offline');return {events:[],count:0}},flush=()=>new Promise(r=>setImmediate(r));
  alerts.start({role:'admin',api,open(){}});await flush();assert.equal(timers.get(alerts.timer).delay,2000);
  fail=true;timers.get(alerts.timer).fn();await flush();assert.equal(timers.get(alerts.timer).delay,10000);
  alerts.stop();assert.equal(alerts.timer,null);
});
