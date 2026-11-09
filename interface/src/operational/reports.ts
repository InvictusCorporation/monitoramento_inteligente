import type { Event } from "./api";
export interface ReportFilters { search?:string;status?:string;camera?:string;priority?:string;from?:string;to?:string;assignment?:string;userId?:string;order?:string }
function localDay(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"":`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`}
export function select(events:readonly Event[],{search="",status="Todos",camera="",priority="",from="",to="",assignment="",userId="",order="newest"}:ReportFilters={}):Event[]{
  if(from&&to&&from>to)return [];
  const query=search.toLocaleLowerCase("pt-BR"),selected=events.filter(event=>{const day=localDay(event.createdAt),assigned=!assignment||(assignment==="unassigned"&&!event.claimedBy)||(assignment==="mine"&&!!userId&&event.claimedBy===userId)||(assignment==="others"&&!!userId&&!!event.claimedBy&&event.claimedBy!==userId);return assigned&&(status==="Todos"||(status==="Abertas"?event.status!=="Finalizada":event.status===status))&&(!camera||event.camera===camera)&&(!priority||event.priority===priority)&&(!from||(!!day&&day>=from))&&(!to||(!!day&&day<=to))&&`${event.title} ${event.cameraName}`.toLocaleLowerCase("pt-BR").includes(query)});
  const time=(event:Event)=>Date.parse(event.createdAt)||0,rank:Record<string,number>={Alta:0,"Média":1,Baixa:2};
  return selected.sort((a,b)=>order==="priority"?(rank[a.priority]??3)-(rank[b.priority]??3)||time(a)-time(b):order==="oldest"?time(a)-time(b):time(b)-time(a));
}
export function csv(events:readonly Event[],locationName:(event:Event)=>string=()=>""){
  const rows:unknown[][]=[["ID","Data UTC","Local","Ocorrência","Câmera","Prioridade","Status","Responsável pelo atendimento","Atendimento UTC","Possui foto","Observação"],...events.map(event=>[event.id,event.createdAt,locationName(event),event.title,event.cameraName,event.priority,event.status,event.claimedName,event.claimedAt,event.hasEvidence?"Sim":"Não",event.note])];
  const cell=(value:unknown)=>'"'+String(value??"").replace(/^[\s\u0000-\u001f]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  return "\uFEFF"+rows.map(row=>row.map(cell).join(";")).join("\r\n");
}
export function paginate<T>(events:readonly T[],page:number|string=1,size:number|string=25){const normalizedSize=[25,50,100].includes(Number(size))?Number(size):25,pages=Math.max(1,Math.ceil(events.length/normalizedSize)),normalizedPage=Math.max(1,Math.min(pages,Number.isFinite(Number(page))?Math.floor(Number(page)):1)),offset=(normalizedPage-1)*normalizedSize;return{items:events.slice(offset,offset+normalizedSize),page:normalizedPage,size:normalizedSize,pages,total:events.length,start:events.length?offset+1:0,end:Math.min(offset+normalizedSize,events.length)}}
