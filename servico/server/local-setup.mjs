import { randomUUID, timingSafeEqual } from 'node:crypto';
import { hashPassword, transaction, audit } from './database.mjs';
import { sealConnection } from './camera-secrets.mjs';
import { validateConnection, parseEndpoints } from './video-gateway.mjs';

export function localSettings(db) {
  db.exec('CREATE TABLE IF NOT EXISTS local_installation(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  return JSON.parse(db.prepare("SELECT value FROM local_installation WHERE key='endpoints'").get()?.value||'[]');
}
export function createLocalSetup({db,key,gateway,token,now=Date.now}) {
  localSettings(db);
  const expires=now()+3600000;
  function verify(supplied) {
    if(typeof supplied!=='string'||!/^[a-f0-9]{64}$/.test(supplied)||supplied.length!==token.length||!timingSafeEqual(Buffer.from(supplied),Buffer.from(token))||now()>expires)throw Object.assign(Error('Este acesso de instalação expirou ou é inválido. Abra novamente pelo iniciador.'),{status:403});
    if(db.prepare('SELECT count(*) AS n FROM organizations').get().n)throw Object.assign(Error('O primeiro acesso já foi concluído. Entre na sua conta.'),{status:409});
  }
  return {
    status(supplied){verify(supplied);return {model:'Intelbras MHDX 1208',host:'192.168.1.64',port:554,channel:1,videoReady:gateway.ready||Boolean(gateway.executable)}},
    async create(data,supplied) {
      verify(supplied);
      if(typeof data.name!=='string'||!data.name.trim()||data.name.length>100||typeof data.email!=='string'||data.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw Object.assign(Error('Informe seu nome e um e-mail válido.'),{status:400});
      if(data.password!==data.confirm)throw Object.assign(Error('As senhas da sua nova conta não coincidem.'),{status:400});
      let passwordHash;try{passwordHash=await hashPassword(data.password)}catch(error){throw Object.assign(error,{status:400})}
      const orgId=randomUUID(),userId=randomUUID(),clientId=randomUUID(),cameraId=randomUUID();
      const endpoint={clientId,address:'192.168.1.64:554'},allowed=parseEndpoints(JSON.stringify([endpoint]));
      if(typeof data.dvrUsername!=='string'||!data.dvrUsername.trim()||typeof data.dvrPassword!=='string'||!data.dvrPassword)throw Object.assign(Error('Informe o usuário e a senha do DVR.'),{status:400});
      const config=validateConnection({host:'192.168.1.64',port:554,profile:'intelbras-mhdx-1208',channel:1,stream:1,username:data.dvrUsername,password:data.dvrPassword},allowed,clientId);
      const secret=sealConnection(key,{id:cameraId,org_id:orgId},config);
      transaction(db,()=>{
        verify(supplied);
        db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(orgId,'invictus','Invictus Monitoramento','INVICTUS');
        db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)').run(userId,orgId,data.name.trim(),data.email.trim().toLowerCase(),passwordHash,'admin');
        db.prepare('INSERT INTO clients VALUES(?,?,?)').run(clientId,orgId,'Casa');
        db.prepare('INSERT INTO cameras VALUES(?,?,?,?,?)').run(cameraId,orgId,clientId,'DVR Casa · Canal 1',new Date(now()).toISOString());
        db.prepare('INSERT INTO camera_connections(camera_id,org_id,secret,enabled,version,updated_at) VALUES(?,?,?,1,1,?)').run(cameraId,orgId,secret,new Date(now()).toISOString());
        db.prepare("INSERT INTO local_installation VALUES('endpoints',?)").run(JSON.stringify([endpoint]));
        audit(db,{id:userId,org_id:orgId},'installation.created',cameraId);
      });
      for(const entry of allowed)gateway.endpoints.add(entry);
      return {company:'invictus',email:data.email.trim().toLowerCase()};
    }
  };
}
