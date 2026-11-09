import {act,cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {OperationalApp} from "./OperationalApp";
import {Live,LivePage} from "./Cameras";
import {ClientsPage} from "./Organization";
import {Modal} from "./common";
import type {PageProps} from "./common";
import {ApiError,ServiceApi} from "./api";
import type {Monitoring,Session,State} from "./api";
const session:Session={csrf:"fixture-csrf",user:{id:"admin",name:"Administradora",email:"admin@example.test",role:"admin",clientId:null,platformAdmin:false,passwordChangeRequired:false}};
const state:State={installation:{version:"0.44.0-dev.1",startedAt:"2026-01-01T00:00:00Z"},organization:{name:"Empresa fixture",slug:"fixture",brand:"Marca fixture",branding:{primaryColor:"#987b45",logoDataUrl:null,version:1}},user:session.user,customers:[],clients:[{id:"local",name:"Local fixture",customerId:null,customerName:null,license:{enabled:true,allowed:true,status:"active",plan:"Teste",cameraLimit:8,expiresAt:null,version:1}}],cameras:[{id:"cam",name:"Portão",client:"local",createdAt:"2026-01-01T00:00:00Z",connectionStatus:"unconfigured"}],events:[],video:{available:false,maxLive:4,maxPerOperator:4,maxCaptures:2}};
const monitoring:Monitoring={rules:[{camera:"cam",version:1,enabled:false,name:"Perímetro",priority:"Alta",days:[1],start:"00:00",end:"00:00",timezone:"America/Sao_Paulo",area:{x:0,y:0,width:100,height:100},targets:["person"],pausedTargets:[]}],locations:[{id:"local",name:"Local fixture",enabled:false,version:0}],service:{enabled:false,interval:60,cooldown:300,dailyLimit:100,version:1,state:"disabled"},detectorAvailable:false,ai:{configured:false,enabled:false,available:false,version:0,used:0,dailyLimit:100,model:"fixture"},jobs:[]};

const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
function props(api:ServiceApi,refresh=vi.fn().mockResolvedValue(state)):PageProps{return {api,state,monitoring,local:"",search:"",refresh,openCamera:vi.fn(),openEvent:vi.fn(),navigate:vi.fn(),notify:vi.fn(),endSession:vi.fn()}}
beforeEach(()=>{window.InvictusLive={start:vi.fn().mockResolvedValue(undefined),stop:vi.fn()};window.InvictusAlerts={start:vi.fn(),stop:vi.fn()}});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()});
it("modal mantém foco ao atualizar callback e Escape usa a callback atual",()=>{
 const first=vi.fn(),second=vi.fn(),view=render(<Modal title="Edição" onClose={first}><input aria-label="Campo de teste"/></Modal>);
 const input=screen.getByLabelText("Campo de teste");input.focus();
 view.rerender(<Modal title="Edição" onClose={second}><input aria-label="Campo de teste"/></Modal>);
 expect(input).toHaveFocus();fireEvent.keyDown(document,{key:"Escape"});expect(second).toHaveBeenCalledTimes(1);expect(first).not.toHaveBeenCalled();
});
it("polling com callback nova não reinicia player e usa o encerramento atual",async()=>{
 const start=vi.fn().mockResolvedValue(undefined),stop=vi.fn(),first=vi.fn(),second=vi.fn(),api=new ServiceApi(vi.fn());window.InvictusLive={start,stop};
 const camera={...state.cameras[0]!,connectionStatus:"configured" as const};
 const view=render(<Live camera={camera} api={api} unauthorized={first}/>);
 fireEvent.click(screen.getByText("Abrir vídeo"));await waitFor(()=>expect(start).toHaveBeenCalledTimes(1));stop.mockClear();
 view.rerender(<Live camera={{...camera}} api={api} unauthorized={second}/>);
 expect(start).toHaveBeenCalledTimes(1);expect(stop).not.toHaveBeenCalled();
 act(()=>start.mock.calls[0]?.[0].onUnauthorized());expect(second).toHaveBeenCalledTimes(1);expect(first).not.toHaveBeenCalled();
});
it("mosaico respeita limite dois sem perder acesso às seis câmeras",()=>{
 const api=new ServiceApi(vi.fn()),six:State={...state,cameras:Array.from({length:6},(_,i)=>({...state.cameras[0]!,id:"cam"+i,name:"Câmera "+i,connectionStatus:"configured"})),video:{...state.video,maxLive:4,maxPerOperator:2}};
 render(<LivePage {...props(api)} state={six} unauthorized={vi.fn()}/>);
 expect(screen.getByLabelText("Câmeras por página")).toHaveValue("2");expect(screen.getAllByLabelText(/^Vídeo Câmera /)).toHaveLength(2);
 fireEvent.click(screen.getByRole("button",{name:"Próxima"}));expect(screen.getByLabelText("Vídeo Câmera 2")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Próxima"}));expect(screen.getByLabelText("Vídeo Câmera 5")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Próxima"})).toBeDisabled();expect(window.InvictusLive.start).not.toHaveBeenCalled();
});
it("cadastro salvo fecha criação mesmo se a atualização da lista falha",async()=>{
 const api=new ServiceApi(vi.fn()),request=vi.spyOn(api,"request").mockResolvedValue({id:"novo"}),refresh=vi.fn().mockRejectedValue(new ApiError(502,"GET indisponível")),p=props(api,refresh);
 render(<ClientsPage {...p}/>);fireEvent.click(screen.getByRole("button",{name:"Novo cliente"}));fireEvent.change(screen.getByLabelText("Nome do cliente"),{target:{value:"Cliente salvo"}});fireEvent.click(screen.getByRole("button",{name:"Salvar",exact:true}));
 await waitFor(()=>expect(screen.queryByRole("dialog")).not.toBeInTheDocument());expect(request).toHaveBeenCalledTimes(1);expect(request).toHaveBeenCalledWith("/customers",expect.objectContaining({method:"POST",body:{name:"Cliente salvo"}}));expect(p.notify).toHaveBeenCalledWith(expect.stringMatching(/Ação gravada; atualização pendente/));
});
it("falha real no POST mantém formulário para correção",async()=>{
 const api=new ServiceApi(vi.fn()),request=vi.spyOn(api,"request").mockRejectedValue(new ApiError(400,"Nome inválido")),p=props(api);
 render(<ClientsPage {...p}/>);fireEvent.click(screen.getByRole("button",{name:"Novo cliente"}));fireEvent.change(screen.getByLabelText("Nome do cliente"),{target:{value:"Nome a corrigir"}});fireEvent.click(screen.getByRole("button",{name:"Salvar",exact:true}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Nome inválido");expect(screen.getByRole("dialog")).toBeInTheDocument();expect(screen.getByLabelText("Nome do cliente")).toHaveValue("Nome a corrigir");expect(request).toHaveBeenCalledTimes(1);expect(p.refresh).not.toHaveBeenCalled();
});
it("401 do player do diálogo encerra sessão e remove dados privados",async()=>{
 const start=vi.fn().mockResolvedValue(undefined),stop=vi.fn();window.InvictusLive={start,stop};
 const current:State={...state,cameras:[{...state.cameras[0]!,connectionStatus:"configured"}],video:{...state.video,available:true},events:[{id:"ev",title:"Registro privado",priority:"Alta",rule:"Teste",createdAt:"2026-01-01T00:00:00Z",status:"Pendente",note:"",version:1,camera:"cam",cameraName:"Portão",hasEvidence:false,claimedBy:null,claimedName:null,pausedTargets:[]}]};
 const connection={configured:true,enabled:true,version:1,host:"192.168.1.64",port:554,profile:"intelbras-mhdx-1208",channel:1,stream:1,available:true,canConfigure:true};
 vi.stubGlobal("fetch",vi.fn((input:RequestInfo|URL)=>{const path=String(input);if(path==="/api/session")return Promise.resolve(json(session));if(path==="/api/state")return Promise.resolve(json(current));if(path==="/api/monitoring")return Promise.resolve(json(monitoring));if(path==="/api/cameras/cam/connection")return Promise.resolve(json(connection));return Promise.reject(Error("Rota inesperada "+path))}));
 render(<OperationalApp/>);await screen.findByRole("heading",{name:"Painel / Ao vivo"});fireEvent.click(screen.getByRole("button",{name:"Câmeras",exact:true}));fireEvent.click(await screen.findByRole("button",{name:"Abrir opções"}));fireEvent.click(await screen.findByRole("button",{name:"Ver ao vivo",exact:true}));fireEvent.click(screen.getByRole("button",{name:"Abrir vídeo",exact:true}));await waitFor(()=>expect(start).toHaveBeenCalledTimes(1));
 act(()=>start.mock.calls[0]?.[0].onUnauthorized());expect(await screen.findByLabelText("Empresa")).toBeInTheDocument();expect(screen.queryByRole("dialog")).not.toBeInTheDocument();expect(screen.queryAllByText("Registro privado")).toHaveLength(0);expect(screen.queryByText("Marca fixture")).not.toBeInTheDocument();expect(stop).toHaveBeenCalled();
});
