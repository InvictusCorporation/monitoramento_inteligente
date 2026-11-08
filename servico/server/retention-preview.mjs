export function retentionPreview(db,org,client,days,now){
  if(!Number.isInteger(days)||days<1||days>3650)throw Error('Prazo inválido.');
  const cutoff=new Date(now-days*86400000).toISOString();
  const result=db.prepare(`SELECT count(*) AS total,
    coalesce(sum(CASE WHEN julianday(ev.captured_at)<julianday(?) AND e.status='Finalizada' THEN 1 ELSE 0 END),0) AS eligible,
    coalesce(sum(CASE WHEN julianday(ev.captured_at)<julianday(?) AND e.status='Finalizada' THEN length(ev.image) ELSE 0 END),0) AS eligibleBytes,
    coalesce(sum(CASE WHEN julianday(ev.captured_at)<julianday(?) AND e.status<>'Finalizada' THEN 1 ELSE 0 END),0) AS protectedOpen
    FROM event_evidence ev JOIN events e ON e.id=ev.event_id AND e.org_id=ev.org_id
    JOIN cameras c ON c.id=e.camera_id AND c.org_id=e.org_id
    WHERE e.org_id=? AND (? IS NULL OR c.client_id=?)`).get(cutoff,cutoff,cutoff,org,client,client);
  return {...result,days,cutoff,checkedAt:new Date(now).toISOString(),simulation:true};
}
