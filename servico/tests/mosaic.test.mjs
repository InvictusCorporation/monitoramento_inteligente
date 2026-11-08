import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('Mosaico pagina câmeras, respeita capacidade e não renderiza vídeos fora da página',()=>{
  const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  const cameras=Array.from({length:19},(_,i)=>({id:'c'+i,name:'Câmera '+i,client:'local',connectionStatus:'configured'}));
  const ctx=vm.createContext({state:{video:{available:true,maxLive:16}},filter:'',cameras:()=>cameras,esc:String,clientName:()=> 'Local'});
  vm.runInContext(source.slice(source.indexOf('let mosaicSize='),source.indexOf('function startGrid()')),ctx);
  vm.runInContext('mosaicSize=16',ctx);assert.match(ctx.gridControls(),/Página 1 de 2/);
  assert.equal((ctx.cards().match(/<video /g)||[]).length,16);
  vm.runInContext('mosaicPage=2',ctx);assert.equal((ctx.cards().match(/<video /g)||[]).length,3);assert.ok(ctx.cards().includes('data-grid="c16"'));assert.ok(!ctx.cards().includes('data-grid="c0"'));
  ctx.state.video.maxLive=8;ctx.gridControls();assert.equal(vm.runInContext('mosaicSize',ctx),8);
  ctx.state.video.maxLive=32;ctx.state.video.maxPerOperator=4;ctx.gridControls();assert.equal(vm.runInContext('mosaicSize',ctx),4);
  assert.equal((ctx.cards().match(/<video /g)||[]).length,4);
  ctx.state.clients=[{id:'local',license:{allowed:false}}];assert.equal((ctx.cards().match(/<video /g)||[]).length,0);assert.match(ctx.cards(),/Licença indisponível/);
  ctx.filter='inexistente';assert.match(ctx.gridControls(),/Página 1 de 1/);assert.equal((ctx.cards().match(/<video /g)||[]).length,0);
});
