import {createHash} from 'node:crypto';
import {PassThrough} from 'node:stream';
import {VideoGateway,VideoError,validateConnection} from './video-gateway.mjs';
import {Mp4Fragments} from './mp4-fragments.mjs';

export class SharedVideoGateway extends VideoGateway {
  constructor(options={}){super(options);this.viewers=new Set();this.producers=new Map();this.maxViewerBuffer=4*1024*1024}
  get viewerCount(){return this.viewers.size}
  ownerLiveCount(owner){return [...this.viewers].filter(v=>v.owner===owner).length}
  start(config,{owner,cameraId,clientId,orgId,version,authorize,onEnd=()=>{}}){
    if(!this.ready)throw new VideoError(503,'A transmissão ainda não foi habilitada nesta instalação.');
    const normalized=validateConnection(config,this.endpoints,clientId);
    if(!orgId||!cameraId||!clientId||!Number.isInteger(version)||version<1)throw new VideoError(400,'Identificação da transmissão incompleta.');
    const allowed=()=>{try{return authorize()===true}catch{return false}};
    if(!allowed())throw new VideoError(401,'Sua sessão não permite abrir esta câmera.');
    if(this.viewerCount>=this.maxStreams||this.ownerLiveCount(owner)>=this.maxStreamsPerOwner||[...this.viewers].some(v=>v.owner===owner&&v.cameraId===cameraId))throw new VideoError(429,'Limite de vídeos atingido. Feche um vídeo desta conta, inclusive em outras abas, e tente novamente.');
    const key=createHash('sha256').update(JSON.stringify([orgId,clientId,cameraId,version,normalized])).digest('hex');
    let producer=this.producers.get(key);
    if(!producer){producer={key,cameraId,viewers:new Set(),job:null,ended:false};this.producers.set(key,producer)}
    const stream=new PassThrough({highWaterMark:64*1024});
    let resolveReady,rejectReady,settled=false,ended=false,lease,total,startup;
    const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
    // A producer can fail synchronously before the caller receives the job.
    ready.catch(()=>{});
    const stop=(reason='Transmissão encerrada.')=>{
      if(ended)return;ended=true;clearInterval(lease);clearTimeout(total);clearTimeout(startup);
      this.viewers.delete(viewer);producer.viewers.delete(viewer);stream.destroy();
      if(!settled){settled=true;rejectReady(new VideoError(502,reason))}
      if(!producer.viewers.size)this.endProducer(producer,reason);
      onEnd(reason);
    };
    const viewer={owner,cameraId,stop,allowed,deliver:(init,fragment)=>{
      if(ended)return;
      if(!allowed()){stop('O acesso à câmera foi encerrado.');return}
      if(!settled){settled=true;clearTimeout(startup);resolveReady({first:Buffer.concat([init,fragment]),stream});return}
      // A slow connection never pauses the shared producer or grows an unbounded queue.
      if(stream.readableLength+stream.writableLength+fragment.length>this.maxViewerBuffer){stop('A conexão não acompanha o vídeo. Reconecte para continuar.');return}
      stream.write(fragment);
    }};
    this.viewers.add(viewer);producer.viewers.add(viewer);
    lease=setInterval(()=>{if(!allowed())stop('O acesso à câmera foi encerrado.')},this.leaseMs);lease.unref();
    if(this.sessionMs>0){total=setTimeout(()=>stop('Limite configurado da sessão de vídeo.'),this.sessionMs);total.unref()}
    startup=setTimeout(()=>stop('A câmera não enviou vídeo no tempo esperado.'),this.startupMs);startup.unref();
    if(!producer.job){
      try{
        producer.job=super.start(normalized,{owner:Symbol('producer'),cameraId,clientId,authorize:()=>!producer.ended&&producer.viewers.size>0,onEnd:reason=>this.endProducer(producer,reason)});
        const parser=new Mp4Fragments((init,fragment)=>{for(const v of [...producer.viewers])v.deliver(init,fragment)});
        const consume=chunk=>{
          if(producer.ended)return;
          try{parser.push(chunk);producer.job.touch()}catch{this.endProducer(producer,'O serviço retornou um vídeo inválido.')}
        };
        producer.job.ready.then(({first,stream:source})=>{
          if(producer.ended)return;
          source.on('error',()=>this.endProducer(producer,'Falha no transporte de vídeo.'));
          consume(first);source.on('data',consume);
        }).catch(()=>this.endProducer(producer,'Não foi possível receber vídeo da câmera.'));
      }catch(error){stop();throw error}
    }
    // Late viewers wait for the next complete keyframe fragment, with the init segment.
    return {ready,stop,touch:()=>{}};
  }
  endProducer(producer,reason){
    if(producer.ended)return;producer.ended=true;
    if(this.producers.get(producer.key)===producer)this.producers.delete(producer.key);
    for(const viewer of [...producer.viewers])viewer.stop(reason);
    producer.job?.stop(reason);
  }
  stopOwner(owner){for(const v of [...this.viewers])if(v.owner===owner)v.stop('O acesso foi encerrado.');super.stopOwner(owner)}
  close(){for(const p of [...this.producers.values()])this.endProducer(p,'Serviço encerrado.');super.close()}
}
