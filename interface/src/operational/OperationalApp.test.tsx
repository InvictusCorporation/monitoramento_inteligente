import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {afterEach,it,expect,vi} from "vitest";
import {RuleEditor,Detail,Live} from "./OperationalApp";
import {ServiceApi,ApiError} from "./api";
import type {Rule,Event,State} from "./api";
const rule:Rule={camera:"cam",version:7,enabled:true,name:"Perímetro",priority:"Alta",days:[1],start:"00:00",end:"00:00",timezone:"America/Belem",area:{x:0,y:0,width:100,height:100},targets:["person","vehicle"],pausedTargets:[]};
const event:Event={id:"event",camera:"cam",cameraName:"Portão",title:"Pessoa",priority:"Alta",rule:"Perímetro",createdAt:"2026-11-08T00:00:00Z",status:"Pendente",version:1,note:"",hasEvidence:false,claimedBy:null,claimedName:null,pausedTargets:[]};
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it("dois salvamentos usam a versão confirmada, polling preserva rascunho e conflito permite recarga explícita",async()=>{
 const api=new ServiceApi(()=>{}),refresh=vi.fn().mockResolvedValue(null);
 const request=vi.spyOn(api,"request").mockResolvedValueOnce({version:8}).mockResolvedValueOnce({version:9}).mockRejectedValueOnce(new ApiError(409,"A configuração mudou")).mockResolvedValueOnce({rules:[{...rule,version:10}],service:{},locations:[],jobs:[]});
 const view=render(<RuleEditor rule={rule} api={api} refresh={refresh}/>);
 fireEvent.click(screen.getByLabelText("Pausar Pessoa"));
 view.rerender(<RuleEditor rule={{...rule,version:20}} api={api} refresh={refresh}/>);
 expect(screen.getByLabelText("Pausar Pessoa")).toBeChecked();
 fireEvent.click(screen.getByText("Salvar regra completa"));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByText("Salvar regra completa"));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));
 expect(request.mock.calls[0]?.[1]?.body).toMatchObject({version:7,pausedTargets:["person"]});expect(request.mock.calls[1]?.[1]?.body).toMatchObject({version:8});
 fireEvent.click(screen.getByText("Salvar regra completa"));await screen.findByRole("alert");expect(screen.getByLabelText("Pausar Pessoa")).toBeChecked();
 fireEvent.click(screen.getByText("Recarregar regra e descartar rascunho"));await waitFor(()=>expect(screen.getByLabelText("Pausar Pessoa")).not.toBeChecked());
});
it("assumir preserva observação e nova versão; salvar nota não finaliza nem pausa",async()=>{
 const api=new ServiceApi(()=>{}),close=vi.fn(),notify=vi.fn();const confirmed={...event,version:2,status:"Em análise" as const,claimedBy:"operator"};
 const refresh=vi.fn().mockResolvedValueOnce({events:[confirmed]} as State).mockResolvedValueOnce({events:[{...confirmed,version:3,note:"Verificando local"}]} as State);
 const request=vi.spyOn(api,"request").mockResolvedValue({ok:true});
 render(<Detail event={event} api={api} role="operator" userId="operator" close={close} refresh={refresh} notify={notify}/>);
 fireEvent.change(screen.getByLabelText("Registro da verificação"),{target:{value:"Verificando local"}});fireEvent.click(screen.getByText("Assumir atendimento"));
 await waitFor(()=>expect(screen.queryByText("Assumir atendimento")).not.toBeInTheDocument());expect(screen.getByLabelText("Registro da verificação")).toHaveValue("Verificando local");expect(close).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText("Salvar observação sem finalizar"));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));
 expect(request.mock.calls.find(call=>call[1]?.method==="PATCH")?.[1]?.body).toEqual({version:2,status:"Em análise",note:"Verificando local"});expect(close).not.toHaveBeenCalled();
});
it("409 seguido de recarga preserva o rascunho e salva com a versão nova",async()=>{
 const api=new ServiceApi(()=>{}),current={...event,version:2,status:"Em análise" as const,claimedBy:"other",claimedName:"Outra pessoa",note:"Nota do servidor"};
 const refresh=vi.fn().mockResolvedValueOnce({events:[current]} as State).mockResolvedValueOnce({events:[{...current,version:3,note:"Rascunho do operador"}]} as State);
 const request=vi.spyOn(api,"request").mockRejectedValueOnce(new ApiError(409,"Outra pessoa atualizou")).mockResolvedValue({ok:true});
 render(<Detail event={event} api={api} role="operator" userId="operator" close={vi.fn()} refresh={refresh} notify={vi.fn()}/>);
 fireEvent.change(screen.getByLabelText("Registro da verificação"),{target:{value:"Rascunho do operador"}});fireEvent.click(screen.getByText("Salvar observação sem finalizar"));expect(await screen.findByRole("alert")).toHaveTextContent("seu texto será preservado");
 fireEvent.click(screen.getByText("Recarregar ocorrência"));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));expect(screen.getByLabelText("Registro da verificação")).toHaveValue("Rascunho do operador");expect(screen.getByText(/Versão 2/)).toBeInTheDocument();expect(screen.getByText(/Atendimento assumido por Outra pessoa/)).toBeInTheDocument();
 fireEvent.click(screen.getByText("Salvar observação sem finalizar"));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));const patches=request.mock.calls.filter(call=>call[1]?.method==="PATCH");expect(patches[1]?.[1]?.body).toEqual({version:2,status:"Em análise",note:"Rascunho do operador"});expect(screen.getByText(/Versão 3/)).toBeInTheDocument();
});
it("claim, transferência e nota gravados mantêm versões locais quando o refresh falha",async()=>{
 const api=new ServiceApi(()=>{}),refresh=vi.fn().mockRejectedValue(new ApiError(502,"GET indisponível")),notify=vi.fn();
 const request=vi.spyOn(api,"request").mockImplementation(((path:string)=>path==="/operators"?Promise.resolve({operators:[{id:"other",name:"Operador dois",role:"operator"}]}):Promise.resolve({ok:true})) as never);
 render(<Detail event={event} api={api} role="operator" userId="operator" close={vi.fn()} refresh={refresh} notify={notify}/>);
 fireEvent.change(screen.getByLabelText("Registro da verificação"),{target:{value:"Rascunho preservado"}});fireEvent.click(screen.getByText("Assumir atendimento"));expect(await screen.findByText(/Atendimento assumido.*ação gravada/)).toBeInTheDocument();expect(screen.queryByText("Assumir atendimento")).not.toBeInTheDocument();expect(screen.getByText(/Versão 2/)).toBeInTheDocument();
 fireEvent.click(screen.getByText("Transferir atendimento"));await waitFor(()=>expect(screen.getByLabelText("Destinatário")).toBeInTheDocument());fireEvent.change(screen.getByLabelText("Destinatário"),{target:{value:"other"}});fireEvent.change(screen.getByLabelText("Motivo"),{target:{value:"Escalação"}});fireEvent.click(screen.getByText("Confirmar transferência"));expect(await screen.findByText(/Atendimento transferido.*ação gravada/)).toBeInTheDocument();expect(screen.getByText(/Versão 3/)).toBeInTheDocument();expect(screen.queryByText("Transferir atendimento")).not.toBeInTheDocument();
 fireEvent.click(screen.getByText("Salvar observação sem finalizar"));expect(await screen.findByText(/Observação salva.*ação gravada/)).toBeInTheDocument();const patches=request.mock.calls.filter(call=>call[1]?.method==="PATCH");expect(patches[0]?.[1]?.body).toEqual({version:3,status:"Em análise",note:"Rascunho preservado"});expect(screen.getByText(/Versão 4/)).toBeInTheDocument();expect(refresh).toHaveBeenCalledTimes(3);
});
it("salvar situação distingue PATCH gravado de GET falho",async()=>{
 const api=new ServiceApi(()=>{}),close=vi.fn(),notify=vi.fn(),refresh=vi.fn().mockRejectedValue(new ApiError(502,"GET indisponível"));vi.spyOn(api,"request").mockResolvedValue({ok:true});
 render(<Detail event={event} api={api} role="operator" userId="operator" close={close} refresh={refresh} notify={notify}/>);fireEvent.change(screen.getByLabelText("Registro da verificação"),{target:{value:"Verificação concluída"}});fireEvent.click(screen.getByText("Salvar situação e verificação"));await waitFor(()=>expect(close).toHaveBeenCalled());expect(notify).toHaveBeenCalledWith(expect.stringMatching(/Ocorrência atualizada.*ação gravada.*atualização pendente/));
});
it("cada instância tem chave própria; expansão encerra tile sem interromper modal",async()=>{
 const start=vi.fn().mockResolvedValue(undefined),stop=vi.fn();window.InvictusLive={start,stop};const api=new ServiceApi(()=>{}),unauthorized=vi.fn(),camera={id:"cam",name:"Portão",client:"local",createdAt:"2026-01-01T00:00:00Z",connectionStatus:"configured" as const},expand=vi.fn();
 const tile=render(<Live camera={camera} api={api} unauthorized={unauthorized} expand={expand}/>);
 fireEvent.click(screen.getByText("Abrir vídeo"));await waitFor(()=>expect(start).toHaveBeenCalledTimes(1));const tileKey=start.mock.calls[0]?.[0].key;
 fireEvent.click(screen.getByLabelText("Expandir Portão"));expect(stop).toHaveBeenCalledWith(tileKey);tile.unmount();
 const modal=render(<Live camera={camera} api={api} unauthorized={unauthorized}/>);fireEvent.click(screen.getByText("Abrir vídeo"));await waitFor(()=>expect(start).toHaveBeenCalledTimes(2));const modalKey=start.mock.calls[1]?.[0].key;expect(modalKey).not.toBe(tileKey);
 stop.mockClear();modal.unmount();expect(stop).toHaveBeenCalledWith(modalKey);expect(stop).not.toHaveBeenCalledWith(tileKey);
});
