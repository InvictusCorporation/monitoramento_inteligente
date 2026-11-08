import {validateConnection,rtspUrl,VideoError} from './video-gateway.mjs';
export function snapshotArgs(config,a){
  if(!a||['x','y','width','height'].some(k=>!Number.isFinite(a[k]))||a.x<0||a.y<0||a.width<=0||a.height<=0||a.x+a.width>100||a.y+a.height>100)throw new VideoError(400,'Área inválida.');
  return ['-hide_banner','-loglevel','error','-nostdin','-rtsp_transport','tcp','-timeout','10000000','-protocol_whitelist','rtsp,tcp,rtp','-i',rtspUrl(config),'-map','0:v:0','-an','-sn','-dn','-frames:v','1','-vf',`crop=iw*${a.width/100}:ih*${a.height/100}:iw*${a.x/100}:ih*${a.y/100}:exact=1,scale=960:540:force_original_aspect_ratio=decrease`,'-threads','1','-c:v','mjpeg','-q:v','3','-f','image2pipe','pipe:1'];
}
export function captureSnapshot(gateway,config,{owner,cameraId,clientId,area,signal}){
  if(!gateway.ready)throw new VideoError(503,'Serviço de câmera indisponível.');
  validateConnection(config,gateway.endpoints,clientId);
  if(signal?.aborted)throw new VideoError(409,'Captura cancelada.');
  if(gateway.snapshotCount>=gateway.maxSnapshots)throw new VideoError(429,'Limite de capturas atingido. Aguarde as análises em andamento.');
  const args=snapshotArgs(config,area);
  return new Promise((resolve,reject)=>{
    let child;try{child=gateway.spawnProcess(gateway.executable,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','ignore']})}catch{reject(new VideoError(503,'Não foi possível iniciar a captura.'));return}
    let done=false,size=0,killTimer;const chunks=[];
    const stop=(reason='Captura cancelada.')=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);child.stdout.destroy();try{child.kill('SIGTERM')}catch{}killTimer=setTimeout(()=>{try{child.kill('SIGKILL')}catch{}},1500);killTimer.unref();reject(new VideoError(502,reason))};
    const abort=()=>stop();
    const timer=setTimeout(()=>stop('A câmera não respondeu à captura.'),15000);timer.unref();
    const entry={kind:'snapshot',owner,cameraId,stop};gateway.active.add(entry);signal?.addEventListener('abort',abort,{once:true});
    child.stdout.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){stop('Imagem excede o limite.');return}chunks.push(chunk)});
    child.stdout.on('error',()=>stop('Falha ao capturar imagem.'));
    child.once('error',()=>stop('Não foi possível capturar a imagem.'));
    child.once('close',code=>{
      gateway.active.delete(entry);clearTimeout(killTimer);clearTimeout(timer);signal?.removeEventListener('abort',abort);
      if(done)return;done=true;const image=Buffer.concat(chunks);
      if(code!==0||image.length<4||image[0]!==255||image[1]!==216||image.at(-2)!==255||image.at(-1)!==217){reject(new VideoError(502,'A câmera não retornou uma imagem JPEG válida.'));return}
      resolve(image);
    });
  });
}
