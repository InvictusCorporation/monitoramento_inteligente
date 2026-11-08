import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../web/event-report.js',import.meta.url),'utf8'),context);
const report=context.window.InvictusReport;
const local=(day,hour)=>new Date(2026,10,day,hour,59,59,999).toISOString();
const events=[
  {id:'a',createdAt:local(1,0),title:'Pessoa',cameraName:'Portão',camera:'c1',status:'Pendente',priority:'Alta'},
  {id:'b',createdAt:local(2,23),title:'Veículo',cameraName:'Garagem',camera:'c2',status:'Finalizada',priority:'Baixa'},
  {id:'c',createdAt:local(3,0),title:'Animal',cameraName:'Portão',camera:'c1',status:'Pendente',priority:'Alta'}
];
test('Paginação cobre todas as linhas, ajusta página após filtro e mantém exportação completa',()=>{
  const source=Array.from({length:103},(_,i)=>({...events[0],id:'row'+i}));
  const seen=[];
  for(let page=1;page<=5;page++)seen.push(...report.paginate(source,page,25).items.map(e=>e.id));
  assert.equal(new Set(seen).size,103);assert.equal(seen.join(','),source.map(e=>e.id).join(','));
  const last=report.paginate(source,999,50);assert.equal(last.page,3);assert.equal(last.start,101);assert.equal(last.end,103);
  assert.equal(report.paginate(source,-1,100).page,1);
  assert.equal(report.paginate(source,NaN,3).size,25);
  assert.equal(report.paginate(source.slice(0,2),5,25).page,1);
  const empty=report.paginate([],7,25);assert.equal(empty.start,0);assert.equal(empty.end,0);assert.equal(empty.pages,1);
  assert.equal(report.csv(source).split('\r\n').length,104);
});
test('Relatório inclui todo o último dia local e combina filtros sem alterar os eventos',()=>{
  assert.equal(report.select(events,{from:'2026-11-01',to:'2026-11-02'}).map(e=>e.id).join(','),'b,a');
  assert.equal(report.select(events,{from:'2026-11-02',to:'2026-11-01'}).length,0);
  assert.equal(report.select(events,{camera:'c1',status:'Pendente',priority:'Alta',search:'PORTÃO',to:'2026-11-02'}).map(e=>e.id).join(','),'a');
  assert.equal(report.select(events,{camera:'unknown'}).length,0);
  assert.equal(report.select(events,{priority:'Baixa',status:'Pendente'}).length,0);
  assert.equal(events.length,3);
});
test('Fila combina responsável, abertas e ordenação sem modificar a fonte',()=>{
  const source=[{...events[0],claimedBy:'u1'},{...events[1],claimedBy:'u1'},{...events[2],claimedBy:'u2'},{...events[0],id:'d',claimedBy:null,priority:'Baixa'}];
  const ids=options=>report.select(source,options).map(e=>e.id).join(',');
  assert.equal(ids({assignment:'mine',userId:'u1',status:'Abertas'}),'a');
  assert.equal(ids({assignment:'mine',userId:'u1',status:'Finalizada'}),'b');
  assert.equal(ids({assignment:'others',userId:'u1'}),'c');
  assert.equal(ids({assignment:'unassigned'}),'d');
  assert.equal(ids({assignment:'mine'}),'');
  assert.equal(ids({assignment:'others'}),'');
  assert.equal(ids({order:'priority',status:'Abertas'}),'a,c,d');
  assert.equal(ids({order:'oldest'}),'a,d,b,c');
  assert.equal(source.map(e=>e.id).join(','),'a,b,c,d');
  const csv=report.csv(report.select(source,{assignment:'mine',userId:'u1',status:'Abertas'}));
  assert.ok(csv.includes('"a";'));assert.ok(!csv.includes('"b";'));
});
test('CSV usa somente seleção, escapa texto e neutraliza fórmulas',()=>{
  const selected=report.select(events,{status:'Finalizada'});
  const csv=report.csv(selected,()=> 'Casa');
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"b";'));
  assert.ok(!csv.includes('"a";'));
  for(const formula of ['=SUM(A1)','  +123','\t@SUM(A1)','-2']){
    const output=report.csv([{...events[0],note:formula,title:'Texto "com aspas";\nlinha',claimedName:'Tiago',hasEvidence:1}]);
    assert.ok(output.includes('"\''+formula+'"'));
    assert.ok(output.includes('Texto ""com aspas"";\nlinha'));
    assert.ok(output.includes('"Tiago";"";"Sim"'));
    assert.ok(!output.includes('undefined'));
  }
});
