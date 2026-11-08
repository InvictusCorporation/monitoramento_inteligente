import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const esc=source.split('\n').find(l=>l.startsWith('const esc ='));
const code=source.slice(source.indexOf('function licenseLabel('),source.indexOf('async function openAlertPolicy('));
test('catálogo descarta respostas antigas e envia versão ao editar sem alterar licenças',async()=>{
  const nodes={'#content':{innerHTML:'old'},'#addPlan':{}},button={dataset:{plan:'p'}},calls=[];let save;
  const ctx=vm.createContext({state:{},revision:2,$:s=>nodes[s],document:{querySelectorAll:()=>[button]},toast(){},modal:(title,html,fn)=>{save=fn},api:async(path,options)=>{calls.push({path,options});return {plans:[{id:'p',name:'<Plano>',cameraLimit:16,active:true,version:3}]}}});
  vm.runInContext(esc+'\n'+code,ctx);await ctx.planPage(1);assert.equal(nodes['#content'].innerHTML,'old');
  await ctx.planPage(2);assert.match(nodes['#content'].innerHTML,/&lt;Plano&gt;/);
  button.onclick();await save({name:'Plano 8',cameraLimit:'8',active:'false'});
  const write=calls.find(c=>c.options);assert.equal(write.path,'/platform/plans/p');assert.equal(write.options.method,'PATCH');assert.equal(write.options.body.version,3);assert.equal(write.options.body.active,false);
  assert.ok(!calls.some(c=>c.path.includes('/licenses/')));
});
test('seleção de catálogo envia identidade e versão, mantendo condições personalizadas disponíveis',async()=>{
  const nodes={'#content':{},'#addPartner':{},'#licensePlan':{},'#fields input[name="plan"]':{},'#fields input[name="cameraLimit"]':{}},button={dataset:{license:'l'}},calls=[];let save;
  const ctx=vm.createContext({state:{},revision:1,$:s=>nodes[s],document:{querySelectorAll:()=>[button]},date:String,toast(){},modal:(title,html,fn)=>{save=fn},api:async(path,options)=>{
    calls.push({path,options});return path==='/platform/plans'?{plans:[{id:'p',name:'Plano 8',cameraLimit:8,active:true,version:2}]}:{companies:[{name:'Invictus',locations:[{id:'l',name:'Casa',cameras:1,license:{plan:'Atual',cameraLimit:16,enabled:true,version:1}}]}]};
  }});
  vm.runInContext(esc+'\n'+code,ctx);await ctx.commercialPage(1);button.onclick();
  nodes['#licensePlan'].onchange({target:{value:'p'}});assert.equal(nodes['#fields input[name="cameraLimit"]'].value,8);assert.equal(nodes['#fields input[name="plan"]'].readOnly,true);
  await save({planId:'p',plan:'Plano 8',cameraLimit:'8',enabled:'true',expiration:''});
  const write=calls.find(c=>c.options);assert.equal(write.options.body.planId,'p');assert.equal(write.options.body.planVersion,2);
  nodes['#licensePlan'].onchange({target:{value:''}});assert.equal(nodes['#fields input[name="plan"]'].value,'Atual');assert.equal(nodes['#fields input[name="plan"]'].readOnly,false);
});
