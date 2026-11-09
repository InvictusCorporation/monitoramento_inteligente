export type Role = "admin" | "operator" | "client";
export interface User { id:string; name:string; email:string; role:Role; clientId:string|null; platformAdmin?:boolean; passwordChangeRequired:boolean }
export interface Session { user:User; csrf:string }
export interface License { enabled:boolean; allowed?:boolean; status:string; plan:string; cameraLimit:number; expiresAt:string|null; version:number }
export interface Branding { primaryColor:string; logoDataUrl:string|null; version:number }
export interface Camera { id:string; name:string; client:string; createdAt:string; connectionStatus:"configured"|"disabled"|"unconfigured" }
export interface Event { id:string; title:string; priority:string; rule:string; createdAt:string; status:"Pendente"|"Em análise"|"Finalizada"; note:string; version:number; camera:string; cameraName:string; hasEvidence:boolean; evidenceRemoved?:boolean; claimedBy:string|null; claimedAt?:string|null; claimedName:string|null; pausedTargets:string[] }
export interface State { installation:{version:string;startedAt:string}; organization:{name:string;slug:string;brand:string;branding:Branding}; user:User; customers:{id:string;name:string}[]; clients:{id:string;name:string;customerId:string|null;customerName:string|null;license:License}[]; cameras:Camera[]; events:Event[]; video:{available:boolean;maxLive:number;maxPerOperator:number;maxCaptures:number} }
export interface Area { x:number;y:number;width:number;height:number }
export interface Rule { camera:string; version:number; enabled:boolean; name:string; priority:"Alta"|"Média"|"Baixa"; days:number[]; start:string; end:string; timezone:string; area:Area; target?:string; targets:string[]; pausedTargets:string[]; inSchedule?:boolean }
export interface Service { enabled:boolean;interval:number;cooldown:number;dailyLimit:number;version:number;state:string;active?:number }
export interface AISettings { configured:boolean;enabled:boolean;available:boolean;version:number;used:number;dailyLimit:number;model:string }
export interface Monitoring { rules:Rule[]; locations:{id:string;name:string;enabled:boolean;version:number}[]; service:Service; detectorAvailable:boolean; ai:AISettings; jobs:{camera:string;status:string;message:string;attemptedAt:string|null;nextAt:string|null}[] }
export interface CameraConnection { configured:boolean;enabled:boolean;version:number;host:string;port:number;profile:string;channel:number;stream:number;available:boolean;canConfigure:boolean }
export interface ManagedLocation { id:string;name:string;cameras:number;license:License }
export interface ManagedCompany { id:string;name:string;slug:string;brand:string;parent:string|null;locations:ManagedLocation[] }
export interface Plan { id:string;name:string;cameraLimit:number;active:boolean;version:number }
export interface MasterData { companies:ManagedCompany[];plans:Plan[] }
export interface AuditEntry { action:string;target:string;createdAt:string;actor:string }
export interface Diagnostics { checkedAt:string;videoReady:boolean;service:{enabled:boolean;state:string;interval:number};ai:{configured:boolean;enabled:boolean;used:number;dailyLimit:number};attention:number;cameras:{id:string;name:string;client:string;location:string;evidence:{events:number;photos:number;bytes:number;oldest:string|null;newest:string|null};health:{code:string;label:string;action:string;attention:boolean};lastAnalysis:string|null;lastOutcome:string|null;lastAttempt:string|null;retryAfter:string|null;lastMessage:string|null}[] }
export interface AnalysisResult { outcome:string;target:string;detectedTargets:string[];uncertainTargets:string[];eventId:string|null;checkedAt:string;duplicateSuppressed:boolean }
export interface Download { blob:Blob;filename:string }
export class ApiError extends Error { constructor(public status:number,message:string,public passwordChangeRequired=false){super(message)} }

// CSRF stays in memory. Cookies are HttpOnly and every request remains same-origin.
export class ServiceApi {
  csrf="";
  controllers=new Set<AbortController>();
  constructor(private unauthorized:()=>void){}
  clear(){this.csrf="";for(const c of this.controllers)c.abort();this.controllers.clear()}
  async request<T>(path:string,options:{method?:string;body?:unknown;signal?:AbortSignal|undefined;image?:boolean;download?:boolean;timeoutMs?:number}={}):Promise<T>{
    const controller=new AbortController();this.controllers.add(controller);
    const abort=()=>controller.abort();options.signal?.addEventListener("abort",abort,{once:true});
    if(options.signal?.aborted)controller.abort();
    const method=options.method??"GET";
    const timeout=setTimeout(abort,options.timeoutMs??15000);
    try{
      const response=await fetch("/api"+path,{method,credentials:"same-origin",cache:"no-store",headers:{...(method!=="GET"?{"Content-Type":"application/json","X-CSRF-Token":this.csrf}:{})},...(options.body!==undefined?{body:JSON.stringify(options.body)}:{}),signal:controller.signal});
      if(!response.ok){const data=await response.json().catch(()=>({}));if(response.status===401){this.clear();this.unauthorized()}throw new ApiError(response.status,data.error??"Não foi possível concluir a solicitação.",!!data.passwordChangeRequired)}
      if(controller.signal.aborted)throw new DOMException("Solicitação encerrada","AbortError");
      if(options.image)return await response.blob() as T;
      if(options.download){const filename=response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]??"ocorrencia.jpg";return {blob:await response.blob(),filename} as T}
      return await response.json() as T;
    }finally{clearTimeout(timeout);options.signal?.removeEventListener("abort",abort);this.controllers.delete(controller)}
  }
}

export type LegacyRule = Omit<Rule,"targets"|"pausedTargets"> & {targets?:string[]|undefined;pausedTargets?:string[]|undefined};
// Read-only compatibility: no POST or silent migration of stored configuration.
export function normalizeRule(rule:LegacyRule):Rule{return {...rule,targets:rule.targets??(rule.target?[rule.target]:[]),pausedTargets:rule.pausedTargets??[]}}
export function normalizeMonitoring(data:Omit<Monitoring,"rules"> & {rules:LegacyRule[]}):Monitoring{return {...data,rules:data.rules.map(normalizeRule)}}
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
export function newRule(camera:string):Rule{return {camera,version:0,name:"Presença de pessoa",enabled:false,priority:"Alta",days:[0,1,2,3,4,5,6],start:"00:00",end:"00:00",timezone:"America/Sao_Paulo",area:{x:0,y:0,width:100,height:100},targets:["person"],pausedTargets:[]}}
export function ruleTemplate(source:Rule,destination:Rule|undefined,targetCamera:string):Rule{return {...newRule(targetCamera),name:source.name,priority:source.priority,days:[...source.days],start:source.start,end:source.end,timezone:source.timezone,targets:[...source.targets],pausedTargets:[],enabled:false,version:destination?.version??0}}
