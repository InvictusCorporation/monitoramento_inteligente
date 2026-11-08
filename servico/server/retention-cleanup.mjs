import {createHash,randomBytes} from 'node:crypto';
import {transaction} from './database.mjs';
import {retentionPreview} from './retention-preview.mjs';

const LIMIT=500,TTL=5*60*1000;
function fail(status,message){throw Object.assign(Error(message),{status})}
function candidates(db,org,client,cutoff){
  return db.prepare(`SELECT ev.event_id AS id,ev.captured_at AS capturedAt,length(ev.image) AS bytes,e.version
    FROM event_evidence ev JOIN events e ON e.id=ev.event_id AND e.org_id=ev.org_id
    JOIN cameras c ON c.id=e.camera_id AND c.org_id=e.org_id
    WHERE e.org_id=? AND (? IS NULL OR c.client_id=?) AND e.status='Finalizada'
    AND julianday(ev.captured_at)<julianday(?) ORDER BY ev.event_id LIMIT 500`).all(org,client,client,cutoff);
}
const digest=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
export class RetentionCleanup {
  previews=new Map();
  prepare(db,actor,client,days,now){
    for(const [key,value] of this.previews)if(value.expires<=now)this.previews.delete(key);
    if(this.previews.size>=256)fail(429,'Muitas prévias em andamento. Aguarde alguns minutos.');
    const result=retentionPreview(db,actor.org_id,client,days,now),rows=candidates(db,actor.org_id,client,result.cutoff);
    const token=randomBytes(32).toString('hex'),expires=now+TTL;
    if(rows.length)this.previews.set(token,{actor:actor.id,org:actor.org_id,client,cutoff:result.cutoff,digest:digest(rows),expires});
    return {...result,token:rows.length?token:null,expiresAt:new Date(expires).toISOString(),batchCount:rows.length,batchBytes:rows.reduce((n,r)=>n+r.bytes,0),batchLimit:LIMIT};
  }
  execute(db,{token,confirmation,now,authorize,onDelete}){
    if(typeof token!=='string'||confirmation!=='EXCLUIR FOTOS')fail(400,'Digite EXCLUIR FOTOS para confirmar.');
    return transaction(db,()=>{
      const actor=authorize(),preview=this.previews.get(token);
      if(!preview||preview.actor!==actor.id||preview.org!==actor.org_id)fail(409,'Prévia indisponível. Calcule novamente.');
      if(preview.expires<=now){this.previews.delete(token);fail(409,'Prévia expirada. Calcule novamente.')}
      const rows=candidates(db,actor.org_id,preview.client,preview.cutoff);
      if(!rows.length||digest(rows)!==preview.digest){this.previews.delete(token);fail(409,'As ocorrências ou fotos mudaram. Calcule uma nova prévia.')}
      this.previews.delete(token);
      for(const row of rows){
        db.prepare('DELETE FROM event_evidence WHERE org_id=? AND event_id=?').run(actor.org_id,row.id);
        onDelete(actor,row.id);
      }
      return {deleted:rows.length,deletedBytes:rows.reduce((n,r)=>n+r.bytes,0)};
    });
  }
}
