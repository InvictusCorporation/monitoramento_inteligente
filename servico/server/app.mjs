import {RetentionCleanup} from './retention-cleanup.mjs';
import {modernUi} from './modern-ui.mjs';
import {branding,validateBranding} from './branding.mjs';
import {validatePlan,listPlans,selectPlan} from './plans.mjs';
import {isPlatformAdmin,managedCompany,locationLicense,assertLocationLicense} from './commercial.mjs';
import {alertPolicy,eventAlerts} from './event-alerts.mjs';
import {retentionPreview} from './retention-preview.mjs';
import {evidenceFilename} from './evidence-export.mjs';
import { diagnostics } from './diagnostics.mjs';
import { MonitoringWorker } from './monitoring-worker.mjs';
import { AIDetector } from './ai-detector.mjs';
import { monitoringState, validateRule, changeAlertPause } from './monitoring.mjs';
import { createServer } from 'node:http';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createOrganization, audit, transaction, hashPassword, passwordValid, verifyPassword } from './database.mjs';
import { sealConnection, openConnection } from './camera-secrets.mjs';
import { VideoGateway, validateConnection } from './video-gateway.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const publicUser = u => ({ id:u.id, name:u.name, email:u.email, role:u.role, clientId:u.client_id, passwordChangeRequired:!!u.must_change_password });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function required(value, max = 100) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new HttpError(400, 'Preencha os campos corretamente.');
  return value.trim();
}
async function body(req,maxBytes=16384) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, 'Envie os dados em JSON.');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'Dados excedem o limite.');
    chunks.push(chunk);
  }
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || Array.isArray(value) || typeof value !== 'object') throw Error(); return value; }
  catch { throw new HttpError(400, 'Dados inválidos.'); }
}
export async function createApp({ db, origin, secureCookies = false, now = Date.now, cameraKey=null, videoGateway=new VideoGateway(),localSetup=null,aiDetect,modernUiRoot=null }) {
  const serveModern=modernUiRoot?await modernUi(modernUiRoot):null;
  const {version}=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  const installation={version,startedAt:new Date(now()).toISOString()};
  const retentionCleanup=new RetentionCleanup();
  const detector=new AIDetector({db,key:cameraKey,gateway:videoGateway,now,...(aiDetect?{detect:aiDetect}:{})});
  const worker=new MonitoringWorker({db,detector,now});
  const canonicalOrigin = new URL(origin).origin;
  if(localSetup&&(secureCookies||!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname)))throw Error('Primeiro acesso permitido somente em instalação local.');
  if (secureCookies && !canonicalOrigin.startsWith('https://')) throw Error('Produção exige HTTPS.');
  const cookieName = secureCookies ? '__Host-invictus_session' : 'invictus_session';
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));
  const attempts = new Map();
  function limit(key, maximum) {
    const time = now();
    if (attempts.size > 10000) for (const [k,v] of attempts) if (v.until <= time) attempts.delete(k);
    if (attempts.size > 20000) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
    let item = attempts.get(key);
    if (!item || item.until <= time) { item = { count:0, until:time + 900000 }; attempts.set(key, item); }
    if (++item.count > maximum) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
  }
  function session(req) {
    const token = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, 'Entre na sua conta para continuar.');
    const u = db.prepare(`SELECT u.*,s.csrf,s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`).get(hash(token), now());
    if (!u) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
    return u;
  }
  function admin(u) { if (u.role !== 'admin') throw new HttpError(403, 'Acesso restrito ao administrador.'); }
  function allowedClient(u, id) {
    const client = db.prepare('SELECT id,name FROM clients WHERE org_id=? AND id=?').get(u.org_id,id);
    if (!client || (u.role==='client' && u.client_id!==id)) throw new HttpError(404, 'Local não encontrado.');
    return client;
  }
  function scopedEvents(u) {
    return db.prepare(`SELECT e.id,e.title,e.priority,e.rule,e.created_at AS createdAt,e.status,e.note,e.version,e.camera_id AS camera,
      (SELECT config FROM monitoring_rules mr WHERE mr.camera_id=e.camera_id AND mr.org_id=e.org_id) AS monitoringConfig,
      EXISTS(SELECT 1 FROM event_evidence ev WHERE ev.event_id=e.id AND ev.org_id=e.org_id) AS hasEvidence,
      EXISTS(SELECT 1 FROM audit a WHERE a.org_id=e.org_id AND a.target_id=e.id AND a.action='event.image.deleted') AS evidenceRemoved,
      c.name AS cameraName,ec.actor_id AS claimedBy,ec.claimed_at AS claimedAt,cu.name AS claimedName FROM events e JOIN cameras c ON c.id=e.camera_id AND c.org_id=e.org_id LEFT JOIN event_claims ec ON ec.event_id=e.id AND ec.org_id=e.org_id LEFT JOIN users cu ON cu.id=ec.actor_id AND cu.org_id=ec.org_id
      WHERE e.org_id=? AND (? IS NULL OR c.client_id=?) ORDER BY e.created_at DESC`)
      .all(u.org_id,u.role==='client'?u.client_id:null,u.role==='client'?u.client_id:null).map(({monitoringConfig,...event})=>({...event,pausedTargets:monitoringConfig?(JSON.parse(monitoringConfig).pausedTargets||[]):[]}));
  }
  function cameraFor(u,id) {
    const c=db.prepare('SELECT * FROM cameras WHERE id=? AND org_id=?').get(id,u.org_id);
    if(!c || (u.role==='client' && c.client_id!==u.client_id))throw new HttpError(404,'Câmera não encontrada.');
    return c;
  }
  function connectionFor(c) {
    const row=db.prepare('SELECT * FROM camera_connections WHERE camera_id=? AND org_id=?').get(c.id,c.org_id);
    if(!row)return {row:null,config:null};
    if(!cameraKey)throw new HttpError(503,'As conexões de câmeras não estão disponíveis nesta instalação.');
    try{return {row,config:openConnection(cameraKey,c,row.secret)}}
    catch{throw new HttpError(503,'Não foi possível recuperar a conexão. Solicite a verificação ao administrador da instalação.')}
  }
  const server = createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (secureCookies) res.setHeader('Strict-Transport-Security','max-age=31536000');
    const send = (status,data) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); };
    const cookie = (token,age) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookies?'; Secure':''}`;
    try {
      const url = new URL(req.url, canonicalOrigin), path = url.pathname, method = req.method;
      if(method==='GET'&&serveModern&&await serveModern(path,res))return;
      if(method==='GET'&&['/legado','/legado/'].includes(path)){
        res.setHeader('Content-Type','text/html; charset=utf-8');
        // Absolute asset URLs keep the original hash-based UI working at /legado/.
        const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
        res.end(html.replace(/(src|href)="(?!\/|#|https?:)([^"]+)"/g,'$1="/$2"'));return;
      }
      if (method==='GET' && ['/','/index.html','/style.css','/app.js','/master.js','/live-player.js','/alerts.js','/event-report.js','/rule-template.js',...(localSetup?['/local-setup.html','/local-setup.js']:[])].includes(path)) {
        const file = path==='/'?'index.html':path.slice(1);
        const mime = file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html';
        res.setHeader('Content-Type',mime+'; charset=utf-8');
        res.end(await readFile(fileURLToPath(new URL('../web/'+file,import.meta.url)))); return;
      }
      if (path==='/api/health' && method==='GET') { send(200,{status:'ok'}); return; }
      if (!path.startsWith('/api/')) throw new HttpError(404,'Página não encontrada.');
      if (!['GET','POST','PATCH'].includes(method)) throw new HttpError(405,'Método não permitido.');
      if (method!=='GET' && req.headers.origin!==canonicalOrigin) throw new HttpError(403,'Origem da solicitação não permitida.');
      if(path==='/api/local-setup'&&localSetup) {
        if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw new HttpError(403,'A instalação deve ser feita neste computador.');
        const setupToken=req.headers['x-setup-token'];
        if(method==='GET'){send(200,localSetup.status(setupToken));return}
        if(method==='POST'){
          limit('setup:'+req.socket.remoteAddress,10);
          const data=await body(req);send(201,await localSetup.create(data,setupToken));return;
        }
      }
      if (path==='/api/login' && method==='POST') {
        // Ignore X-Forwarded-For. A reverse proxy must implement its own per-IP throttle.
        limit('ip:'+req.socket.remoteAddress,100);
        const data = await body(req);
        const slug = required(data.company,60).toLowerCase(), email = required(data.email,254).toLowerCase();
        limit('account:'+hash(slug+'\0'+email),10);
        if (typeof data.password!=='string' || data.password.length>128) throw new HttpError(401,'Empresa, e-mail ou senha incorretos.');
        const user = db.prepare(`SELECT u.* FROM users u JOIN organizations o ON o.id=u.org_id
          WHERE o.slug=? AND u.email=? AND u.active=1`).get(slug,email);
        const valid = await verifyPassword(data.password,user?.password_hash || dummyHash);
        if (!valid || !user) throw new HttpError(401,'Empresa, e-mail ou senha incorretos.');
        attempts.delete('account:'+hash(slug+'\0'+email));
        const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
        transaction(db,()=>{
          const current=db.prepare('SELECT password_hash,active FROM users WHERE id=?').get(user.id);
          if(!current?.active || current.password_hash!==user.password_hash) throw new HttpError(401,'Empresa, e-mail ou senha incorretos.');
          db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now());
          db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),user.id,csrf,now()+8*3600000);
          audit(db,user,'login',user.id);
        });
        res.setHeader('Set-Cookie',cookie(token,8*3600)); send(200,{user:publicUser(user),csrf}); return;
      }
      const u=session(req);
      if (method!=='GET' && req.headers['x-csrf-token']!==u.csrf) throw new HttpError(403,'Atualize a página e tente novamente.');
      if (path==='/api/session' && method==='GET') { send(200,{user:{...publicUser(u),platformAdmin:isPlatformAdmin(db,u)},csrf:u.csrf}); return; }
      if (path==='/api/logout' && method==='POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(u.token_hash);
        videoGateway.stopOwner(u.id);
        res.setHeader('Set-Cookie',cookie('',0)); send(200,{ok:true}); return;
      }
      if(u.must_change_password&&path!=='/api/password'){send(403,{error:'Defina sua própria senha antes de acessar o painel.',passwordChangeRequired:true});return;}
      if(path==='/api/sessions'&&method==='GET'){
        const count=db.prepare('SELECT count(*) n FROM sessions WHERE user_id=? AND expires_at>?').get(u.id,now()).n;
        const current=db.prepare('SELECT expires_at FROM sessions WHERE token_hash=?').get(u.token_hash);
        send(200,{active:count,other:Math.max(0,count-1),currentExpiresAt:new Date(current.expires_at).toISOString()});return;
      }
      if(path==='/api/sessions/revoke-others'&&method==='POST'){
        const revoked=transaction(db,()=>{const n=db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>? AND expires_at>?').run(u.id,u.token_hash,now()).changes;audit(db,u,'sessions.others.revoked',u.id);return n});
        send(200,{revoked});return;
      }
      if(path==='/api/alerts'&&method==='GET'){
        if(u.role==='client')throw new HttpError(403,'Alertas destinados à central.');
        send(200,eventAlerts(db,u,scopedEvents(u),now()));return;
      }
      if(path==='/api/alert-policy'&&method==='GET'){admin(u);send(200,alertPolicy(db,u.org_id));return;}
      if(path==='/api/alert-policy'&&method==='POST'){
        admin(u);const data=await body(req);
        if(typeof data.enabled!=='boolean'||!Number.isInteger(data.version)||data.version<0||!['waitingMinutes','handlingMinutes'].every(k=>Number.isInteger(data[k])&&data[k]>=1&&data[k]<=1440))throw new HttpError(400,'Informe prazos inteiros entre 1 e 1.440 minutos.');
        transaction(db,()=>{
          const actor=session(req);admin(actor);if(actor.must_change_password)throw new HttpError(403,'Defina sua senha antes de configurar.');
          if(alertPolicy(db,actor.org_id).version!==data.version)throw new HttpError(409,'Configuração alterada. Abra novamente antes de salvar.');
          db.prepare(`INSERT INTO alert_policies VALUES(?,?,?,?,?) ON CONFLICT(org_id) DO UPDATE SET enabled=excluded.enabled,waiting_minutes=excluded.waiting_minutes,handling_minutes=excluded.handling_minutes,version=excluded.version`).run(actor.org_id,Number(data.enabled),data.waitingMinutes,data.handlingMinutes,data.version+1);
          audit(db,actor,'alerts.policy.updated',actor.org_id);
        });send(200,{ok:true});return;
      }
      if(path==='/api/operators'&&method==='GET'){
        if(u.role==='client')throw new HttpError(403,'Lista destinada à central.');
        send(200,{operators:db.prepare("SELECT id,name,role FROM users WHERE org_id=? AND active=1 AND must_change_password=0 AND role IN ('admin','operator') ORDER BY name,id").all(u.org_id)});return;
      }
      if(path.startsWith('/api/platform/')){
        const master=()=>{const actor=session(req);if(actor.org_id!==u.org_id||!isPlatformAdmin(db,actor)||actor.must_change_password)throw new HttpError(403,'Acesso restrito à gestão comercial master.');return actor};
        master();
        const brandingRoute=path.match(/^\/api\/platform\/branding\/([a-zA-Z0-9-]+)$/);
        if(brandingRoute&&['GET','PATCH'].includes(method)){
          const org=brandingRoute[1];
          const authorize=()=>{const actor=master();if(!managedCompany(db,actor,org)||!db.prepare('SELECT 1 FROM organizations WHERE id=?').get(org))throw new HttpError(404,'Empresa não encontrada.');return actor};
          authorize();
          if(method==='GET'){send(200,{...branding(db,org),brand:db.prepare('SELECT brand FROM organizations WHERE id=?').get(org).brand});return}
          const value=validateBranding(await body(req,140000));
          transaction(db,()=>{
            const actor=authorize();if(branding(db,org).version!==value.version)throw new HttpError(409,'Marca alterada. Atualize antes de salvar.');
            db.prepare('UPDATE organizations SET brand=? WHERE id=?').run(value.brand,org);
            db.prepare('INSERT INTO organization_branding VALUES(?,?,?,?) ON CONFLICT(org_id) DO UPDATE SET primary_color=excluded.primary_color,logo=excluded.logo,version=excluded.version').run(org,value.primaryColor,value.logoDataUrl,value.version+1);
            audit(db,actor,'branding.updated',org);
          });send(200,{ok:true});return;
        }
        if(path==='/api/platform/plans'&&method==='GET'){send(200,{plans:listPlans(db,u.org_id)});return}
        const planRoute=path.match(/^\/api\/platform\/plans\/([a-zA-Z0-9-]+)$/);
        if((path==='/api/platform/plans'&&method==='POST')||(planRoute&&method==='PATCH')){
          const data=await body(req),value=validatePlan(data),id=planRoute?planRoute[1]:randomUUID();
          if(planRoute&&(!Number.isInteger(data.version)||data.version<1))throw new HttpError(400,'Versão de plano inválida.');
          transaction(db,()=>{
            const actor=master();
            if(planRoute){
              const old=db.prepare('SELECT version FROM commercial_plans WHERE id=? AND org_id=?').get(id,actor.org_id);
              if(!old)throw new HttpError(404,'Plano não encontrado.');
              if(old.version!==data.version)throw new HttpError(409,'Plano alterado. Atualize antes de salvar.');
              db.prepare('UPDATE commercial_plans SET name=?,camera_limit=?,active=?,version=version+1 WHERE id=? AND org_id=?').run(value.name,value.cameraLimit,Number(value.active),id,actor.org_id);
            }else db.prepare('INSERT INTO commercial_plans VALUES(?,?,?,?,?,1)').run(id,actor.org_id,value.name,value.cameraLimit,Number(value.active));
            audit(db,actor,planRoute?'plan.updated':'plan.created',id);
          });
          send(planRoute?200:201,{id});return;
        }
        if(path==='/api/platform/companies'&&method==='GET'){
          const companies=db.prepare(`SELECT o.id,o.name,o.slug,o.brand,p.parent_org_id AS parent FROM organizations o LEFT JOIN company_partners p ON p.org_id=o.id WHERE o.id=? OR p.parent_org_id=? ORDER BY o.name`).all(u.org_id,u.org_id);
          send(200,{companies:companies.map(c=>({...c,locations:db.prepare('SELECT id,name,(SELECT count(*) FROM cameras WHERE client_id=l.id AND org_id=l.org_id) AS cameras FROM clients l WHERE org_id=? ORDER BY name').all(c.id).map(l=>({...l,license:locationLicense(db,c.id,l.id,now())}))}))});return;
        }
        if(path==='/api/platform/companies'&&method==='POST'){
          const data=await body(req);
          for(const key of ['name','slug','adminName','email'])data[key]=required(data[key],key==='email'?254:100);
          let created;
          try{created=await createOrganization(db,data,{parentId:u.org_id,initialPassword:true,authorize:master,onCreated:id=>audit(db,u,'partner.created',id)})}
          catch(error){if(error.status)throw error;throw new HttpError(error.code?.includes('SQLITE')?409:400,error.code?.includes('SQLITE')?'Código de empresa já utilizado ou cadastro inválido.':error.message)}
          send(201,{id:created.orgId,slug:data.slug});return;
        }
        const licenseRoute=path.match(/^\/api\/platform\/licenses\/([a-zA-Z0-9-]+)$/);
        if(licenseRoute&&method==='POST'){
          const data=await body(req),id=licenseRoute[1];let plan=required(data.plan,80);
          if(typeof data.enabled!=='boolean'||!Number.isInteger(data.cameraLimit)||data.cameraLimit<1||data.cameraLimit>256||!Number.isInteger(data.version)||data.version<0||data.module!=='patrimonial')throw new HttpError(400,'Informe licença patrimonial, limite de 1 a 256 câmeras e versão válida.');
          if(data.expiresAt!==null&&(typeof data.expiresAt!=='string'||!Number.isFinite(Date.parse(data.expiresAt))||new Date(data.expiresAt).toISOString()!==data.expiresAt))throw new HttpError(400,'Vencimento inválido.');
          transaction(db,()=>{
            const actor=master(),local=db.prepare('SELECT org_id FROM clients WHERE id=?').get(id);
            if(!local||!managedCompany(db,actor,local.org_id))throw new HttpError(404,'Local não encontrado.');
            if(data.planId!==undefined&&data.planId!==null){
              const selected=selectPlan(db,actor.org_id,data.planId,data.planVersion);
              plan=selected.name;data.cameraLimit=selected.cameraLimit;
            }
            if(locationLicense(db,local.org_id,id,now()).version!==data.version)throw new HttpError(409,'Licença alterada. Atualize antes de salvar.');
            if(db.prepare('SELECT count(*) n FROM cameras WHERE org_id=? AND client_id=?').get(local.org_id,id).n>data.cameraLimit)throw new HttpError(409,'O limite não pode ficar abaixo das câmeras já cadastradas.');
            db.prepare(`INSERT INTO location_licenses VALUES(?,?,?,?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET plan=excluded.plan,enabled=excluded.enabled,camera_limit=excluded.camera_limit,expires_at=excluded.expires_at,version=excluded.version`).run(id,local.org_id,plan,Number(data.enabled),data.cameraLimit,data.expiresAt,data.version+1);
            db.prepare('DELETE FROM license_plan_selections WHERE client_id=?').run(id);
            if(data.planId!==undefined&&data.planId!==null)db.prepare('INSERT INTO license_plan_selections VALUES(?,?,?)').run(id,data.planId,data.planVersion);
            audit(db,actor,'license.updated',id);
          });
          for(const c of db.prepare('SELECT id FROM cameras WHERE client_id=?').all(id)){videoGateway.stopCamera(c.id);detector.busy.get(c.id)?.controller.abort()}
          send(200,{ok:true});return;
        }
        throw new HttpError(404,'Recurso comercial não encontrado.');
      }
      const transferRoute=path.match(/^\/api\/events\/([a-zA-Z0-9-]+)\/transfer$/);
      if(transferRoute&&method==='POST'){
        if(u.role==='client')throw new HttpError(403,'Somente a central pode transferir atendimentos.');
        const id=transferRoute[1],data=await body(req),to=required(data.to,100),reason=required(data.reason,1000);
        if(!Number.isInteger(data.version)||data.version<1)throw new HttpError(400,'Versão inválida.');
        transaction(db,()=>{
          const actor=session(req);
          if(actor.must_change_password||!['admin','operator'].includes(actor.role))throw new HttpError(403,'Acesso indisponível para transferência.');
          const event=db.prepare('SELECT status,version FROM events WHERE id=? AND org_id=?').get(id,actor.org_id);
          if(!event)throw new HttpError(404,'Ocorrência não encontrada.');
          const claim=db.prepare('SELECT ec.actor_id,u.name FROM event_claims ec JOIN users u ON u.id=ec.actor_id AND u.org_id=ec.org_id WHERE ec.event_id=? AND ec.org_id=?').get(id,actor.org_id);
          if(event.status==='Finalizada'||!claim||event.version!==data.version)throw new HttpError(409,'Ocorrência finalizada, sem responsável ou alterada. Atualize antes de transferir.');
          if(actor.role!=='admin'&&claim.actor_id!==actor.id)throw new HttpError(403,'Somente o responsável ou um administrador pode transferir.');
          const recipient=db.prepare("SELECT id,name FROM users WHERE id=? AND org_id=? AND active=1 AND must_change_password=0 AND role IN ('admin','operator')").get(to,actor.org_id);
          if(!recipient||recipient.id===claim.actor_id)throw new HttpError(400,'Selecione outro operador ou administrador ativo da empresa, com senha definida.');
          db.prepare('UPDATE event_claims SET actor_id=?,claimed_at=? WHERE event_id=? AND org_id=?').run(to,new Date(now()).toISOString(),id,actor.org_id);
          db.prepare('UPDATE events SET version=version+1 WHERE id=? AND org_id=?').run(id,actor.org_id);
          const auditId=audit(db,actor,'event.transferred',id);
          db.prepare('INSERT INTO event_transfers VALUES(?,?,?,?,?,?,?,?,?)').run(auditId,id,actor.org_id,claim.actor_id,to,claim.name,recipient.name,reason,event.version+1);
        });send(200,{ok:true});return;
      }
      const claimRoute=path.match(/^\/api\/events\/([a-zA-Z0-9-]+)\/claim$/);
      if(claimRoute&&method==='POST'){
        if(u.role==='client')throw new HttpError(403,'Somente a central pode assumir atendimentos.');
        const id=claimRoute[1],event=scopedEvents(u).find(e=>e.id===id);
        if(!event)throw new HttpError(404,'Ocorrência não encontrada.');
        const data=await body(req);
        transaction(db,()=>{
          const current=db.prepare('SELECT status,version FROM events WHERE id=? AND org_id=?').get(id,u.org_id);
          if(current.version!==data.version||current.status==='Finalizada'||db.prepare('SELECT 1 FROM event_claims WHERE event_id=?').get(id))throw new HttpError(409,'Ocorrência já assumida ou alterada. Atualize antes de continuar.');
          db.prepare('INSERT INTO event_claims VALUES(?,?,?,?)').run(id,u.org_id,u.id,new Date(now()).toISOString());
          db.prepare("UPDATE events SET status='Em análise',version=version+1 WHERE id=? AND org_id=?").run(id,u.org_id);
          audit(db,u,'event.claimed',id);
        });send(200,{ok:true});return;
      }
      if(path==='/api/evidence/retention/prepare'&&method==='POST'){
        admin(u);const data=await body(req),actor=session(req);admin(actor);
        if(actor.org_id!==u.org_id)throw new HttpError(403,'Sessão alterada.');
        if(!Number.isInteger(data.days)||data.days<1||data.days>3650)throw new HttpError(400,'Informe um prazo de 1 a 3650 dias.');
        if(data.client!==null&&data.client!==undefined&&typeof data.client!=='string')throw new HttpError(400,'Local inválido.');
        const client=data.client||null;if(client)allowedClient(actor,client);
        send(200,retentionCleanup.prepare(db,actor,client,data.days,now()));return;
      }
      if(path==='/api/evidence/retention/execute'&&method==='POST'){
        admin(u);const data=await body(req);
        const result=retentionCleanup.execute(db,{token:data.token,confirmation:data.confirmation,now:now(),authorize:()=>{const actor=session(req);admin(actor);if(actor.org_id!==u.org_id)throw new HttpError(403,'Sessão alterada.');return actor},onDelete:(actor,id)=>audit(db,actor,'event.image.deleted',id)});
        send(200,result);return;
      }
      if(path==='/api/evidence/retention-preview'&&method==='GET'){
        admin(u);const raw=url.searchParams.get('days')||'30',days=Number(raw),client=url.searchParams.get('client')||null;
        if(!/^\d+$/.test(raw)||!Number.isInteger(days)||days<1||days>3650)throw new HttpError(400,'Informe um prazo de 1 a 3650 dias.');
        if(client)allowedClient(u,client);
        send(200,retentionPreview(db,u.org_id,client,days,now()));return;
      }
      if(path==='/api/diagnostics'&&method==='GET'){send(200,diagnostics(db,u,{worker,detector,gateway:videoGateway,now:now()}));return;}
      if(path==='/api/monitoring'&&method==='GET'){const m=monitoringState(db,u,now());send(200,{...m,detectorAvailable:detector.settings(u.org_id).available,ai:detector.settings(u.org_id),service:worker.status(u.org_id),jobs:db.prepare(`SELECT j.camera_id AS camera,j.attempt_at AS attemptedAt,j.next_at AS nextAt,j.status,j.message FROM monitoring_jobs j JOIN cameras c ON c.id=j.camera_id AND c.org_id=j.org_id WHERE j.org_id=? AND (? IS NULL OR c.client_id=?)`).all(u.org_id,u.role==='client'?u.client_id:null,u.role==='client'?u.client_id:null)});return}
      if(path==='/api/monitoring/service'&&method==='POST'){
        admin(u);worker.save(u,await body(req));send(200,{ok:true,service:worker.status(u.org_id)});return;
      }
      if(path==='/api/ai/settings'&&method==='POST'){
        admin(u);detector.save(u,await body(req));send(200,{ok:true,...detector.settings(u.org_id)});return;
      }
      const aiRoute=path.match(/^\/api\/cameras\/([a-zA-Z0-9-]+)\/analyze$/);
      if(aiRoute&&method==='POST'){
        const id=aiRoute[1];cameraFor(u,id);limit('ai:'+u.org_id,100);
        const controller=new AbortController();res.once('close',()=>controller.abort());
        const result=await detector.analyze(u,id,{signal:controller.signal,authorize:()=>{try{const current=session(req);cameraFor(current,id);return true}catch{return false}}});
        if(!res.destroyed)send(200,result);return;
      }
      const monitorRoute=path.match(/^\/api\/monitoring\/(locations|cameras)\/([a-zA-Z0-9-]+)$/);
      if(monitorRoute&&method==='POST'){
        const [,kind,id]=monitorRoute;
        if(kind==='locations')allowedClient(u,id);else cameraFor(u,id);
        if(u.role==='operator')throw new HttpError(403,'Somente o administrador ou o cliente do local pode alterar as regras.');
        const data=await body(req);
        if(!Number.isInteger(data.version)||data.version<0)throw new HttpError(400,'Versão inválida.');
        const config=kind==='cameras'?validateRule(data):null;
        if(kind==='locations'&&typeof data.enabled!=='boolean')throw new HttpError(400,'Ativação inválida.');
        transaction(db,()=>{
          const table=kind==='locations'?'monitoring_locations':'monitoring_rules',column=kind==='locations'?'client_id':'camera_id';
          const current=db.prepare(`SELECT version FROM ${table} WHERE ${column}=? AND org_id=?`).get(id,u.org_id);
          if((current?.version||0)!==data.version)throw new HttpError(409,'A configuração mudou. Feche e abra novamente antes de salvar.');
          if(kind==='locations')db.prepare('INSERT INTO monitoring_locations VALUES(?,?,?,?) ON CONFLICT(client_id) DO UPDATE SET enabled=excluded.enabled,version=excluded.version').run(id,u.org_id,Number(data.enabled),data.version+1);
          else db.prepare('INSERT INTO monitoring_rules VALUES(?,?,?,?) ON CONFLICT(camera_id) DO UPDATE SET config=excluded.config,version=excluded.version').run(id,u.org_id,JSON.stringify(config),data.version+1);
          audit(db,u,kind==='locations'?'monitoring.location.updated':'monitoring.rule.updated',id);
        });
        send(200,{ok:true,version:data.version+1,detectorAvailable:false});return;
      }
      if (path==='/api/state' && method==='GET') {
        const clientId=u.role==='client'?u.client_id:null;
        send(200,{
            installation,
          organization:{...db.prepare('SELECT name,slug,brand FROM organizations WHERE id=?').get(u.org_id),branding:branding(db,u.org_id)},
          user:{...publicUser(u),platformAdmin:isPlatformAdmin(db,u)},
          customers:u.role==='client'?[]:db.prepare('SELECT id,name FROM commercial_customers WHERE org_id=? ORDER BY name').all(u.org_id),
          clients:db.prepare('SELECT l.id,l.name,cl.customer_id AS customerId,cu.name AS customerName FROM clients l LEFT JOIN customer_locations cl ON cl.client_id=l.id AND cl.org_id=l.org_id LEFT JOIN commercial_customers cu ON cu.id=cl.customer_id AND cu.org_id=l.org_id WHERE l.org_id=? AND (? IS NULL OR l.id=?) ORDER BY l.name').all(u.org_id,clientId,clientId).map(c=>({...c,license:locationLicense(db,u.org_id,c.id,now())})),
          video:{available:videoGateway.ready&&Boolean(cameraKey),maxLive:videoGateway.maxStreams||4,maxPerOperator:videoGateway.maxStreamsPerOwner||videoGateway.maxStreams||4,maxCaptures:videoGateway.maxSnapshots||2},
          cameras:db.prepare(`SELECT c.id,c.name,c.client_id AS client,c.created_at AS createdAt,
            CASE WHEN cc.camera_id IS NULL THEN 'unconfigured' WHEN cc.enabled=0 THEN 'disabled' ELSE 'configured' END AS connectionStatus
            FROM cameras c LEFT JOIN camera_connections cc ON cc.camera_id=c.id AND cc.org_id=c.org_id
            WHERE c.org_id=? AND (? IS NULL OR c.client_id=?) ORDER BY c.name`).all(u.org_id,clientId,clientId),
          events:scopedEvents(u)
        }); return;
      }
      const renameRoute=path.match(/^\/api\/(cameras|clients)\/([a-zA-Z0-9-]+)\/name$/);
      if(renameRoute&&method==='PATCH'){
        const [,kind,id]=renameRoute;
        if(kind==='clients'){admin(u);allowedClient(u,id)}else cameraFor(u,id);
        const data=await body(req),name=required(data.name,kind==='clients'?80:60);
        if(typeof data.previousName!=='string')throw new HttpError(400,'Atualize o cadastro antes de editar.');
        transaction(db,()=>{
          const result=kind==='clients'?db.prepare('UPDATE clients SET name=? WHERE id=? AND org_id=? AND name=?').run(name,id,u.org_id,data.previousName):db.prepare('UPDATE cameras SET name=? WHERE id=? AND org_id=? AND name=?').run(name,id,u.org_id,data.previousName);
          if(!result.changes)throw new HttpError(409,'O nome foi alterado. Atualize o painel antes de tentar novamente.');
          audit(db,u,kind==='clients'?'client.renamed':'camera.renamed',id);
        });send(200,{id,name});return;
      }
      if(path==='/api/customers'&&method==='POST'){
        admin(u);const data=await body(req),name=required(data.name,100),id=randomUUID();
        transaction(db,()=>{db.prepare('INSERT INTO commercial_customers VALUES(?,?,?)').run(id,u.org_id,name);audit(db,u,'customer.created',id)});send(201,{id,name});return;
      }
      const customerLink=path.match(/^\/api\/clients\/([a-zA-Z0-9-]+)\/customer$/);
      if(customerLink&&method==='POST'){
        admin(u);const data=await body(req),id=customerLink[1];allowedClient(u,id);
        transaction(db,()=>{
          if(!db.prepare('SELECT 1 FROM commercial_customers WHERE id=? AND org_id=?').get(data.customerId,u.org_id))throw new HttpError(404,'Cliente não encontrado.');
          const old=db.prepare('SELECT customer_id FROM customer_locations WHERE client_id=? AND org_id=?').get(id,u.org_id)?.customer_id||null;
          if(old!==data.previousCustomerId)throw new HttpError(409,'Vínculo alterado. Atualize a página.');
          db.prepare('INSERT INTO customer_locations VALUES(?,?,?) ON CONFLICT(client_id) DO UPDATE SET customer_id=excluded.customer_id').run(id,u.org_id,data.customerId);audit(db,u,'location.customer.updated',id);
        });send(200,{ok:true});return;
      }
      if (path==='/api/clients' && method==='POST') {
        admin(u); const data=await body(req),name=required(data.name,80),id=randomUUID();
        transaction(db,()=>{if(data.customerId&&!db.prepare('SELECT 1 FROM commercial_customers WHERE id=? AND org_id=?').get(data.customerId,u.org_id))throw new HttpError(404,'Cliente não encontrado.');db.prepare('INSERT INTO clients VALUES(?,?,?)').run(id,u.org_id,name);if(data.customerId)db.prepare('INSERT INTO customer_locations VALUES(?,?,?)').run(id,u.org_id,data.customerId);audit(db,u,'client.created',id)});
        send(201,{id,name}); return;
      }
      if (path==='/api/cameras' && method==='POST') {
        const data=await body(req),name=required(data.name,60),client=required(data.client,80),id=randomUUID();
        allowedClient(u,client);
        transaction(db,()=>{assertLocationLicense(db,u.org_id,client,now(),true);db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(id,u.org_id,client,name,new Date(now()).toISOString());audit(db,u,'camera.created',id)});
        send(201,{id,name,client}); return;
      }
      const previewRoute=path.match(/^\/api\/cameras\/([a-zA-Z0-9-]+)\/preview$/);
      if(previewRoute&&method==='POST'){
        const id=previewRoute[1],camera=cameraFor(u,id);assertLocationLicense(db,u.org_id,camera.client_id,now());limit('preview:'+u.id,60);
        const {row,config}=connectionFor(camera);
        if(!row?.enabled)throw new HttpError(409,'Configure e habilite a conexão da câmera.');
        const controller=new AbortController();res.once('close',()=>controller.abort());
        const authorized=()=>{try{const current=session(req);cameraFor(current,id);assertLocationLicense(db,u.org_id,camera.client_id,now());const latest=db.prepare('SELECT enabled,version FROM camera_connections WHERE camera_id=? AND org_id=?').get(id,u.org_id);return latest?.enabled===1&&latest.version===row.version}catch{return false}};
        const lease=setInterval(()=>{if(!authorized())controller.abort()},1000);lease.unref();
        try{
          const image=await videoGateway.snapshot(config,{owner:u.id,cameraId:id,clientId:camera.client_id,area:{x:0,y:0,width:100,height:100},signal:controller.signal});
          if(!authorized()||controller.signal.aborted)throw new HttpError(409,'Prévia cancelada: acesso ou conexão mudou.');
          audit(db,u,'camera.previewed',id);
          res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'no-store, private'});res.end(image);
        }finally{clearInterval(lease)}
        return;
      }
      const cameraRoute=path.match(/^\/api\/cameras\/([a-zA-Z0-9-]+)\/(connection|test|live)$/);
      if(cameraRoute) {
        const [,id,action]=cameraRoute,camera=cameraFor(u,id);
        if(action==='connection'&&method==='GET') {
          const {row,config}=connectionFor(camera);
          send(200,{configured:Boolean(row),enabled:Boolean(row?.enabled),version:row?.version||0,
            host:config?.host||'',port:config?.port||554,profile:config?.profile||'manual',channel:config?.channel||1,stream:config?.stream??1,
            available:videoGateway.ready&&Boolean(cameraKey),canConfigure:u.role!=='operator'});return;
        }
        if(action==='connection'&&['POST','PATCH'].includes(method)) {
          if(u.role==='operator')throw new HttpError(403,'A configuração é restrita ao administrador ou ao cliente responsável.');
          if(!cameraKey)throw new HttpError(503,'As conexões de câmeras não estão habilitadas.');
          const data=await body(req),{row,config:previous}=connectionFor(camera);
          if(!Number.isInteger(data.version)||data.version!==(row?.version||0))throw new HttpError(409,'A configuração foi alterada. Abra novamente a câmera.');
          if(method==='PATCH') {
            if(!row||typeof data.enabled!=='boolean')throw new HttpError(400,'Configuração inválida.');
            transaction(db,()=>{db.prepare('UPDATE camera_connections SET enabled=?,version=version+1,updated_at=? WHERE camera_id=? AND org_id=?')
              .run(Number(data.enabled),new Date(now()).toISOString(),id,u.org_id);audit(db,u,data.enabled?'camera.enabled':'camera.disabled',id)});
          } else {
            // Optional credential retention never returns or logs the previous secret.
            // All other fields still pass through the original endpoint/RTSP validation.
            let input=data,previousDestination=null;
            if(data.preserveCredentials===true){
              if(!row||!previous)throw new HttpError(400,'Não há credenciais anteriores para preservar.');
              previousDestination=validateConnection(previous,videoGateway.endpoints,camera.client_id);
              input={...data,username:previous.username,password:previous.password};
            }
            const config=validateConnection(input,videoGateway.endpoints,camera.client_id);
            // Sealed credentials may only follow edits within the exact authorized destination.
            // A host/port change requires explicit new credentials, even inside the same tenant/location.
            if(previousDestination&&(config.host!==previousDestination.host||config.port!==previousDestination.port))
              throw new HttpError(400,'Para alterar host ou porta, informe usuário e senha novamente sem preservar credenciais.');
            const secret=sealConnection(cameraKey,camera,config);
            transaction(db,()=>{db.prepare(`INSERT INTO camera_connections(camera_id,org_id,secret,enabled,version,updated_at) VALUES(?,?,?,1,?,?)
              ON CONFLICT(camera_id) DO UPDATE SET secret=excluded.secret,enabled=1,version=excluded.version,updated_at=excluded.updated_at`)
              .run(id,u.org_id,secret,(row?.version||0)+1,new Date(now()).toISOString());audit(db,u,'camera.configured',id)});
          }
          videoGateway.stopCamera(id);send(200,{ok:true});return;
        }
        if(['test','live'].includes(action)&&method==='POST') {
          assertLocationLicense(db,u.org_id,camera.client_id,now());
          limit('video:'+u.id,240);
          const {row,config}=connectionFor(camera);
          if(!row?.enabled)throw new HttpError(409,'Configure e habilite esta câmera antes de abrir o vídeo.');
          let streaming=false;
          const job=videoGateway.start(config,{owner:u.id,cameraId:id,clientId:camera.client_id,orgId:u.org_id,version:row.version,authorize:()=>{
            // Revalidate the session and camera version throughout the stream.
            try{const current=session(req);cameraFor(current,id);assertLocationLicense(db,u.org_id,camera.client_id,now());
              const active=db.prepare('SELECT enabled,version FROM camera_connections WHERE camera_id=?').get(id);
              return active?.enabled===1&&active.version===row.version;
            }catch{return false}
          },onEnd:()=>{if(streaming&&!res.destroyed)res.end()}});
          res.once('close',()=>job.stop());
          try {
            const {first,stream}=await job.ready;
            if(res.destroyed){job.stop();return}
            audit(db,u,action==='test'?'camera.tested':'camera.viewed',id);
            if(action==='test'){job.stop();send(200,{ok:true,message:'O equipamento respondeu e iniciou o envio de mídia. Abra o vídeo para conferir a imagem.'});return}
            streaming=true;
            res.writeHead(200,{'Content-Type':'video/mp4','X-Accel-Buffering':'no','Cache-Control':'no-store'});
            res.write(first);
            stream.on('data',()=>job.touch());stream.pipe(res);
          }catch(error){job.stop();throw error}
          return;
        }
      }
      const historyRoute=path.match(/^\/api\/events\/([a-zA-Z0-9-]+)\/history$/);
      if(historyRoute&&method==='GET'){
        if(u.role==='client')throw new HttpError(403,'Histórico de atendimento destinado à central.');
        const event=db.prepare(`SELECT e.created_at FROM events e JOIN cameras c ON c.id=e.camera_id AND c.org_id=e.org_id WHERE e.id=? AND e.org_id=?`).get(historyRoute[1],u.org_id);
        if(!event)throw new HttpError(404,'Ocorrência não encontrada.');
        const entries=db.prepare(`SELECT a.id,a.action,a.created_at AS createdAt,u.name AS actor,
          r.old_status AS oldStatus,r.new_status AS newStatus,r.old_note AS oldNote,r.new_note AS newNote,r.new_version AS revision,
          t.from_name AS transferredFrom,t.to_name AS transferredTo,t.reason AS transferReason,t.new_version AS transferVersion
          FROM audit a JOIN users u ON u.id=a.actor_id AND u.org_id=a.org_id
          LEFT JOIN event_revisions r ON r.audit_id=a.id AND r.org_id=a.org_id AND r.event_id=a.target_id
          LEFT JOIN event_transfers t ON t.audit_id=a.id AND t.org_id=a.org_id AND t.event_id=a.target_id
          WHERE a.org_id=? AND a.target_id=? AND (a.action IN ('event.claimed','event.transferred','event.updated','event.image.viewed','event.image.downloaded') OR a.action LIKE 'event.alerts.%')
          ORDER BY a.rowid DESC LIMIT 101`).all(u.org_id,historyRoute[1]);
        send(200,{createdAt:event.created_at,entries:entries.slice(0,100),hasMore:entries.length>100});return;
      }
      const evidenceRoute=path.match(/^\/api\/events\/([a-zA-Z0-9-]+)\/image$/);
      if(evidenceRoute&&method==='GET'){
        const image=db.prepare(`SELECT ev.image,e.created_at,c.name AS camera_name FROM event_evidence ev JOIN events e ON e.id=ev.event_id AND e.org_id=ev.org_id JOIN cameras c ON c.id=e.camera_id AND c.org_id=e.org_id
          WHERE ev.event_id=? AND ev.org_id=? AND (? IS NULL OR c.client_id=?)`).get(evidenceRoute[1],u.org_id,u.role==='client'?u.client_id:null,u.role==='client'?u.client_id:null);
        if(!image)throw new HttpError(404,'Imagem não disponível para esta ocorrência.');
        const download=url.searchParams.get('download')==='1';
          audit(db,u,download?'event.image.downloaded':'event.image.viewed',evidenceRoute[1]);
        res.writeHead(200,{'Content-Type':'image/jpeg','Content-Disposition':download?`attachment; filename="${evidenceFilename(image.camera_name,image.created_at,evidenceRoute[1])}"`:'inline; filename="ocorrencia.jpg"','Cache-Control':'no-store, private'});res.end(Buffer.from(image.image));return;
      }
      if (path.startsWith('/api/events/') && method==='PATCH') {
        const id=path.slice('/api/events/'.length),event=scopedEvents(u).find(e=>e.id===id);
        if (!event) throw new HttpError(404,'Ocorrência não encontrada.');
        const data=await body(req);
        if (!['Pendente','Em análise','Finalizada'].includes(data.status) || typeof data.note!=='string' || data.note.length>2000 || !Number.isInteger(data.version)) throw new HttpError(400,'Dados da ocorrência inválidos.');
        if (data.status==='Finalizada'&&!data.note.trim()) throw new HttpError(400,'Registre a verificação antes de finalizar.');
        if(data.alertAction!==undefined&&(typeof data.alertAction!=='string'||(data.alertAction&&!/^(pause|resume):(person|vehicle|animal)$/.test(data.alertAction))))throw new HttpError(400,'Ação de alerta inválida.');
        if(data.alertAction?.startsWith('pause:')&&data.status!=='Finalizada')throw new HttpError(400,'Para pausar pelo atendimento, finalize a ocorrência.');
        transaction(db,()=>{
          const previous=db.prepare('SELECT status,note,version FROM events WHERE id=? AND org_id=?').get(id,u.org_id);
          const result=db.prepare('UPDATE events SET status=?,note=?,version=version+1 WHERE id=? AND org_id=? AND version=?')
            .run(data.status,data.note.trim(),id,u.org_id,data.version);
          if (!result.changes) throw new HttpError(409,'Outra pessoa atualizou esta ocorrência. Atualize o painel antes de continuar.');
          changeAlertPause(db,u,event.camera,data.alertAction);
          if(data.alertAction){audit(db,u,'monitoring.alerts.'+data.alertAction,event.camera);audit(db,u,'event.alerts.'+data.alertAction,id);}
          const auditId=audit(db,u,'event.updated',id);
          db.prepare('INSERT INTO event_revisions VALUES(?,?,?,?,?,?,?,?,?)').run(auditId,id,u.org_id,previous.status,data.status,previous.note,data.note.trim(),previous.version,previous.version+1);
        }); send(200,{ok:true});return;
      }
      if (path==='/api/brand' && method==='PATCH') {
        admin(u);const data=await body(req),brand=required(data.brand,24);
        transaction(db,()=>{const current=branding(db,u.org_id);db.prepare('UPDATE organizations SET brand=? WHERE id=?').run(brand,u.org_id);db.prepare('INSERT INTO organization_branding VALUES(?,?,?,?) ON CONFLICT(org_id) DO UPDATE SET version=excluded.version').run(u.org_id,current.primaryColor,current.logoDataUrl,current.version+1);audit(db,u,'brand.updated',u.org_id)});
        send(200,{brand});return;
      }
      if (path==='/api/users' && method==='GET') {
        admin(u);send(200,{users:db.prepare('SELECT id,name,email,role,client_id AS clientId,active FROM users WHERE org_id=? ORDER BY name').all(u.org_id)});return;
      }
      if (path==='/api/users' && method==='POST') {
        admin(u);const data=await body(req),name=required(data.name,100),email=required(data.email,254).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['admin','operator','client'].includes(data.role)||!passwordValid(data.password)) throw new HttpError(400,'Informe e-mail válido, perfil e senha de 12 a 128 caracteres.');
        const clientId=data.role==='client'?required(data.clientId,80):null;
        if (clientId) allowedClient(u,clientId);
        const passwordHash=await hashPassword(data.password),id=randomUUID();
        if(db.prepare('SELECT id FROM users WHERE org_id=? AND email=?').get(u.org_id,email))throw new HttpError(409,'Já existe um usuário com esse e-mail nesta empresa.');
        transaction(db,()=>{
          db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role,client_id) VALUES(?,?,?,?,?,?,?)').run(id,u.org_id,name,email,passwordHash,data.role,clientId);
          audit(db,u,'user.created',id);
        });send(201,{id});return;
      }
      const resetRoute=path.match(/^\/api\/users\/([a-zA-Z0-9-]+)\/password$/);
      if(resetRoute&&method==='POST'){
        admin(u);limit('admin-password-reset:'+u.id,10);
        const id=resetRoute[1],data=await body(req);
        if(id===u.id)throw new HttpError(400,'Use Alterar senha em Minha conta.');
        if(!db.prepare('SELECT id FROM users WHERE id=? AND org_id=?').get(id,u.org_id))throw new HttpError(404,'Usuário não encontrado.');
        if(typeof data.current!=='string'||data.current.length>128||!passwordValid(data.password))throw new HttpError(400,'Informe sua senha atual e uma nova senha de 12 a 128 caracteres.');
        if(!await verifyPassword(data.current,u.password_hash))throw new HttpError(400,'Senha do administrador incorreta.');
        const newHash=await hashPassword(data.password);
        transaction(db,()=>{
          const current=session(req);admin(current);
          if(current.password_hash!==u.password_hash)throw new HttpError(409,'Sua conta foi alterada. Entre novamente.');
          const result=db.prepare('UPDATE users SET password_hash=?,must_change_password=1 WHERE id=? AND org_id=?').run(newHash,id,u.org_id);
          if(!result.changes)throw new HttpError(404,'Usuário não encontrado.');
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit(db,u,'user.password.reset',id);
        });
        videoGateway.stopOwner(id);send(200,{ok:true});return;
      }
      if (path.startsWith('/api/users/') && method==='PATCH') {
        admin(u);const id=path.slice('/api/users/'.length),data=await body(req);
        if (typeof data.active!=='boolean') throw new HttpError(400,'Estado inválido.');
        if (id===u.id) throw new HttpError(400,'Você não pode desativar a própria conta.');
        if (!db.prepare('SELECT id FROM users WHERE org_id=? AND id=?').get(u.org_id,id)) throw new HttpError(404,'Usuário não encontrado.');
        transaction(db,()=>{db.prepare('UPDATE users SET active=? WHERE org_id=? AND id=?').run(Number(data.active),u.org_id,id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);audit(db,u,data.active?'user.activated':'user.disabled',id)});
        videoGateway.stopOwner(id);
        send(200,{ok:true});return;
      }
      if (path==='/api/password' && method==='POST') {
        const data=await body(req);limit('password:'+u.id,10);
        if(typeof data.current!=='string'||data.current.length>128||!passwordValid(data.password)) throw new HttpError(400,'Informe a senha atual e uma nova senha de 12 a 128 caracteres.');
        if (!await verifyPassword(data.current,u.password_hash)) throw new HttpError(400,'Senha atual incorreta.');
        if(u.must_change_password&&data.current===data.password)throw new HttpError(400,'Escolha uma senha diferente da senha inicial.');
        const newHash=await hashPassword(data.password);
        transaction(db,()=>{const current=session(req);if(current.password_hash!==u.password_hash)throw new HttpError(409,'Sua senha foi alterada. Entre novamente.');db.prepare('UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?').run(newHash,u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);audit(db,u,'password.changed',u.id)});
        videoGateway.stopOwner(u.id);
        res.setHeader('Set-Cookie',cookie('',0));send(200,{ok:true});return;
      }
      if(path==='/api/audit'&&method==='GET') {
        admin(u);send(200,{entries:db.prepare(`SELECT a.action,a.target_id AS target,a.created_at AS createdAt,u.name AS actor
          FROM audit a JOIN users u ON u.id=a.actor_id WHERE a.org_id=? ORDER BY a.rowid DESC LIMIT 100`).all(u.org_id)});return;
      }
      throw new HttpError(404,'Recurso não encontrado.');
    } catch(error) {
      if(res.destroyed)return;
      if(res.headersSent){res.end();return}
      const status=error.status||500;
      if(status===429)res.setHeader('Retry-After','900');
      if(status===500)console.error('Falha interna na requisição:',error.code||error.name);
      send(status,{error:status===500?'Não foi possível concluir a operação.':error.message});
    }
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  server.once('listening',()=>worker.start());
  server.stopMonitoring=()=>worker.close();
  server.on('close',()=>{void worker.close();detector.close();videoGateway.close()});
  return server;
}
