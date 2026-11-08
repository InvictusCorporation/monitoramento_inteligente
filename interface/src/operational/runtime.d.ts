import type { ServiceApi } from "./api";
declare global {
  interface Window {
    InvictusLive:{start(options:{video:HTMLVideoElement;status:HTMLElement;url:string;csrf:string;key:string;onUnauthorized:()=>void}):Promise<void>;stop(key?:string):void};
    InvictusAlerts:{start(options:{role:string;api:(path:string,options?:Parameters<ServiceApi["request"]>[1])=>Promise<unknown>;open:(id:string)=>void}):void;stop():void};
  }
}