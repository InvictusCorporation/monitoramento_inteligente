import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const code=text.slice(text.indexOf('let modalGeneration='),text.indexOf('function eventModal('));
function setup(){
  let refreshed=0;
  const nodes=Object.fromEntries(['#dialogtitle','#fields','#modalError','.dialogactions','#save','#form'].map(k=>[k,{replaceChildren(){this.innerHTML=''}}]));
  nodes['#dialog']={open:false,showModal(){this.open=true},close(){this.open=false}};
  const ctx=vm.createContext({$:s=>nodes[s],authEpoch:0,state:{},stopPreview(){},stopAnalysis(){},window:{InvictusLive:{stop(){}}},FormData:class{*[Symbol.iterator](){}},refresh:async()=>{refreshed++},toast(){}});vm.runInContext(code,ctx);
  return {ctx,nodes,refreshed:()=>refreshed};
}
test('Resposta de salvamento antigo não fecha, limpa ou habilita formulário mais recente',async()=>{
  for(const fail of [false,true]){
    const {ctx,nodes,refreshed}=setup();let finish;
    ctx.modal('Primeiro','Texto antigo',()=>new Promise((resolve,reject)=>{finish=()=>fail?reject(Error('Erro antigo')):resolve()}));
    const pending=nodes['#form'].onsubmit({preventDefault(){}});
    ctx.modal('Segundo','Texto novo',async()=>{});nodes['#save'].disabled=true;
    finish();await pending;
    assert.equal(nodes['#dialog'].open,true);assert.equal(nodes['#fields'].innerHTML,'Texto novo');assert.equal(nodes['#modalError'].textContent,'');assert.equal(nodes['#save'].disabled,true);assert.equal(refreshed(),0);
  }
});
test('Salvamento atual conclui e atualiza; erro atual permanece no formulário',async()=>{
  const {ctx,nodes,refreshed}=setup();ctx.modal('Atual','Texto',async()=>{});await nodes['#form'].onsubmit({preventDefault(){}});assert.equal(nodes['#dialog'].open,false);assert.equal(refreshed(),1);
  ctx.modal('Erro','Preservado',async()=>{throw Error('Conflito')});await nodes['#form'].onsubmit({preventDefault(){}});assert.equal(nodes['#modalError'].textContent,'Conflito');assert.equal(nodes['#fields'].innerHTML,'Preservado');assert.equal(nodes['#dialog'].open,true);
});
