// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {CameraDialog} from "./Cameras";

const camera={id:"camera-1",name:"Entrada",client:"Local A",createdAt:"2026-01-01T00:00:00.000Z",connectionStatus:"configured" as const};
const connection={configured:true,enabled:true,version:3,host:"192.168.1.64",port:554,profile:"intelbras-mhdx-1208" as const,channel:1,stream:1,available:true,canConfigure:true};

afterEach(cleanup);
describe("destino das credenciais preservadas",()=>{
 it("preserva no mesmo destino e exige segredo ao mudar host ou porta",async()=>{
  const request=vi.fn(async(path:string,init?:RequestInit)=>{
   if(path==="/state")return{clientName:"Empresa A"};
   if(init?.method==="POST")return{ok:true};
   return connection;
  });
  const api={request} as never;
  render(<CameraDialog camera={camera} api={api} close={()=>{}} refresh={vi.fn(async()=>null)} notify={()=>{}} unauthorized={()=>{}}/>);
  fireEvent.click(await screen.findByRole("button",{name:"Alterar conexão"}));
  const keep=screen.getByRole("checkbox",{name:/Manter as credenciais/}) as HTMLInputElement;
  expect(keep.checked).toBe(true);expect(keep.disabled).toBe(false);
  expect(screen.queryByLabelText("Senha do equipamento")).toBeNull();
  fireEvent.change(screen.getByLabelText("Canal"),{target:{value:"2"}});
  fireEvent.click(screen.getByRole("button",{name:"Salvar conexão"}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith("/cameras/camera-1/connection",expect.objectContaining({method:"POST"})));
  const saved=request.mock.calls.find(([,init])=>init?.method==="POST")?.[1];
  expect(saved?.body).toMatchObject({channel:2,host:"192.168.1.64",port:554,preserveCredentials:true,version:3});
  fireEvent.click(await screen.findByRole("button",{name:"Alterar conexão"}));
  fireEvent.change(screen.getByLabelText("Endereço IPv4"),{target:{value:"192.168.1.65"}});
  expect(screen.getByLabelText("Usuário do equipamento")).toBeTruthy();
  expect(screen.getByLabelText("Senha do equipamento")).toBeTruthy();
  expect((screen.getByRole("checkbox",{name:/Manter as credenciais/}) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText(/Host ou porta alterados/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Porta RTSP"),{target:{value:"8554"}});
  expect(screen.getByLabelText("Senha do equipamento")).toBeTruthy();
 });
});
