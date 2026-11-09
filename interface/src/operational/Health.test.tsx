import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {HealthPage} from "./Health";
import {ServiceApi} from "./api";
import type {Diagnostics,State} from "./api";
import type {PageProps} from "./common";

const diagnostics:Diagnostics={checkedAt:"2026-11-09T00:00:00Z",videoReady:true,service:{enabled:false,state:"disabled",interval:60},ai:{configured:false,enabled:false,used:0,dailyLimit:100},attention:0,cameras:[{id:"cam",name:"Portão",client:"one",location:"Local um",evidence:{events:1,photos:1,bytes:100,oldest:null,newest:null},health:{code:"ok",label:"Sem pendência",action:"Nenhuma",attention:false},lastAnalysis:null,lastOutcome:null,lastAttempt:null,retryAfter:null,lastMessage:null}]};
const state:State={installation:{version:"0.44.0-dev.1",startedAt:"2026-01-01T00:00:00Z"},organization:{name:"Empresa",slug:"empresa",brand:"Marca",branding:{primaryColor:"#987b45",logoDataUrl:null,version:1}},user:{id:"admin",name:"Admin",email:"admin@example.test",role:"admin",clientId:null,platformAdmin:false,passwordChangeRequired:false},customers:[],clients:[{id:"one",name:"Local um",customerId:null,customerName:null,license:{enabled:true,status:"active",plan:"Teste",cameraLimit:8,expiresAt:null,version:1}},{id:"two",name:"Local dois",customerId:null,customerName:null,license:{enabled:true,status:"active",plan:"Teste",cameraLimit:8,expiresAt:null,version:1}}],cameras:[],events:[],video:{available:true,maxLive:4,maxPerOperator:4,maxCaptures:2}};
const preview={total:2,eligible:1,eligibleBytes:100,protectedOpen:0,days:30,cutoff:"2026-10-01T00:00:00Z",checkedAt:"2026-11-09T00:00:00Z",simulation:true};
const prepared={...preview,token:"TOKEN-NOVO",expiresAt:"2026-11-09T01:00:00Z",batchCount:1,batchBytes:100,batchLimit:100};
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(res=>{resolve=res});return{promise,resolve}}
afterEach(()=>{cleanup();vi.restoreAllMocks()});

it("troca de local e dias aborta retenção, desbloqueia ações e nunca executa token antigo",async()=>{
 const api=new ServiceApi(()=>{}),oldPreview=deferred<typeof preview>(),oldPrepared=deferred<typeof prepared>();let previews=0,prepares=0;
 const request=vi.spyOn(api,"request").mockImplementation(((path:string)=>{
  if(path==="/diagnostics")return Promise.resolve(diagnostics);
  if(path.startsWith("/evidence/retention-preview"))return ++previews===1?oldPreview.promise:Promise.resolve(preview);
  if(path==="/evidence/retention/prepare")return ++prepares===1?oldPrepared.promise:Promise.resolve(prepared);
  if(path==="/evidence/retention/execute")return Promise.resolve({deleted:1,deletedBytes:100});
  return Promise.reject(Error("Rota inesperada "+path));
 }) as never);
 const props:PageProps={api,state,monitoring:null,local:"one",search:"",refresh:vi.fn(),openCamera:vi.fn(),openEvent:vi.fn(),navigate:vi.fn(),notify:vi.fn(),endSession:vi.fn()};
 const view=render(<HealthPage {...props}/>);await screen.findByText(/Diagnóstico calculado/);
 fireEvent.click(screen.getByText("Simular retenção"));expect(screen.getByText("Simular retenção")).toBeDisabled();view.rerender(<HealthPage {...props} local="two"/>);await waitFor(()=>expect(screen.getByText("Simular retenção")).toBeEnabled());oldPreview.resolve(preview);await waitFor(()=>expect(previews).toBe(1));expect(screen.queryByText("Simulação — nenhuma exclusão")).not.toBeInTheDocument();
 fireEvent.click(screen.getByText("Preparar lote para exclusão"));expect(screen.getByLabelText("Prazo em dias")).toBeEnabled();fireEvent.change(screen.getByLabelText("Prazo em dias"),{target:{value:"45"}});await waitFor(()=>expect(screen.getByText("Preparar lote para exclusão")).toBeEnabled());oldPrepared.resolve({...prepared,token:"TOKEN-ANTIGO"});await waitFor(()=>expect(prepares).toBe(1));expect(screen.queryByText("Lote preparado")).not.toBeInTheDocument();expect(screen.queryByText("Excluir fotos deste lote")).not.toBeInTheDocument();
 fireEvent.click(screen.getByText("Preparar lote para exclusão"));expect(await screen.findByText("Lote preparado")).toBeInTheDocument();const prepareCalls=request.mock.calls.filter(call=>call[0]==="/evidence/retention/prepare");expect(prepareCalls[0]?.[1]?.body).toEqual({days:30,client:"two"});expect(prepareCalls[1]?.[1]?.body).toEqual({days:45,client:"two"});
 fireEvent.change(screen.getByLabelText("Digite EXCLUIR FOTOS para confirmar somente este lote"),{target:{value:"EXCLUIR FOTOS"}});fireEvent.click(screen.getByText("Excluir fotos deste lote"));expect(await screen.findByText(/1 foto\(s\) excluída/)).toBeInTheDocument();const execute=request.mock.calls.find(call=>call[0]==="/evidence/retention/execute");expect(execute?.[1]?.body).toEqual({token:"TOKEN-NOVO",confirmation:"EXCLUIR FOTOS"});
});
