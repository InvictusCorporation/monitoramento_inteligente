// Poll only the alert strip: camera playback and open forms are never re-rendered.
window.InvictusAlerts={
  generation:0,timer:null,controller:null,seen:new Set(),initialized:false,sound:false,audio:null,duration:6,volume:50,tone:null,
  stop(){this.stopTone();this.generation++;clearTimeout(this.timer);this.timer=null;this.controller?.abort();this.controller=null;this.seen.clear();this.initialized=false;this.sound=false;this.audio?.close().catch(()=>{});this.audio=null;document.getElementById('alertStrip').hidden=true;document.getElementById('alertItems').replaceChildren()},
  async toggleSound(){
    if(this.sound){this.sound=false;this.stopTone()}else{
      try{const Audio=window.AudioContext||window.webkitAudioContext;this.audio??=new Audio();await this.audio.resume();this.sound=this.audio.state==='running';if(this.sound)this.beep()}catch{this.sound=false}
    }
    document.getElementById('alertSound').textContent=this.sound?'Silenciar som':'Ativar som';
    document.getElementById('alertSound').setAttribute('aria-pressed',String(this.sound));
    if(!this.sound&&this.audio?.state==='suspended')document.getElementById('alertConnection').textContent='Som bloqueado pelo navegador. Tente ativar novamente.';
  },
  stopTone(){const tone=this.tone;this.tone=null;if(tone){try{tone.oscillator.stop()}catch{}tone.oscillator.disconnect();tone.gain.disconnect()}},
  beep(){
    if(!this.sound||this.audio?.state!=='running'||this.tone)return;
    const oscillator=this.audio.createOscillator(),gain=this.audio.createGain(),start=this.audio.currentTime;
    const seconds=[3,6,10].includes(this.duration)?this.duration:6,level=Math.max(0,Math.min(100,this.volume))/100*.18;
    oscillator.connect(gain);gain.connect(this.audio.destination);oscillator.type='sine';
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.05);
    for(let i=0;i<seconds*2;i++)oscillator.frequency.setValueAtTime(i%2?980:740,start+i*.5);
    gain.gain.setValueAtTime(level,start+seconds-.1);gain.gain.linearRampToValueAtTime(0,start+seconds);
    const tone={oscillator,gain};this.tone=tone;
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(this.tone===tone)this.tone=null};
    oscillator.start(start);oscillator.stop(start+seconds);
  },
  start({role,api,open}){
    if(role==='client'){this.stop();return}
    this.open=open;this.api=api;
    if(this.timer||this.controller)return;
    const generation=this.generation,strip=document.getElementById('alertStrip');strip.hidden=false;
    document.getElementById('alertSound').textContent='Ativar som';document.getElementById('alertSound').setAttribute('aria-pressed','false');
    document.getElementById('alertSound').onclick=()=>this.toggleSound();
    const duration=document.getElementById('alertDuration'),volume=document.getElementById('alertVolume');
    if(duration){duration.value=String(this.duration);duration.onchange=()=>{const value=Number(duration.value);if([3,6,10].includes(value))this.duration=value}}
    if(volume){volume.value=String(this.volume);volume.oninput=()=>{const value=Number(volume.value);if(Number.isFinite(value))this.volume=Math.max(0,Math.min(100,value))}}
    const test=document.getElementById('testAlertSound');if(test)test.onclick=async()=>{this.stopTone();if(!this.sound)await this.toggleSound();else this.beep()};
    const poll=async()=>{
      if(generation!==this.generation)return;
      this.timer=null;const controller=new AbortController();this.controller=controller;
      const timeout=setTimeout(()=>controller.abort(),10000);let retryDelay=2000;
      try{
        const data=await this.api('/alerts',{signal:this.controller.signal});if(generation!==this.generation)return;
        const fresh=data.events.some(e=>!this.seen.has(e.alertKey||e.id));for(const e of data.events)this.seen.add(e.alertKey||e.id);
        if(this.initialized&&fresh)this.beep();this.initialized=true;
        document.getElementById('alertCount').textContent=data.count?`${data.count} ocorrência(s) para atenção${data.overdueCount?' · '+data.overdueCount+' com prazo excedido':''}`:'Nenhuma ocorrência para atenção';
        strip.classList.toggle('hasalerts',data.count>0);
        document.getElementById('alertConnection').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR')+' · consulta a cada 2 s após a resposta; som exige esta página aberta';
        const list=document.getElementById('alertItems');list.replaceChildren();
        for(const e of data.events){const button=document.createElement('button');button.type='button';button.textContent=`${e.overdue?'Prazo excedido · ':''}${e.transferredToMe?'Transferida para você · ':''}${e.priority} · ${e.cameraName} · ${e.title}`;button.onclick=()=>this.open(e.id);list.append(button)}
      }catch{retryDelay=10000;if(generation===this.generation)document.getElementById('alertConnection').textContent='Sem atualização dos alertas. Verifique a conexão.'}
      finally{clearTimeout(timeout);if(generation===this.generation){this.controller=null;this.timer=setTimeout(poll,retryDelay)}}
    };poll();
  }
};
window.addEventListener('pagehide',()=>window.InvictusAlerts.stop());
