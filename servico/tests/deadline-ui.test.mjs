import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function openAlertPolicy('),source.indexOf('function bind()'));
function setup(deferred=false){
  const loading={isConnected:true},dialog={open:true},calls=[];let finish,save,fields;
  const ctx=vm.createContext({modalGeneration:0,authEpoch:0,$:id=>id==='#policyLoading'?loading:dialog,toast(){},modal:(title,html,fn)=>{ctx.modalGeneration++;fields=html;save=fn},api:async(path,options)=>{
    calls.push({path,options});if(options)return {ok:true};if(deferred)await new Promise(r=>finish=r);return {enabled:false,waitingMinutes:5,handlingMinutes:15,version:7};
  }});vm.runInContext(code,ctx);
  return {ctx,calls,finish:()=>finish(),save:()=>save,fields:()=>fields};
}
test('Formulário de prazos preserva desativação e envia números com versão lida',async()=>{
  const h=setup();await h.ctx.openAlertPolicy();assert.match(h.fields(),/value="false" selected/);
  await h.save()({enabled:'true',waitingMinutes:'3',handlingMinutes:'12'});
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls[1])),{path:'/alert-policy',options:{method:'POST',body:{enabled:true,waitingMinutes:3,handlingMinutes:12,version:7}}});
});
test('Carregamento antigo dos prazos não substitui outro modal',async()=>{
  const h=setup(true),pending=h.ctx.openAlertPolicy();h.ctx.modalGeneration++;h.finish();await pending;
  assert.equal(h.save(),null);assert.match(h.fields(),/Consultando/);
});
