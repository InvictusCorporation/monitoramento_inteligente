export function alertPolicy(db,org){
  const row=db.prepare('SELECT enabled,waiting_minutes AS waitingMinutes,handling_minutes AS handlingMinutes,version FROM alert_policies WHERE org_id=?').get(org);
  return row?{...row,enabled:!!row.enabled}:{enabled:false,waitingMinutes:5,handlingMinutes:15,version:0};
}
export function deadlineFor(event,policy,now){
  if(!policy.enabled||event.status==='Finalizada')return null;
  const base=Date.parse(event.claimedBy?event.claimedAt:event.createdAt),minutes=event.claimedBy?policy.handlingMinutes:policy.waitingMinutes;
  const deadline=base+minutes*60000;
  if(!Number.isFinite(deadline)||now<deadline)return null;
  return {deadlineAt:new Date(deadline).toISOString(),deadlinePhase:event.claimedBy?'handling':'waiting'};
}
export function eventAlerts(db,u,events,now){
  const policy=alertPolicy(db,u.org_id);
  const latest=db.prepare('SELECT audit_id,to_user_id FROM event_transfers WHERE org_id=? AND event_id=? ORDER BY new_version DESC LIMIT 1');
  const pending=events.filter(e=>e.status!=='Finalizada').flatMap(e=>{
    const deadline=deadlineFor(e,policy,now);
    const overdue=!!deadline&&(!e.claimedBy||e.claimedBy===u.id||u.role==='admin');
    const transfer=e.claimedBy===u.id?latest.get(u.org_id,e.id):null;
    const transferredToMe=transfer?.to_user_id===u.id;
    if(e.claimedBy&&!overdue&&!transferredToMe)return [];
    const key=transferredToMe?'transfer:'+transfer.audit_id:'unassigned:'+e.id;
    return [{...e,transferredToMe,overdue,...(overdue?deadline:{}),alertKey:overdue?`overdue:${e.id}:${e.claimedBy||''}:${deadline.deadlineAt}:${policy.version}`:key}];
  });
  pending.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||Number(b.transferredToMe)-Number(a.transferredToMe)||(a.overdue?Date.parse(a.deadlineAt)-Date.parse(b.deadlineAt):0));
  return {count:pending.length,overdueCount:pending.filter(e=>e.overdue).length,events:pending.slice(0,20)};
}
