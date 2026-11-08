export interface User { id:string; name:string; email:string; role:"admin"|"operator"|"client"; clientId:string|null; platformAdmin?:boolean; passwordChangeRequired:boolean }
export interface Session { user:User; csrf:string }
export interface Camera { id:string; name:string; client:string; connectionStatus:string }
export interface Event { id:string; title:string; priority:string; rule:string; createdAt:string; status:"Pendente"|"Em análise"|"Finalizada"; note:string; version:number; camera:string; cameraName:string; hasEvidence:boolean; claimedBy:string|null; claimedName:string|null; pausedTargets:string[] }
export interface State { organization:{name:string;slug:string}; user:User; customers:{id:string;name:string}[]; clients:{id:string;name:string;customerName:string|null;license:{enabled:boolean;status?:string}}[]; cameras:Camera[]; events:Event[]; video:{available:boolean;maxPerOperator:number} }
export interface Rule { camera:string; version:number; enabled:boolean; name:string; priority:string; days:number[]; start:string; end:string; timezone:string; area:{x:number;y:number;width:number;height:number}; target?:string; targets:string[]; pausedTargets:string[] }
export interface Service { enabled:boolean;interval:number;cooldown:number;dailyLimit:number;version:number;state:string }
export interface Monitoring { rules:Rule[]; locations:{id:string;enabled:boolean}[]; service:Service; jobs:{camera:string;status:string;message:string}[] }
export class ApiError extends Error { constructor(public status:number,message:string,public passwordChangeRequired=false){super(message)} }

// Tokens live in memory only. Browser supplies the real Origin and HttpOnly cookie.
export class ServiceApi {
  csrf="";
  controllers=new Set<AbortController>();
  constructor(private unauthorized:()=>void){}
  clear(){this.csrf="";for(const c of this.controllers)c.abort();this.controllers.clear()}
  async request<T>(path:string,options:{method?:string;body?:unknown;signal?:AbortSignal;image?:boolean}={}):Promise<T>{
    const controller=new AbortController();this.controllers.add(controller);
    const abort=()=>controller.abort();options.signal?.addEventListener("abort",abort,{once:true});
    if(options.signal?.aborted)controller.abort();
    const timeout=setTimeout(abort,15000);
    try{
      const response=await fetch("/api"+path,{method:options.method??"GET",credentials:"same-origin",cache:"no-store",headers:{...(options.body!==undefined?{"Content-Type":"application/json"}:{}),...(options.method&&options.method!=="GET"?{"X-CSRF-Token":this.csrf}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{}),signal:controller.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===401){this.clear();this.unauthorized()}throw new ApiError(response.status,data.error??"Não foi possível concluir a solicitação.",!!data.passwordChangeRequired)}
      if(controller.signal.aborted)throw new DOMException('Solicitação encerrada','AbortError');
      if(options.image)return await response.blob() as T;
      return await response.json() as T;
    }finally{clearTimeout(timeout);options.signal?.removeEventListener("abort",abort);this.controllers.delete(controller)}
  }
}

export type LegacyRule = Omit<Rule,'targets'|'pausedTargets'> & {targets?:string[]|undefined;pausedTargets?:string[]|undefined};
// Read-only compatibility: no POST or silent migration of stored configuration.
export function normalizeRule(rule:LegacyRule):Rule{return {...rule,targets:rule.targets??(rule.target?[rule.target]:[]),pausedTargets:rule.pausedTargets??[]}}
export function normalizeMonitoring(data:Omit<Monitoring,'rules'> & {rules:LegacyRule[]}):Monitoring{return {...data,rules:data.rules.map(normalizeRule)}}
export function categoryState(input:LegacyRule,target:string){const rule=normalizeRule(input);return !rule.targets.includes(target)?"off":rule.pausedTargets.includes(target)?"paused":"detect"}
export function updateCategory(input:LegacyRule,target:string,value:string):Rule{
  const rule=normalizeRule(input);
  const targets=value==="off"?rule.targets.filter(t=>t!==target):[...new Set([...rule.targets,target])];
  if(!targets.length)throw new Error("Mantenha pelo menos uma categoria na regra.");
  return {...rule,targets,pausedTargets:value==="paused"?[...new Set([...rule.pausedTargets,target])]:rule.pausedTargets.filter(t=>t!==target)};
}
// Calls during a read share one trailing read, never the pre-mutation snapshot.
export class SerializedRefresh<T>{
  private active:Promise<T>|undefined;
  private trailing:Promise<T>|undefined;
  constructor(private read:()=>Promise<T>){}
  run():Promise<T>{
    if(!this.active)return this.start();
    if(this.trailing)return this.trailing;
    const preceding=this.active;
    const next=preceding.catch(()=>undefined).then(()=>{if(this.trailing===next)this.trailing=undefined;return this.start()});
    this.trailing=next;return next;
  }
  private start():Promise<T>{
    const task=this.read().finally(()=>{if(this.active===task)this.active=undefined});
    this.active=task;return task;
  }
}
export function intervalPayload(service:Service,interval:number){return {enabled:service.enabled,interval,cooldown:service.cooldown,dailyLimit:service.dailyLimit,version:service.version}}
export function eventPayload(event:Event,note:string,status:Event["status"],alertAction=""){
  if(status==="Finalizada"&&!note.trim())throw new Error("Registre a verificação antes de finalizar.");
  if(alertAction.startsWith("pause:")&&status!=="Finalizada")throw new Error("Pausar pelo atendimento exige finalizar com nota.");
  return {status,note,version:event.version,...(alertAction?{alertAction}:{})};
}