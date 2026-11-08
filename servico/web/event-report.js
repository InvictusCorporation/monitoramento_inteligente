(() => {
  function localDay(value) {
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function select(events,{search='',status='Todos',camera='',priority='',from='',to='',assignment='',userId='',order='newest'}={}) {
    if(from&&to&&from>to)return [];
    const query=search.toLocaleLowerCase('pt-BR');
    const selected=events.filter(e=>{
      const day=localDay(e.createdAt);
      const assigned=!assignment||(assignment==='unassigned'&&!e.claimedBy)||(assignment==='mine'&&userId&&e.claimedBy===userId)||(assignment==='others'&&userId&&e.claimedBy&&e.claimedBy!==userId);
      return assigned&&(status==='Todos'||(status==='Abertas'?e.status!=='Finalizada':e.status===status))&&(!camera||e.camera===camera)&&(!priority||e.priority===priority)&&
        (!from||(day&&day>=from))&&(!to||(day&&day<=to))&&
        `${e.title} ${e.cameraName}`.toLocaleLowerCase('pt-BR').includes(query);
    });
    const time=e=>Date.parse(e.createdAt)||0,rank={Alta:0,'Média':1,Baixa:2};
    return selected.sort((a,b)=>order==='priority'?(rank[a.priority]??3)-(rank[b.priority]??3)||time(a)-time(b):order==='oldest'?time(a)-time(b):time(b)-time(a));
  }
  function csv(events,locationName=()=> '') {
    const rows=[['ID','Data UTC','Local','Ocorrência','Câmera','Prioridade','Status','Responsável pelo atendimento','Atendimento UTC','Possui foto','Observação'],
      ...events.map(e=>[e.id,e.createdAt,locationName(e),e.title,e.cameraName,e.priority,e.status,e.claimedName,e.claimedAt,e.hasEvidence?'Sim':'Não',e.note])];
    const cell=value=>'"'+String(value??'').replace(/^[\s\u0000-\u001f]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
    return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');
  }
  function paginate(events,page=1,size=25){
    size=[25,50,100].includes(Number(size))?Number(size):25;
    const pages=Math.max(1,Math.ceil(events.length/size));
    page=Math.max(1,Math.min(pages,Number.isFinite(Number(page))?Math.floor(Number(page)):1));
    const offset=(page-1)*size;
    return {items:events.slice(offset,offset+size),page,size,pages,total:events.length,start:events.length?offset+1:0,end:Math.min(offset+size,events.length)};
  }
  window.InvictusReport={select,csv,paginate};
})();
