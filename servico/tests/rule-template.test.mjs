import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateRule} from '../server/monitoring.mjs';
test('Modelo mantém versão de destino, desabilita análise e redefine área sem alterar origem',()=>{
  const context=vm.createContext({window:{}});vm.runInContext(readFileSync(new URL('../web/rule-template.js',import.meta.url),'utf8'),context);
  const source={camera:'source',name:'Portão',enabled:true,priority:'Alta',days:[1,2],start:'22:00',end:'06:00',timezone:'America/Belem',targets:['person','vehicle'],area:{x:20,y:20,width:30,height:30},version:11};
  const draft=context.window.InvictusRuleTemplate(source,{version:3});
  assert.equal(draft.version,3);assert.equal(draft.enabled,false);assert.equal(draft.camera,undefined);
  assert.equal(JSON.stringify(draft.area),JSON.stringify({x:0,y:0,width:100,height:100}));
  assert.equal(validateRule(draft).enabled,false);assert.equal(draft.start,'22:00');
  draft.days.push(5);draft.targets.push('animal');assert.equal(source.days.length,2);assert.equal(source.targets.length,2);assert.equal(source.area.x,20);
  const legacy=context.window.InvictusRuleTemplate({...source,targets:undefined,target:'animal'});assert.equal(legacy.version,0);assert.equal(legacy.targets[0],'animal');
});
