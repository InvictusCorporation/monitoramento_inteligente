import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function eventModal('),source.indexOf('function exportCSV('));
test('Assumir atendimento preserva observação digitada, atualiza versão e não salva o rascunho',async()=>{
  let form,button,modalCount=0,requests=[];
  const event={id:'e',status:'Pendente',note:'Salvo',version:1,createdAt:'2026-11-02',cameraName:'Câmera',title:'Pessoa'};
  const dialog={open:true,close(){this.open=false}};
  const ctx=vm.createContext({state:{user:{role:'operator'}},authEpoch:0,location:{hash:'#ocorrencias'},events:()=>[event],esc:String,date:String,
    modal(){if(form)form.elements.note.isConnected=false;form={elements:{note:{value:event.note,isConnected:true},status:{value:event.status}}};button=event.claimedBy?null:{};dialog.open=true;modalCount++},
    $:selector=>({'#form':form,'#claimEvent':button,'#dialog':dialog,'#modalError':{}}[selector]||null),
    api:async(path,options)=>{requests.push({path,options});event.claimedBy='u';event.version=2;event.status='Em análise'},refresh:async()=>{},toast(){}
  });
  vm.runInContext(code,ctx);ctx.eventModal('e');form.elements.note.value='Rascunho ainda não salvo';form.elements.status.value='Finalizada';await button.onclick();
  assert.equal(modalCount,2);assert.equal(form.elements.note.value,'Rascunho ainda não salvo');assert.equal(form.elements.status.value,'Finalizada');assert.equal(event.note,'Salvo');assert.equal(requests.length,1);assert.equal(requests[0].options.method,'POST');
});
