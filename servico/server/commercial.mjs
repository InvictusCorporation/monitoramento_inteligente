export function installCommercial(db){
  const installed=!!db.prepare('SELECT 1 FROM schema_migrations WHERE version=12').get();
  db.exec('BEGIN IMMEDIATE');
  try{
  db.exec(`CREATE TABLE IF NOT EXISTS platform_admins(user_id TEXT PRIMARY KEY REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS commercial_centrals(org_id TEXT PRIMARY KEY REFERENCES organizations(id));
    CREATE TABLE IF NOT EXISTS company_partners(org_id TEXT PRIMARY KEY REFERENCES organizations(id),parent_org_id TEXT NOT NULL REFERENCES organizations(id),CHECK(org_id<>parent_org_id));
    CREATE TABLE IF NOT EXISTS location_licenses(client_id TEXT PRIMARY KEY,org_id TEXT NOT NULL,plan TEXT NOT NULL,enabled INTEGER NOT NULL CHECK(enabled IN(0,1)),camera_limit INTEGER NOT NULL CHECK(camera_limit BETWEEN 1 AND 256),expires_at TEXT,version INTEGER NOT NULL,
      FOREIGN KEY(org_id,client_id) REFERENCES clients(org_id,id));
    CREATE TABLE IF NOT EXISTS commercial_customers(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,UNIQUE(org_id,id));
    CREATE TABLE IF NOT EXISTS customer_locations(client_id TEXT PRIMARY KEY,org_id TEXT NOT NULL,customer_id TEXT NOT NULL,
      FOREIGN KEY(org_id,client_id) REFERENCES clients(org_id,id),FOREIGN KEY(org_id,customer_id) REFERENCES commercial_customers(org_id,id));
    CREATE TABLE IF NOT EXISTS commercial_legacy_locations(client_id TEXT PRIMARY KEY,org_id TEXT NOT NULL,
      FOREIGN KEY(org_id,client_id) REFERENCES clients(org_id,id));
    INSERT OR IGNORE INTO schema_migrations VALUES(12);`);
  if(!installed)db.exec('INSERT OR IGNORE INTO commercial_legacy_locations SELECT id,org_id FROM clients');
  db.exec(`CREATE TABLE IF NOT EXISTS commercial_plans(id TEXT PRIMARY KEY,org_id TEXT NOT NULL REFERENCES organizations(id),name TEXT NOT NULL,camera_limit INTEGER NOT NULL CHECK(camera_limit BETWEEN 1 AND 256),active INTEGER NOT NULL CHECK(active IN(0,1)),version INTEGER NOT NULL CHECK(version>0));
    CREATE TABLE IF NOT EXISTS license_plan_selections(client_id TEXT PRIMARY KEY REFERENCES location_licenses(client_id),plan_id TEXT NOT NULL REFERENCES commercial_plans(id),plan_version INTEGER NOT NULL CHECK(plan_version>0));
    INSERT OR IGNORE INTO schema_migrations VALUES(13);`);
  db.exec(`CREATE TABLE IF NOT EXISTS organization_branding(org_id TEXT PRIMARY KEY REFERENCES organizations(id),primary_color TEXT NOT NULL,logo TEXT,version INTEGER NOT NULL CHECK(version>0));
    INSERT OR IGNORE INTO schema_migrations VALUES(14);`);
  db.exec(`CREATE INDEX IF NOT EXISTS audit_target_action ON audit(org_id,target_id,action); INSERT OR IGNORE INTO schema_migrations VALUES(15);`);
  db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error}
}
export function isPlatformAdmin(db,u){return u.role==='admin'&&!!db.prepare('SELECT 1 FROM platform_admins WHERE user_id=?').get(u.id)}
export function managedCompany(db,u,org){return org===u.org_id||!!db.prepare('SELECT 1 FROM company_partners WHERE org_id=? AND parent_org_id=?').get(org,u.org_id)}
export function locationLicense(db,org,client,now=Date.now()){
  const row=db.prepare('SELECT plan,enabled,camera_limit AS cameraLimit,expires_at AS expiresAt,version FROM location_licenses WHERE org_id=? AND client_id=?').get(org,client);
  if(!row){
    const partner=!!db.prepare('SELECT 1 FROM company_partners WHERE org_id=?').get(org);
    const central=!!db.prepare('SELECT 1 FROM commercial_centrals WHERE org_id=?').get(org);
    const legacy=!!db.prepare('SELECT 1 FROM commercial_legacy_locations WHERE client_id=? AND org_id=?').get(client,org);
    const required=partner||(central&&!legacy);
    return {status:required?'pending':'legacy',allowed:!required,plan:'',enabled:false,cameraLimit:null,expiresAt:null,version:0};
  }
  const status=!row.enabled?'suspended':row.expiresAt&&Date.parse(row.expiresAt)<=now?'expired':'active';
  return {...row,enabled:!!row.enabled,status,allowed:status==='active'};
}
export function assertLocationLicense(db,org,client,now=Date.now(),adding=false){
  const license=locationLicense(db,org,client,now);
  if(!license.allowed)throw Object.assign(Error('Licença patrimonial deste local pendente, suspensa ou vencida. Procure a gestão comercial.'),{status:403});
  if(adding&&license.cameraLimit!==null&&db.prepare('SELECT count(*) n FROM cameras WHERE org_id=? AND client_id=?').get(org,client).n>=license.cameraLimit)throw Object.assign(Error('Limite de câmeras da licença atingido.'),{status:409});
  return license;
}
