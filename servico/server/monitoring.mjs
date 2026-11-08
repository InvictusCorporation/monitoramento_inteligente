export class RuleError extends Error {constructor(message,status=400){super(message);this.status=status}}
export function installMonitoring(db){
  db.exec(`CREATE TABLE IF NOT EXISTS monitoring_locations(
    client_id TEXT PRIMARY KEY,org_id TEXT NOT NULL,enabled INTEGER NOT NULL CHECK(enabled IN(0,1)),version INTEGER NOT NULL,
    FOREIGN KEY(org_id,client_id) REFERENCES clients(org_id,id));
    CREATE TABLE IF NOT EXISTS monitoring_rules(
    camera_id TEXT PRIMARY KEY,org_id TEXT NOT NULL,config TEXT NOT NULL,version INTEGER NOT NULL,
    FOREIGN KEY(org_id,camera_id) REFERENCES cameras(org_id,id));
    INSERT OR IGNORE INTO schema_migrations VALUES(3);`);
}
export function validateRule(data){
  const targets=data.targets===undefined?[data.target??'person']:data.targets;
  if(!Array.isArray(targets)||!targets.length||targets.length>3||new Set(targets).size!==targets.length||targets.some(t=>!['person','vehicle','animal'].includes(t)))throw new RuleError('Selecione pelo menos uma categoria válida, sem repetições.');
  const target=targets[0];
  const pausedTargets=data.pausedTargets??[];
  if(!Array.isArray(pausedTargets)||new Set(pausedTargets).size!==pausedTargets.length||pausedTargets.some(t=>!targets.includes(t)))throw new RuleError('Categorias pausadas devem pertencer à regra.');
  if(typeof data.enabled!=='boolean')throw new RuleError('Informe a ativação da regra.');
  if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80)throw new RuleError('Informe um nome de até 80 caracteres.');
  if(!['Alta','Média','Baixa'].includes(data.priority))throw new RuleError('Prioridade inválida.');
  if(!Array.isArray(data.days)||!data.days.length||data.days.length>7||new Set(data.days).size!==data.days.length||data.days.some(d=>!Number.isInteger(d)||d<0||d>6))throw new RuleError('Selecione os dias da semana.');
  if(typeof data.start!=='string'||typeof data.end!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.end))throw new RuleError('Horário inválido.');
  if(typeof data.timezone!=='string'||data.timezone.length>80)throw new RuleError('Fuso horário inválido.');
  try{new Intl.DateTimeFormat('pt-BR',{timeZone:data.timezone}).format()}catch{throw new RuleError('Fuso horário inválido.')}
  const a=data.area;
  if(!a||['x','y','width','height'].some(k=>typeof a[k]!=='number'||!Number.isFinite(a[k]))||a.x<0||a.y<0||a.width<=0||a.height<=0||a.x+a.width>100||a.y+a.height>100)throw new RuleError('A área precisa ficar dentro da imagem (0 a 100%).');
  return {enabled:data.enabled,name:data.name.trim(),priority:data.priority,days:[...data.days].sort(),start:data.start,end:data.end,timezone:data.timezone,area:{x:a.x,y:a.y,width:a.width,height:a.height},target,targets:[...targets],pausedTargets:[...pausedTargets]};
}
// Called inside the occurrence transaction: finalization and pause succeed together.
export function changeAlertPause(db,u,camera,action){
  if(!action)return;
  if(u.role==='client')throw new RuleError('Somente a central pode pausar alertas pelo atendimento.',403);
  const match=/^(pause|resume):(person|vehicle|animal)$/.exec(action);
  if(!match)throw new RuleError('Ação de alerta inválida.');
  const row=db.prepare('SELECT config,version FROM monitoring_rules WHERE camera_id=? AND org_id=?').get(camera,u.org_id);
  if(!row)throw new RuleError('Esta câmera não possui regra de monitoramento.',409);
  const rule=validateRule(JSON.parse(row.config)),[,mode,target]=match;
  if(!rule.targets.includes(target))throw new RuleError('Categoria não selecionada na regra desta câmera.',409);
  rule.pausedTargets=mode==='pause'?[...new Set([...rule.pausedTargets,target])]:rule.pausedTargets.filter(t=>t!==target);
  db.prepare('UPDATE monitoring_rules SET config=?,version=version+1 WHERE camera_id=? AND org_id=?').run(JSON.stringify(rule),camera,u.org_id);
}
// Selected days refer to the day the interval starts. Equal times mean a full day.
export function inSchedule(rule,date=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:rule.timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(p=>[p.type,p.value]));
  const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday),time=parts.hour+':'+parts.minute;
  if(rule.start===rule.end)return rule.days.includes(day);
  if(rule.start<rule.end)return rule.days.includes(day)&&time>=rule.start&&time<rule.end;
  return (rule.days.includes(day)&&time>=rule.start)||(rule.days.includes((day+6)%7)&&time<rule.end);
}
export function monitoringState(db,u,now){
  const client=u.role==='client'?u.client_id:null;
  const locations=db.prepare(`SELECT c.id,c.name,COALESCE(m.enabled,0) AS enabled,COALESCE(m.version,0) AS version FROM clients c LEFT JOIN monitoring_locations m ON m.client_id=c.id AND m.org_id=c.org_id WHERE c.org_id=? AND (? IS NULL OR c.id=?) ORDER BY c.name`).all(u.org_id,client,client);
  const rules=db.prepare(`SELECT r.camera_id AS camera,r.config,r.version FROM monitoring_rules r JOIN cameras c ON c.id=r.camera_id AND c.org_id=r.org_id WHERE r.org_id=? AND (? IS NULL OR c.client_id=?)`).all(u.org_id,client,client).map(r=>{const config=JSON.parse(r.config);return {camera:r.camera,version:r.version,...config,inSchedule:inSchedule(config,new Date(now))}});
  return {detectorAvailable:false,locations:locations.map(l=>({...l,enabled:Boolean(l.enabled)})),rules};
}
