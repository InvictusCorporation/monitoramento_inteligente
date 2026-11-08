import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function bindEventTransfer('),source.indexOf('function exportCSV('));
function setup({defer=false,failRefresh=false}={}){
  const nodes=Object.fromEntries(['transferEvent','transferPanel','transferTo','transferReason','confirmTransfer','transferStatus','save'].map(k=>['#'+k,{isConnected:true,disabled:false,value:''}]));
  nodes['#dialog']={open:true,close(){this.open=false}};
  nodes['#form']={elements:{note:{value:'Rascunho'},status:{value:'Finalizada'}}};
  const requests=[];let finish,reopened,rendered=0;
  const ctx=vm.createContext({$:s=>nodes[s],modalGeneration:1,authEpoch:0,state:{events:[]},location:{hash:'#ocorrencias'},esc:s=>String(s).replaceAll('<','&lt;'),toast(){},render:async()=>{rendered++},eventModal:(id,draft)=>{reopened={id,draft}},api:async(path,options)=>{
    requests.push({path,options});
    if(path==='/operators')return {operators:[{id:'a',name:'Atual',role:'operator'},{id:'b',name:'<Operador>',role:'operator'}]};
    if(path==='/state'){if(failRefresh)throw Error('Sem rede');return {events:[{id:'e',version:3}]}}
    if(defer)await new Promise(resolve=>finish=resolve);return {ok:true};
  }});
  vm.runInContext(code,ctx);ctx.bindEventTransfer({id:'e',version:2,claimedBy:'a'});
  return {ctx,nodes,requests,finish:()=>finish(),reopened:()=>reopened,rendered:()=>rendered};
}
test('Transferir preserva rascunho e status, usa versão e não salva a verificação',async()=>{
  const h=setup();await h.nodes['#transferEvent'].onclick();
  assert.ok(h.nodes['#transferTo'].innerHTML.includes('&lt;Operador>'));assert.ok(!h.nodes['#transferTo'].innerHTML.includes('value="a"'));
  await h.nodes['#confirmTransfer'].onclick();assert.equal(h.requests.length,1);
  h.nodes['#transferTo'].value='b';h.nodes['#transferReason'].value=' Troca de turno ';
  await h.nodes['#confirmTransfer'].onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests[1])),{path:'/events/e/transfer',options:{method:'POST',body:{to:'b',reason:'Troca de turno',version:2}}});
  assert.equal(h.reopened().draft.note,'Rascunho');assert.equal(h.reopened().draft.status,'Finalizada');assert.equal(h.rendered(),1);assert.equal(h.requests.filter(r=>r.options?.method==='PATCH').length,0);
});
test('Resposta de transferência antiga não fecha nem altera um novo formulário',async()=>{
  const h=setup({defer:true});await h.nodes['#transferEvent'].onclick();h.nodes['#transferTo'].value='b';h.nodes['#transferReason'].value='Troca';
  const pending=h.nodes['#confirmTransfer'].onclick();h.ctx.modalGeneration=2;h.nodes['#save'].disabled=true;h.finish();await pending;
  assert.equal(h.nodes['#dialog'].open,true);assert.equal(h.nodes['#save'].disabled,true);assert.equal(h.reopened(),undefined);assert.equal(h.requests.length,2);assert.equal(h.rendered(),0);
});
test('Falha ao consultar estado após transferir mantém rascunho visível e evita reenviar',async()=>{
  const h=setup({failRefresh:true});await h.nodes['#transferEvent'].onclick();h.nodes['#transferTo'].value='b';h.nodes['#transferReason'].value='Troca';
  await h.nodes['#confirmTransfer'].onclick();assert.equal(h.nodes['#dialog'].open,true);assert.equal(h.nodes['#form'].elements.note.value,'Rascunho');assert.match(h.nodes['#transferStatus'].textContent,/Transferência realizada/);assert.equal(h.nodes['#confirmTransfer'].disabled,true);assert.equal(h.nodes['#save'].disabled,true);
});
