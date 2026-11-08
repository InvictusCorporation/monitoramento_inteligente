import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {RuleEditor,Detail,Live} from './OperationalApp';
import {ServiceApi,ApiError} from './api';
import type {Rule,Event,State} from './api';
const rule:Rule={camera:'cam',version:7,enabled:true,name:'Perímetro',priority:'Alta',days:[1],start:'00:00',end:'00:00',timezone:'America/Belem',area:{x:0,y:0,width:100,height:100},targets:['person','vehicle'],pausedTargets:[]};
const event:Event={id:'event',camera:'cam',cameraName:'Portão',title:'Pessoa',priority:'Alta',rule:'Perímetro',createdAt:'2026-11-08T00:00:00Z',status:'Pendente',version:1,note:'',hasEvidence:false,claimedBy:null,claimedName:null,pausedTargets:[]};
afterEach(()=>{cleanup();vi.restoreAllMocks()});
it('dois salvamentos usam a versão confirmada, polling preserva rascunho e conflito permite recarga explícita',async()=>{
 const api=new ServiceApi(()=>{}),refresh=vi.fn().mockResolvedValue(null);
 const request=vi.spyOn(api,'request').mockResolvedValueOnce({version:8}).mockResolvedValueOnce({version:9}).mockRejectedValueOnce(new ApiError(409,'A configuração mudou')).mockResolvedValueOnce({rules:[{...rule,version:10}],service:{},locations:[],jobs:[]});
 const view=render(<RuleEditor rule={rule} api={api} refresh={refresh}/>);
 fireEvent.change(screen.getByLabelText('Pessoa'),{target:{value:'paused'}});
 view.rerender(<RuleEditor rule={{...rule,version:20}} api={api} refresh={refresh}/>);
 expect(screen.getByLabelText('Pessoa')).toHaveValue('paused');
 fireEvent.click(screen.getByText('Salvar categorias'));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByText('Salvar categorias'));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));
 expect(request.mock.calls[0]?.[1]?.body).toMatchObject({version:7,pausedTargets:['person']});expect(request.mock.calls[1]?.[1]?.body).toMatchObject({version:8});
 fireEvent.click(screen.getByText('Salvar categorias'));await screen.findByRole('alert');expect(screen.getByLabelText('Pessoa')).toHaveValue('paused');
 fireEvent.click(screen.getByText('Recarregar regra e descartar rascunho'));await waitFor(()=>expect(screen.getByLabelText('Pessoa')).toHaveValue('detect'));
});
it('assumir preserva observação e nova versão; salvar nota não finaliza nem pausa',async()=>{
 const api=new ServiceApi(()=>{}),close=vi.fn();const confirmed={...event,version:2,status:'Em análise' as const,claimedBy:'operator'};
 const refresh=vi.fn().mockResolvedValueOnce({events:[confirmed]} as State).mockResolvedValueOnce({events:[{...confirmed,version:3,note:'Verificando local'}]} as State);
 const request=vi.spyOn(api,'request').mockImplementation(async path=>path.endsWith('/history')?{entries:[]}:{ok:true});
 render(<Detail event={event} api={api} central close={close} refresh={refresh}/>);
 fireEvent.change(screen.getByLabelText('Observação'),{target:{value:'Verificando local'}});fireEvent.click(screen.getByText('Assumir atendimento'));
 await waitFor(()=>expect(screen.queryByText('Assumir atendimento')).not.toBeInTheDocument());expect(screen.getByLabelText('Observação')).toHaveValue('Verificando local');expect(close).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Salvar observação'));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(2));
 expect(request.mock.calls.find(c=>c[1]?.method==='PATCH')?.[1]?.body).toEqual({version:2,status:'Em análise',note:'Verificando local'});expect(close).not.toHaveBeenCalled();
});
it('cada instância tem chave própria; expansão encerra tile sem interromper modal',async()=>{
 const start=vi.fn().mockResolvedValue(undefined),stop=vi.fn();window.InvictusLive={start,stop};const api=new ServiceApi(()=>{}),unauthorized=vi.fn(),camera={id:'cam',name:'Portão',client:'local',connectionStatus:'configured'},expand=vi.fn();
 const tile=render(<Live camera={camera} api={api} unauthorized={unauthorized} expand={expand}/>);
 fireEvent.click(screen.getByText('Abrir vídeo'));await waitFor(()=>expect(start).toHaveBeenCalledTimes(1));const tileKey=start.mock.calls[0]?.[0].key;
 fireEvent.click(screen.getByLabelText('Expandir Portão'));expect(stop).toHaveBeenCalledWith(tileKey);tile.unmount();
 const modal=render(<Live camera={camera} api={api} unauthorized={unauthorized}/>);fireEvent.click(screen.getByText('Abrir vídeo'));await waitFor(()=>expect(start).toHaveBeenCalledTimes(2));const modalKey=start.mock.calls[1]?.[0].key;expect(modalKey).not.toBe(tileKey);
 stop.mockClear();modal.unmount();expect(stop).toHaveBeenCalledWith(modalKey);expect(stop).not.toHaveBeenCalledWith(tileKey);
});