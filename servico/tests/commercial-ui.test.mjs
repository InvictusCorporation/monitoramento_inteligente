import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const escaping=source.split('\n').find(l=>l.startsWith('const esc ='));
const code=source.slice(source.indexOf('function licenseLabel('),source.indexOf('async function openAlertPolicy('));
test('Clientes e locais oferece criação separada e vínculo, com dados escapados',()=>{
  const line=source.split('\n').find(l=>l.includes("if(page==='clientes')html="));
  const ctx=vm.createContext({page:'clientes',state:{cameras:[],clients:[{id:'l',name:'<Local>',customerName:'<Cliente>',license:{status:'pending'}}]}});
  vm.runInContext(escaping+'\n'+code+'\nlet html;'+line+'\nresult=html',ctx);
  assert.match(ctx.result,/id="addCustomer"/);assert.match(ctx.result,/id="addClient"/);assert.match(ctx.result,/data-link-customer="l"/);assert.match(ctx.result,/&lt;Cliente&gt;/);assert.match(ctx.result,/Licença pendente/);
});
test('Página master mostra licença e envia limite, módulo e versão sem expor imagens',async()=>{
  const nodes={'#content':{},'#addPartner':{},'#licensePlan':{}},button={dataset:{license:'l'}},calls=[];let save;
  const ctx=vm.createContext({state:{},revision:1,$:s=>nodes[s],document:{querySelectorAll:()=>[button]},date:String,toast(){},modal:(title,html,fn)=>{save=fn},api:async(path,options)=>{
    calls.push({path,options});return {companies:[{id:'p',name:'<Parceira>',slug:'partner',brand:'Marca',parent:'root',locations:[{id:'l',name:'Local',cameras:8,license:{status:'active',enabled:true,plan:'Plano',cameraLimit:16,expiresAt:null,version:3}}]}]};
  }});
  vm.runInContext(escaping+'\n'+code,ctx);await ctx.commercialPage(1);assert.match(nodes['#content'].innerHTML,/&lt;Parceira&gt;/);assert.ok(!nodes['#content'].innerHTML.includes('<video'));
  button.onclick();await save({plan:'Plano 16',enabled:'true',cameraLimit:'16',expiration:''});
  assert.deepEqual(JSON.parse(JSON.stringify(calls.find(c=>c.options?.method==='POST'))),{path:'/platform/licenses/l',options:{method:'POST',body:{module:'patrimonial',plan:'Plano 16',enabled:true,cameraLimit:16,expiresAt:null,version:3}}});
});
