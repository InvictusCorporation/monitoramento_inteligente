import {locationLicense} from './commercial.mjs';
import {inSchedule,validateRule} from './monitoring.mjs';
export function cameraHealth(row,{service,ai,videoReady,now,busy=false,license=null}){
  const result=(code,label,action,attention=false)=>({code,label,action,attention});
  if(license&&!license.allowed)return result('license_'+license.status,'Licença patrimonial '+({pending:'pendente',suspended:'suspensa',expired:'vencida'}[license.status]||'indisponível'),'Solicite a revisão da licença à gestão comercial.',true);
  if(!row.connection_version)return result('unconfigured','Sem conexão configurada','Abra as opções da câmera e configure o DVR.',true);
  if(!row.connection_enabled)return result('camera_disabled','Conexão desabilitada','Habilite a conexão nas opções da câmera.');
  if(!videoReady)return result('video_unavailable','Serviço de vídeo indisponível','Verifique a instalação e o executável de vídeo.',true);
  if(!row.rule_config)return result('no_rule','Sem regra de monitoramento','Cadastre uma regra no menu Monitoramento.',true);
  let rule;try{rule=validateRule(JSON.parse(row.rule_config))}catch{return result('invalid_rule','Regra inválida','Edite e salve novamente a regra da câmera.',true)}
  if(!row.location_enabled)return result('location_disabled','Local desabilitado','Habilite o local em Monitoramento quando desejar analisar.');
  if(!rule.enabled)return result('rule_disabled','Regra desabilitada','Habilite a regra quando desejar analisar.');
  if(!inSchedule(rule,new Date(now)))return result('outside_schedule','Fora do horário','Confira os dias, horários e o fuso da regra.');
  if(!service.enabled)return result('service_disabled','Serviço contínuo desativado','Análise automática depende de ativação pelo administrador.');
  if(service.state==='owner_unavailable')return result('owner_unavailable','Responsável indisponível','Um administrador ativo deve salvar a configuração do serviço.',true);
  if(!ai.configured||!ai.enabled||!ai.available)return result('ai_unavailable','IA indisponível ou desativada','Confira Configurar OpenAI e o serviço de vídeo.',true);
  if(ai.used>=ai.dailyLimit)return result('daily_limit','Limite diário atingido','Aguarde o próximo dia UTC ou revise o limite com o administrador.',true);
  if(busy)return result('analyzing','Análise em andamento','Aguarde o resultado.');
  if(row.job_status==='error')return result('last_error','Última tentativa automática falhou','Confira a mensagem abaixo, conexão do DVR, internet e conta OpenAI.',true);
  if(row.job_status==='interrupted'||row.job_status==='cancelled')return result('interrupted','Última tentativa interrompida','O serviço tentará novamente enquanto a regra estiver elegível.',true);
  if(!row.checked_at)return result('awaiting_first','Aguardando primeira análise concluída','Aguarde a fila; confirme se há capacidade de câmera disponível.');
  const baseline=Math.max(Date.parse(row.checked_at)||0,row.attempt_at||0);
  if(now-baseline>(service.interval+90)*1000&&(!row.next_at||row.next_at<=now))return result('delayed','Análise automática atrasada','Confira a fila e feche vídeos se todas as conexões estiverem ocupadas.',true);
  return result('scheduled','Aguardando próxima análise','Último resultado é histórico; não confirma conexão atual.');
}
export function diagnostics(db,u,{worker,detector,gateway,now}){
  const client=u.role==='client'?u.client_id:null,service=worker.status(u.org_id),ai=detector.settings(u.org_id);
  const rows=db.prepare(`SELECT c.id,c.name,c.client_id AS client,l.name AS location,
    cc.enabled AS connection_enabled,cc.version AS connection_version,
    ml.enabled AS location_enabled,mr.config AS rule_config,
    ac.checked_at,ac.outcome,j.attempt_at,j.next_at,j.status AS job_status,j.message AS job_message
    FROM cameras c JOIN clients l ON l.id=c.client_id AND l.org_id=c.org_id
    LEFT JOIN camera_connections cc ON cc.camera_id=c.id AND cc.org_id=c.org_id
    LEFT JOIN monitoring_locations ml ON ml.client_id=c.client_id AND ml.org_id=c.org_id
    LEFT JOIN monitoring_rules mr ON mr.camera_id=c.id AND mr.org_id=c.org_id
    LEFT JOIN ai_checks ac ON ac.camera_id=c.id AND ac.org_id=c.org_id
    LEFT JOIN monitoring_jobs j ON j.camera_id=c.id AND j.org_id=c.org_id
    WHERE c.org_id=? AND (? IS NULL OR c.client_id=?) ORDER BY l.name,c.name`).all(u.org_id,client,client);
  const evidence=new Map(db.prepare(`SELECT c.id,count(e.id) AS events,count(ev.event_id) AS photos,
    coalesce(sum(length(ev.image)),0) AS bytes,min(ev.captured_at) AS oldest,max(ev.captured_at) AS newest
    FROM cameras c LEFT JOIN events e ON e.camera_id=c.id AND e.org_id=c.org_id
    LEFT JOIN event_evidence ev ON ev.event_id=e.id AND ev.org_id=e.org_id
    WHERE c.org_id=? AND (? IS NULL OR c.client_id=?) GROUP BY c.id`).all(u.org_id,client,client).map(r=>[r.id,{events:r.events,photos:r.photos,bytes:r.bytes,oldest:r.oldest,newest:r.newest}]));
  const cameras=rows.map(row=>({id:row.id,name:row.name,client:row.client,location:row.location,evidence:evidence.get(row.id),
    health:cameraHealth(row,{service,ai,videoReady:gateway.ready,now,busy:detector.busy.has(row.id),license:locationLicense(db,u.org_id,row.client,now)}),
    lastAnalysis:row.checked_at||null,lastOutcome:row.outcome||null,lastAttempt:row.attempt_at||null,
    retryAfter:service.enabled?row.next_at||null:null,lastMessage:row.job_message||null}));
  return {checkedAt:new Date(now).toISOString(),service:{enabled:service.enabled,state:service.state,interval:service.interval},ai:{configured:ai.configured,enabled:ai.enabled,used:ai.used,dailyLimit:ai.dailyLimit},videoReady:gateway.ready,cameras,attention:cameras.filter(c=>c.health.attention).length};
}
