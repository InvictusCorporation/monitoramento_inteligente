import { useEffect, useId, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ServiceApi, State, Monitoring } from "./api";

export const targets=[["person","Pessoa"],["vehicle","Veículo"],["animal","Animal"]] as const;
export const roleLabels={admin:"Administrador",operator:"Operador",client:"Cliente"} as const;
export const licenseLabels:Record<string,string>={legacy:"Legado — sem licença configurada",pending:"Licença pendente",active:"Licença ativa",suspended:"Licença suspensa",expired:"Licença vencida"};
export const date=(value?:string|null)=>value?new Date(value).toLocaleString("pt-BR"):"Não informado";
export const message=(error:unknown)=>error instanceof Error?error.name==="AbortError"?"Solicitação cancelada.":error.message:"Não foi possível concluir.";
export const bytes=(value:number)=>value<1024?`${value} B`:value<1048576?`${(value/1024).toLocaleString("pt-BR",{maximumFractionDigits:2})} KiB`:`${(value/1048576).toLocaleString("pt-BR",{maximumFractionDigits:2})} MiB`;
export function saveBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

export interface PageProps { api:ServiceApi; state:State; monitoring:Monitoring|null; local:string; search:string; refresh:()=>Promise<State|null>; openCamera:(id:string)=>void; openEvent:(id:string)=>void; navigate:(page:string)=>void; notify:(text:string)=>void; endSession:()=>void }
export function ErrorText({children}:{children:ReactNode}){return children?<p role="alert" className="op-error">{children}</p>:null}
export function Notice({children,tone="neutral"}:{children:ReactNode;tone?:"neutral"|"warning"}){return <div className={"op-notice "+(tone==="warning"?"op-warning":"")}>{children}</div>}
export function Empty({children}:{children:ReactNode}){return <p className="op-empty">{children}</p>}
export function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
  const titleId=useId(),ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.focus();const key=(event:KeyboardEvent)=>{if(event.key==="Escape")closeRef.current()};document.addEventListener("keydown",key);return()=>{document.removeEventListener("keydown",key);previous?.focus()}},[]);
  return <div className="op-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}><div ref={ref} tabIndex={-1} className={"op-modal-content "+(wide?"op-modal-wide":"")}><div className="op-modal-head"><h2 id={titleId}>{title}</h2><Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}><X/></Button></div>{children}</div></div>
}
export function Form({onSubmit,children,busy=false,submit="Salvar",error=""}:{onSubmit:()=>void|Promise<void>;children:ReactNode;busy?:boolean;submit?:string;error?:string}){
  return <form className="op-form" onSubmit={(event:FormEvent)=>{event.preventDefault();void onSubmit()}}>{children}<ErrorText>{error}</ErrorText><div className="op-actions"><Button type="submit" disabled={busy}>{busy?"Aguarde…":submit}</Button></div></form>
}
export function Pager({page,pages,total,onPage}:{page:number;pages:number;total:number;onPage:(page:number)=>void}){
  return <nav className="op-pager" aria-label="Paginação"><span>Página {page} de {pages} · {total} item(ns)</span><Button type="button" size="sm" variant="outline" disabled={page<=1} onClick={()=>onPage(page-1)}>Anterior</Button><Button type="button" size="sm" variant="outline" disabled={page>=pages} onClick={()=>onPage(page+1)}>Próxima</Button></nav>
}
export function DataTable({headers,children}:{headers:string[];children:ReactNode}){return <div className="op-table-wrap"><table className="op-table"><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}

// A completed write remains successful when only the following read fails.
export async function refreshSaved(refresh:()=>Promise<unknown>,notify:(text:string)=>void,label:string){try{await refresh()}catch(cause){notify(label+" Ação gravada; atualização pendente. "+message(cause))}}
