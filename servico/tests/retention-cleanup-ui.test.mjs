import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
test('interface calcula prévia sem excluir e exige abrir confirmação separada',async()=>{
  const nodes={'#location':{value:'local'},'#prepareCleanup':{},'#cleanupDays':{value:'30',reportValidity:()=>true},'#cleanupResult':{isConnected:true},'#reviewCleanup':{}},calls=[],dialogs=[];let save;
  const ctx=vm.createContext({modalGeneration:0,authEpoch:1,$:s=>nodes[s],esc:String,clientName:()=> 'Casa',date:String,toast(){},modal:(title,html,callback)=>{ctx.modalGeneration++;dialogs.push({title,html});save=callback},api:async(path,options)=>{calls.push({path,options});return path.endsWith('/prepare')?{token:'preview-token',eligible:2,batchCount:2,batchBytes:20,protectedOpen:1,cutoff:'cutoff',batchLimit:500,expiresAt:'expiry',days:30}:{deleted:2}}});
  vm.runInContext(source.slice(source.indexOf('function retentionCleanupModal(')),ctx);
  ctx.retentionCleanupModal();assert.equal(save,null);
  await nodes['#prepareCleanup'].onclick();assert.equal(calls.length,1);assert.equal(calls[0].path,'/evidence/retention/prepare');
  nodes['#reviewCleanup'].onclick();assert.equal(calls.length,1);assert.match(dialogs[1].html,/EXCLUIR FOTOS/);assert.match(dialogs[1].html,/Não há desfazer/);
  await save({confirmation:'EXCLUIR FOTOS'});assert.equal(calls[1].path,'/evidence/retention/execute');assert.equal(calls[1].options.body.token,'preview-token');
});
