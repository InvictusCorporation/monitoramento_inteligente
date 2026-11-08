import {audit,transaction} from './database.mjs';
export function serviceConfig(db,org){
  const row=db.prepare('SELECT * FROM monitoring_service WHERE org_id=?').get(org);
  return row?{enabled:Boolean(row.enabled),owner:row.owner_id,interval:row.interval_seconds,cooldown:row.cooldown_seconds,dailyLimit:row.daily_limit,version:row.version}:{enabled:false,owner:null,interval:60,cooldown:300,dailyLimit:100,version:0};
}
function invalid(status,message){return Object.assign(new Error(message),{status})}
export class MonitoringWorker {
  constructor({db,detector,now=Date.now}){Object.assign(this,{db,detector,now});this.running=new Map();this.timer=null;this.closed=false}
  start(){if(!this.timer&&!this.closed){this.db.prepare("UPDATE monitoring_jobs SET status='interrupted',message='Execução anterior interrompida; aguardando próxima tentativa' WHERE status='running'").run();this.timer=setInterval(()=>this.tick(),2000);this.timer.unref()}}
  status(org){
    const config=serviceConfig(this.db,org),ai=this.detector.settings(org);
    const owner=config.owner?this.db.prepare('SELECT active,role FROM users WHERE id=? AND org_id=?').get(config.owner,org):null;
    let state=!config.enabled?'disabled':!owner?.active||owner.role!=='admin'?'owner_unavailable':!ai.available?'ai_unavailable':ai.used>=config.dailyLimit?'daily_limit':'scheduled';
    return {...config,owner:undefined,state,active:[...this.running.values()].filter(r=>r.org===org).length};
  }
  save(u,data){
    if(u.role!=='admin')throw invalid(403,'Somente o administrador pode configurar o serviço contínuo.');
    if(typeof data.enabled!=='boolean'||!Number.isInteger(data.version)||!Number.isInteger(data.interval)||data.interval<10||data.interval>3600||!Number.isInteger(data.cooldown)||data.cooldown<30||data.cooldown>86400||!Number.isInteger(data.dailyLimit)||data.dailyLimit<1||data.dailyLimit>10000)throw invalid(400,'Informe intervalo de 10 a 3600 segundos, alertas de 30 a 86400 segundos e limite diário de 1 a 10000.');
    const old=serviceConfig(this.db,u.org_id);
    if(old.version!==data.version)throw invalid(409,'Configuração alterada. Abra novamente.');
    if(data.enabled&&!this.detector.settings(u.org_id).available)throw invalid(409,'Habilite a OpenAI e a conexão de vídeo antes de iniciar.');
    transaction(this.db,()=>{
      this.db.prepare(`INSERT INTO monitoring_service VALUES(?,?,?,?,?,?,?) ON CONFLICT(org_id) DO UPDATE SET owner_id=excluded.owner_id,enabled=excluded.enabled,interval_seconds=excluded.interval_seconds,cooldown_seconds=excluded.cooldown_seconds,daily_limit=excluded.daily_limit,version=excluded.version`).run(u.org_id,u.id,Number(data.enabled),data.interval,data.cooldown,data.dailyLimit,data.version+1);
      audit(this.db,u,data.enabled?'monitoring.service.enabled':'monitoring.service.disabled',u.org_id);
    });
    // Both manual and background work must discard results under the old policy.
    for(const task of this.detector.busy.values())if(task.org===u.org_id)task.controller.abort();
    for(const task of this.running.values())if(task.org===u.org_id)task.controller.abort();
  }
  tick(){
    if(this.closed)return;
    // No overlapping camera jobs; oldest attempts get priority, including across restarts.
    try{
      const candidates=this.db.prepare(`SELECT c.id,c.org_id,s.owner_id,s.version,s.interval_seconds FROM cameras c
        JOIN monitoring_service s ON s.org_id=c.org_id AND s.enabled=1
        LEFT JOIN monitoring_jobs j ON j.camera_id=c.id
        ORDER BY COALESCE(j.attempt_at,0),c.id`).all();
      for(const c of candidates){
        if(this.detector.busy.size>=2||this.running.size>=2)break;
        if(this.running.has(c.id)||this.detector.busy.has(c.id))continue;
        const owner=this.db.prepare("SELECT * FROM users WHERE id=? AND org_id=? AND active=1 AND role='admin'").get(c.owner_id,c.org_id);
        if(!owner)continue;
        const ai=this.detector.settings(c.org_id);if(!ai.available||ai.used>=ai.dailyLimit)continue;
        const job=this.db.prepare('SELECT * FROM monitoring_jobs WHERE camera_id=?').get(c.id);
        if(job&&this.now()<job.next_at)continue;
        if(this.detector.lastStart.has(c.id)&&this.now()-this.detector.lastStart.get(c.id)<10000)continue;
        if(this.detector.gateway.snapshotCount>=this.detector.gateway.maxSnapshots)continue;
        try{this.detector.eligibility(owner,c.id)}catch{continue}
        const controller=new AbortController();
        const authorize=()=>{if(this.closed||controller.signal.aborted)return false;const cfg=serviceConfig(this.db,c.org_id);const user=this.db.prepare('SELECT active,role FROM users WHERE id=? AND org_id=?').get(c.owner_id,c.org_id);return cfg.enabled&&cfg.version===c.version&&cfg.owner===c.owner_id&&user?.active===1&&user.role==='admin'};
        this.db.prepare(`INSERT INTO monitoring_jobs VALUES(?,?,?,?,?,?) ON CONFLICT(camera_id) DO UPDATE SET attempt_at=excluded.attempt_at,next_at=excluded.next_at,status=excluded.status,message=excluded.message`).run(c.id,c.org_id,this.now(),this.now()+c.interval_seconds*1000,'running','Análise em andamento');
        const task={org:c.org_id,controller,promise:null};this.running.set(c.id,task);
        task.promise=this.detector.analyze(owner,c.id,{authorize,signal:controller.signal,background:true}).then(result=>{
          const message=result.detectedTargets?.length?result.detectedTargets.map(t=>({person:'Pessoa',vehicle:'Veículo',animal:'Animal'})[t]).join(' + ')+' — detecção':({person:'Pessoa detectada',vehicle:'Veículo detectado',animal:'Animal detectado',absent:'Alvo não identificado nesta captura',uncertain:'Imagem inconclusiva'})[result.outcome]||'Imagem inconclusiva';
          this.finish(c,'ok',message,c.interval_seconds);
        }).catch(error=>{
          // Provider failures back off for five minutes rather than repeatedly spend API calls.
          this.finish(c,controller.signal.aborted?'cancelled':'error',error.status?error.message:'Falha de análise. Verifique a instalação.',error.status===502?Math.max(c.interval_seconds,300):c.interval_seconds);
        }).finally(()=>this.running.delete(c.id));
      }
    }catch{ /* next tick retries without logging credentials or terminating the HTTP server */ }
  }
  finish(c,status,message,seconds){
    const finished=this.now(),job=this.db.prepare('SELECT attempt_at FROM monitoring_jobs WHERE camera_id=? AND org_id=?').get(c.id,c.org_id);
    // Successful cadence is measured from the start; failures keep completion-based backoff.
    const next=status==='ok'&&job?Math.max(finished,job.attempt_at+seconds*1000):finished+seconds*1000;
    this.db.prepare('UPDATE monitoring_jobs SET next_at=?,status=?,message=? WHERE camera_id=? AND org_id=?').run(next,status,message.slice(0,300),c.id,c.org_id);
  }
  async close(){this.closed=true;clearInterval(this.timer);this.timer=null;for(const t of this.running.values())t.controller.abort();await Promise.allSettled([...this.running.values()].map(t=>t.promise))}
}
