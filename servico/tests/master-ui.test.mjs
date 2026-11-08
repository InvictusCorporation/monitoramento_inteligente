import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx=vm.createContext({});vm.runInContext(readFileSync(new URL('../web/master.js',import.meta.url),'utf8'),ctx);
const {route,summary}=ctx.InvictusMaster;
const nav=[['empresas'],['painel'],['cameras'],['usuarios'],['clientes'],['auditoria']];
test('master tem entrada própria, troca para operação e mantém rota comercial anterior',()=>{
  const user={role:'admin',platformAdmin:true};
  assert.equal(route(user,'',nav).page,'master');assert.equal(route(user,'#empresas',nav).master,true);assert.equal(route(user,'#master-clientes',nav).master,true);
  const op=route(user,'#painel',nav);assert.equal(op.master,false);assert.ok(!op.allowed.some(n=>n[0]==='empresas'));
  assert.ok(!route(user,'#master',nav).allowed.some(n=>n[0]==='cameras'));
});
test('contas sem master não ganham rotas comerciais por hash',()=>{
  for(const role of ['admin','operator','client'])for(const hash of ['#master','#empresas','#master-clientes','#master-planos','#master-marcas']){
    const result=route({role},hash,nav);assert.equal(result.master,false);assert.equal(result.page,'painel');
    assert.ok(!result.allowed.some(n=>n[0]==='empresas'));
  }
});
test('resumo distingue câmeras cadastradas, parceiras e licenças pendentes',()=>{
  const companies=[{parent:null,locations:[{cameras:8,license:{status:'active'}}]},{parent:'root',locations:['pending','expired','legacy','suspended'].map(status=>({cameras:2,license:{status}}))}];
  assert.deepEqual(JSON.parse(JSON.stringify(summary(companies))),{partners:1,locations:5,cameras:16,active:1,attention:4});
});
test('trocar para master interrompe alertas e voltar retoma operação',()=>{
  const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');let stopped=0,started=0;
  const context=vm.createContext({state:{user:{role:'admin'}},page:'master',api(){},window:{InvictusAlerts:{stop(){stopped++},start(){started++}}}});
  vm.runInContext(source.slice(source.indexOf('function syncAreaAlerts('),source.indexOf('const cameras=')),context);
  context.syncAreaAlerts();assert.equal(stopped,1);assert.equal(started,0);
  context.page='master-clientes';context.syncAreaAlerts();assert.equal(stopped,2);assert.equal(started,0);
  context.page='painel';context.syncAreaAlerts();assert.equal(started,1);
});
