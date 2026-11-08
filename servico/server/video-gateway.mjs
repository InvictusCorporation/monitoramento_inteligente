import { captureSnapshot } from './snapshot.mjs';
import { isIP } from 'node:net';
import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { isAbsolute } from 'node:path';
import { normalizeCameraProfile } from './camera-profiles.mjs';

export const VIDEO_MIME='video/mp4; codecs="avc1.42C01F"';
export class VideoError extends Error {constructor(status,message){super(message);this.status=status}}
function ipv4(host) {
  if(isIP(host)!==4) return false;
  const [a,b]=host.split('.').map(Number);
  return a!==0&&a!==127&&a<224&&!(a===169&&b===254);
}
export function parseEndpoints(value='[]') {
  let list;try{list=JSON.parse(value)}catch{throw Error('CAMERA_ALLOWED_ENDPOINTS deve ser uma lista JSON com clientId e address.')}
  if(!Array.isArray(list)||list.length>1000)throw Error('Lista de destinos inválida.');
  const result=new Set();
  for(const entry of list){
    if(!entry||typeof entry.address!=='string'||typeof entry.clientId!=='string'||!entry.clientId||entry.clientId.includes('|'))throw Error('Destino inválido. Informe clientId e address.');
    const [host,port,...extra]=entry.address.split(':');
    if(!ipv4(host)||extra.length||!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535||String(Number(port))!==port)throw Error('Destino inválido. Use IPv4:porta.');
    result.add(`${entry.clientId}|${entry.address}`);
  }
  return result;
}
export function validateConnection(data, endpoints, clientId) {
  data=normalizeCameraProfile(data);
  if(typeof data.host!=='string'||!ipv4(data.host))throw new VideoError(400,'Informe o IPv4 do equipamento.');
  const port=Number(data.port);
  if(!Number.isInteger(port)||port<1||port>65535)throw new VideoError(400,'Porta inválida.');
  if(!endpoints.has(`${clientId}|${data.host}:${port}`))throw new VideoError(400,'Esse endereço ainda não foi autorizado para este local. Solicite a liberação ao administrador da instalação.');
  if(typeof data.path!=='string'||!data.path.startsWith('/')||data.path.startsWith('//')||data.path.length>1000||/[\s\u0000-\u001f\u007f#\\]/.test(data.path))throw new VideoError(400,'Informe um caminho RTSP válido, iniciando com /.');
  for(const key of ['username','password'])if(typeof data[key]!=='string'||data[key].length>256||/[\u0000-\u001f\u007f]/.test(data[key]))throw new VideoError(400,'Usuário ou senha do equipamento inválidos.');
  return {host:data.host,port,path:data.path,username:data.username,password:data.password,
    ...(data.profile&&data.profile!=='manual'?{profile:data.profile,channel:data.channel,stream:data.stream}:{})};
}
export function rtspUrl(config) {
  const auth=config.username||config.password?`${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`:'';
  return `rtsp://${auth}${config.host}:${config.port}${config.path}`;
}
export function ffmpegArgs(config) {
  return ['-hide_banner','-loglevel','error','-nostdin','-rtsp_transport','tcp','-timeout','10000000',
    '-protocol_whitelist','rtsp,tcp,rtp','-i',rtspUrl(config),'-map','0:v:0','-an','-sn','-dn',
    '-vf','scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=15',
    '-c:v','libx264','-preset','ultrafast','-tune','zerolatency','-profile:v','baseline','-level:v','3.1',
    '-pix_fmt','yuv420p','-g','15','-keyint_min','15','-sc_threshold','0','-b:v','1500k','-maxrate','2000k','-bufsize','3000k',
    '-threads','1','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','pipe:1'];
}
export class VideoGateway {
  constructor({ executable='', endpoints=new Set(), spawnProcess=spawn, maxStreams=4, maxStreamsPerOwner=maxStreams, maxSnapshots=2, startupMs=15000, idleMs=20000, sessionMs=0, leaseMs=2000, checkExecutable=true }={}) {
    this.executable=executable;this.endpoints=endpoints;this.spawnProcess=spawnProcess;
    if(!Number.isInteger(maxStreams)||maxStreams<1||maxStreams>64||!Number.isInteger(maxSnapshots)||maxSnapshots<1||maxSnapshots>8)throw Error('Capacidade inválida.');
    this.maxSnapshots=maxSnapshots;
    if(!Number.isInteger(maxStreamsPerOwner)||maxStreamsPerOwner<1||maxStreamsPerOwner>maxStreams)throw Error('Limite por operador inválido.');
    this.maxStreamsPerOwner=maxStreamsPerOwner;
    this.maxStreams=maxStreams;this.startupMs=startupMs;this.idleMs=idleMs;this.sessionMs=sessionMs;this.leaseMs=leaseMs;this.active=new Set();
    if(executable&&checkExecutable){if(!isAbsolute(executable))throw Error('FFMPEG_PATH deve ser um caminho absoluto.');accessSync(executable,constants.F_OK)}
  }
  get ready(){return Boolean(this.executable)&&this.endpoints.size>0}
  start(config,{owner,cameraId,clientId,authorize,onEnd=()=>{}}) {
    if(!this.ready)throw new VideoError(503,'A transmissão ainda não foi habilitada nesta instalação.');
    validateConnection(config,this.endpoints,clientId);
    if(this.ownerLiveCount(owner)>=this.maxStreamsPerOwner)throw new VideoError(429,'Limite de vídeos desta conta atingido. Feche um vídeo, inclusive em outras abas, e tente novamente.');
    if(this.liveCount>=this.maxStreams||[...this.active].some(s=>s.kind!=='snapshot'&&s.owner===owner&&s.cameraId===cameraId))throw new VideoError(429,'Limite de transmissões atingido. Encerre o vídeo aberto e tente novamente.');
    if(!authorize())throw new VideoError(401,'Sua sessão não permite abrir esta câmera.');
    // No shell, no raw command/errors in logs. The service account must be isolated.
    let child;try{child=this.spawnProcess(this.executable,ffmpegArgs(config),{shell:false,windowsHide:true,stdio:['ignore','pipe','ignore']})}
    catch{throw new VideoError(503,'Não foi possível iniciar o serviço de vídeo.')}
    let ended=false, timer,lease,totalTimer,killTimer,settled=false;
    const entry={kind:'live',owner,cameraId,stop:null};this.active.add(entry);
    let resolveReady,rejectReady;
    const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
    const stop=(reason='Transmissão encerrada.')=>{
      if(ended)return;ended=true;clearTimeout(timer);clearInterval(lease);clearTimeout(totalTimer);
      child.stdout.destroy();
      if(!settled){settled=true;rejectReady(new VideoError(502,reason))}
      try{child.kill('SIGTERM')}catch{}
      killTimer=setTimeout(()=>{try{child.kill('SIGKILL')}catch{}},1500);killTimer.unref();
      onEnd(reason);
    };
    entry.stop=stop;
    const timeout=ms=>{clearTimeout(timer);timer=setTimeout(()=>stop('A câmera não enviou vídeo no tempo esperado.'),ms);timer.unref()};
    timeout(this.startupMs);
    lease=setInterval(()=>{try{if(!authorize())stop('O acesso à câmera foi encerrado.')}catch{stop('O acesso à câmera foi encerrado.')}},this.leaseMs);lease.unref();
    if(this.sessionMs>0){totalTimer=setTimeout(()=>stop('Limite configurado da sessão atingido.'),this.sessionMs);totalTimer.unref()}
    child.once('error',()=>stop('Não foi possível iniciar o serviço de vídeo.'));
    child.stdout.on('error',()=>stop('Falha no transporte de vídeo.'));
    child.once('close',()=>{this.active.delete(entry);stop('A conexão com a câmera foi encerrada.');clearTimeout(killTimer)});
    child.stdout.once('readable',()=>{
      if(ended)return;
      const first=child.stdout.read();
      if(!first)return;
      timeout(this.idleMs);settled=true;
      resolveReady({first,stream:child.stdout});
    });
    return {ready,stop,touch:()=>timeout(this.idleMs)};
  }
  snapshot(config,options){return captureSnapshot(this,config,options)}
  get liveCount(){return [...this.active].filter(s=>s.kind!=='snapshot').length}
  get snapshotCount(){return [...this.active].filter(s=>s.kind==='snapshot').length}
  ownerLiveCount(owner){return [...this.active].filter(s=>s.kind!=='snapshot'&&s.owner===owner).length}
  stopCamera(id){for(const stream of this.active)if(stream.cameraId===id)stream.stop('A configuração da câmera foi alterada.')}
  stopOwner(id){for(const stream of this.active)if(stream.owner===id)stream.stop('O acesso foi encerrado.')}
  close(){for(const stream of this.active)stream.stop('Serviço encerrado.')}
}
