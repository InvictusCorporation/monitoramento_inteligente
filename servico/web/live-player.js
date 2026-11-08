// Bounded authenticated players. Camera credentials never reach the browser.
window.InvictusLive={
  players:new Map(),
  stop(key){if(key!==undefined){this.players.get(key)?.();return}for(const cleanup of [...this.players.values()])cleanup()},
  async start({video,status,url,csrf,onUnauthorized,key="modal",retryAttempt=0}) {
    this.stop(key);
    const mime='video/mp4; codecs="avc1.42C01F"';
    const Source=window.MediaSource||window.ManagedMediaSource;
    if(!Source?.isTypeSupported(mime)){status.textContent='Este navegador não suporta este formato de transmissão. Use um navegador compatível com vídeo H.264 e MediaSource.';return}
    const controller=new AbortController(),media=new Source(),objectUrl=URL.createObjectURL(media);
    let closed=false,reader=null,stallTimer,received=false;const startedAt=Date.now();
    const cleanup=()=>{
      if(closed)return;closed=true;if(this.players.get(key)===cleanup)this.players.delete(key);clearTimeout(stallTimer);controller.abort();reader?.cancel().catch(()=>{});
      video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(objectUrl);
    };
    const reconnect=(message,retryable=true)=>{
      if(closed)return;
      const attempt=received&&Date.now()-startedAt>=60000?0:retryAttempt;
      cleanup();
      if(!retryable||attempt>=6){status.textContent=message+' Use Reconectar ou abra o vídeo novamente.';return}
      const wait=Math.min(30000,2000*2**attempt);
      status.textContent=message+' Reconectando em '+(wait/1000)+' s ('+(attempt+1)+'/6).';
      let cancelled=false;
      const cancel=()=>{cancelled=true;clearTimeout(timer);if(this.players.get(key)===cancel)this.players.delete(key)};
      const timer=setTimeout(()=>{if(!cancelled&&this.players.get(key)===cancel)this.start({video,status,url,csrf,onUnauthorized,key,retryAttempt:attempt+1})},wait);
      this.players.set(key,cancel);
    };
    this.players.set(key,cleanup);
    const signal=controller.signal;
    function nextEvent(target,event,action) {
      return new Promise((resolve,reject)=>{
        function clear(){target.removeEventListener(event,ok);target.removeEventListener('error',fail);signal.removeEventListener('abort',abort)}
        function ok(){clear();resolve()}
        function fail(){clear();reject(Error('Não foi possível decodificar o vídeo.'))}
        function abort(){clear();reject(new DOMException('Encerrado','AbortError'))}
        if(signal.aborted)return abort();
        target.addEventListener(event,ok,{once:true});target.addEventListener('error',fail,{once:true});signal.addEventListener('abort',abort,{once:true});
        try{action?.()}catch(error){clear();reject(error)}
      });
    }
    function heartbeat(){clearTimeout(stallTimer);stallTimer=setTimeout(()=>{reconnect('Sem resposta da câmera.')},25000)}
    try {
      status.textContent='Conectando à câmera…';video.muted=true;video.playsInline=true;video.disableRemotePlayback=true;
      const opened=nextEvent(media,'sourceopen',()=>{video.src=objectUrl});
      heartbeat();await opened;
      const buffer=media.addSourceBuffer(mime);
      let response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-CSRF-Token':csrf},signal});
      if(!response.ok){
        let data;try{data=await response.json()}catch{data={}}
        if(response.status===401){cleanup();status.textContent='Sessão encerrada. Entre novamente.';onUnauthorized?.();return}
        reconnect(data.error||'Não foi possível abrir a transmissão.',[500,502,503,504].includes(response.status));return;
      }
      reader=response.body.getReader();
      video.addEventListener('playing',()=>{status.textContent='Ao vivo - sem áudio - conexão contínua'},{signal});
      video.addEventListener('waiting',()=>{status.textContent='Aguardando novos quadros…'},{signal});
      video.addEventListener('error',()=>{reconnect('O navegador não conseguiu reproduzir este vídeo.')},{signal});
      while(!closed) {
        const {value,done}=await reader.read();
        if(done)break;received=true;heartbeat();
        if(buffer.buffered.length&&video.currentTime>20) {
          const before=video.currentTime-15;
          if(buffer.buffered.start(0)<before)await nextEvent(buffer,'updateend',()=>buffer.remove(0,before));
        }
        await nextEvent(buffer,'updateend',()=>buffer.appendBuffer(value));
        if(buffer.buffered.length) {
          const end=buffer.buffered.end(buffer.buffered.length-1);
          if(video.currentTime<buffer.buffered.start(0)||end-video.currentTime>8)video.currentTime=Math.max(buffer.buffered.start(0),end-2);
          if(video.paused)await video.play().catch(()=>{status.textContent='Vídeo recebido. Toque em reproduzir para assistir.'});
        }
      }
      if(!closed)reconnect('Transmissão interrompida.')
    }catch(error){if(!closed)reconnect(error.name==='AbortError'?'Transmissão encerrada.':error.message)}
  }
};
window.addEventListener('pagehide',()=>window.InvictusLive.stop());
