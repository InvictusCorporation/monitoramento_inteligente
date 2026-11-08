import {installCommercial} from './commercial.mjs';
import { installAI } from './ai-detector.mjs';
import { installMonitoring } from './monitoring.mjs';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export function openDatabase(path = resolve('data/monitoramento.sqlite')) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS organizations(
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, brand TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clients(
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL,
      UNIQUE(org_id,id));
    CREATE TABLE IF NOT EXISTS users(
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id), name TEXT NOT NULL,
      email TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','operator','client')), client_id TEXT,
      active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
      UNIQUE(org_id,email), UNIQUE(org_id,id),
      CHECK((role='client' AND client_id IS NOT NULL) OR (role!='client' AND client_id IS NULL)),
      FOREIGN KEY(org_id,client_id) REFERENCES clients(org_id,id));
    CREATE TABLE IF NOT EXISTS cameras(
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, client_id TEXT NOT NULL, name TEXT NOT NULL,
      created_at TEXT NOT NULL, UNIQUE(org_id,id),
      FOREIGN KEY(org_id,client_id) REFERENCES clients(org_id,id));
    CREATE TABLE IF NOT EXISTS events(
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, camera_id TEXT NOT NULL, title TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Alta','Média','Baixa')), rule TEXT NOT NULL,
      created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pendente'
        CHECK(status IN ('Pendente','Em análise','Finalizada')),
      note TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(org_id,camera_id) REFERENCES cameras(org_id,id));
    CREATE TABLE IF NOT EXISTS sessions(
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(
      id TEXT PRIMARY KEY, org_id TEXT NOT NULL, actor_id TEXT NOT NULL,
      action TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY(org_id,actor_id) REFERENCES users(org_id,id));
    CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(org_id);
    CREATE INDEX IF NOT EXISTS idx_cameras_scope ON cameras(org_id,client_id);
    CREATE INDEX IF NOT EXISTS idx_events_scope ON events(org_id,camera_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);`);
  db.exec(`CREATE TABLE IF NOT EXISTS camera_connections(
    camera_id TEXT PRIMARY KEY, org_id TEXT NOT NULL,
    secret TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN(0,1)),
    version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL,
    FOREIGN KEY(org_id,camera_id) REFERENCES cameras(org_id,id));
    INSERT OR IGNORE INTO schema_migrations(version) VALUES(2);`);
  installMonitoring(db);
  installAI(db);
  db.exec(`CREATE TABLE IF NOT EXISTS event_evidence(
    event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(id),
    captured_at TEXT NOT NULL, image BLOB NOT NULL CHECK(length(image)<=4194304));
    INSERT OR IGNORE INTO schema_migrations VALUES(5);`);
  db.exec(`CREATE TABLE IF NOT EXISTS monitoring_service(
    org_id TEXT PRIMARY KEY REFERENCES organizations(id), owner_id TEXT NOT NULL,
    enabled INTEGER NOT NULL CHECK(enabled IN(0,1)), interval_seconds INTEGER NOT NULL CHECK(interval_seconds BETWEEN 30 AND 3600),
    cooldown_seconds INTEGER NOT NULL CHECK(cooldown_seconds BETWEEN 30 AND 86400), daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 10000),version INTEGER NOT NULL,
    FOREIGN KEY(org_id,owner_id) REFERENCES users(org_id,id));
    CREATE TABLE IF NOT EXISTS monitoring_jobs(camera_id TEXT PRIMARY KEY,org_id TEXT NOT NULL,attempt_at INTEGER NOT NULL,next_at INTEGER NOT NULL,status TEXT NOT NULL,message TEXT NOT NULL,
    FOREIGN KEY(org_id,camera_id) REFERENCES cameras(org_id,id));
    INSERT OR IGNORE INTO schema_migrations VALUES(6);`);
  db.exec(`CREATE TABLE IF NOT EXISTS event_claims(
    event_id TEXT PRIMARY KEY REFERENCES events(id),org_id TEXT NOT NULL,actor_id TEXT NOT NULL,claimed_at TEXT NOT NULL,
    FOREIGN KEY(org_id,actor_id) REFERENCES users(org_id,id));
    INSERT OR IGNORE INTO schema_migrations VALUES(7);`);
  db.exec(`CREATE TABLE IF NOT EXISTS event_revisions(
    audit_id TEXT PRIMARY KEY REFERENCES audit(id),event_id TEXT NOT NULL REFERENCES events(id),org_id TEXT NOT NULL REFERENCES organizations(id),
    old_status TEXT NOT NULL,new_status TEXT NOT NULL,old_note TEXT NOT NULL,new_note TEXT NOT NULL,
    old_version INTEGER NOT NULL,new_version INTEGER NOT NULL);
    INSERT OR IGNORE INTO schema_migrations VALUES(8);`);
  if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='must_change_password'))db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0 CHECK(must_change_password IN(0,1))');
  db.exec('INSERT OR IGNORE INTO schema_migrations VALUES(9)');
  db.exec(`CREATE TABLE IF NOT EXISTS event_transfers(
    audit_id TEXT PRIMARY KEY REFERENCES audit(id),event_id TEXT NOT NULL REFERENCES events(id),org_id TEXT NOT NULL REFERENCES organizations(id),
    from_user_id TEXT NOT NULL,to_user_id TEXT NOT NULL,from_name TEXT NOT NULL,to_name TEXT NOT NULL,
    reason TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 1000),new_version INTEGER NOT NULL,
    FOREIGN KEY(org_id,from_user_id) REFERENCES users(org_id,id),
    FOREIGN KEY(org_id,to_user_id) REFERENCES users(org_id,id));
    CREATE INDEX IF NOT EXISTS idx_event_transfers_history ON event_transfers(org_id,event_id,new_version DESC);
    INSERT OR IGNORE INTO schema_migrations VALUES(10);`);
  db.exec(`CREATE TABLE IF NOT EXISTS alert_policies(
    org_id TEXT PRIMARY KEY REFERENCES organizations(id),enabled INTEGER NOT NULL CHECK(enabled IN(0,1)),
    waiting_minutes INTEGER NOT NULL CHECK(waiting_minutes BETWEEN 1 AND 1440),
    handling_minutes INTEGER NOT NULL CHECK(handling_minutes BETWEEN 1 AND 1440),version INTEGER NOT NULL);
    INSERT OR IGNORE INTO schema_migrations VALUES(11);`);
  installCommercial(db);
  if(!db.prepare('SELECT 1 FROM schema_migrations WHERE version=16').get())transaction(db,()=>{
    db.exec(`CREATE TABLE monitoring_service_v16(
      org_id TEXT PRIMARY KEY REFERENCES organizations(id), owner_id TEXT NOT NULL,
      enabled INTEGER NOT NULL CHECK(enabled IN(0,1)), interval_seconds INTEGER NOT NULL CHECK(interval_seconds BETWEEN 10 AND 3600),
      cooldown_seconds INTEGER NOT NULL CHECK(cooldown_seconds BETWEEN 30 AND 86400), daily_limit INTEGER NOT NULL CHECK(daily_limit BETWEEN 1 AND 10000),version INTEGER NOT NULL,
      FOREIGN KEY(org_id,owner_id) REFERENCES users(org_id,id));
      INSERT INTO monitoring_service_v16 SELECT * FROM monitoring_service;
      DROP TABLE monitoring_service;
      ALTER TABLE monitoring_service_v16 RENAME TO monitoring_service;
      INSERT INTO schema_migrations VALUES(16);`);
  });
  return db;
}
export function transaction(db, action) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = action(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function passwordValid(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}
export async function hashPassword(password) {
  if (!passwordValid(password)) throw new Error('A senha deve ter de 12 a 128 caracteres.');
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const [, salt, hex] = encoded.split('$');
  const key = await scrypt(password, salt, 64);
  return timingSafeEqual(key, Buffer.from(hex, 'hex'));
}
export async function createOrganization(db, { name, slug, adminName, email, password }, {authorize=()=>{},parentId=null,initialPassword=false,onCreated=()=>{}}={}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) throw new Error('Código de empresa inválido.');
  if (![name,adminName].every(s => typeof s === 'string' && s.trim().length > 0 && s.length <= 100)) throw new Error('Nome inválido.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('E-mail inválido.');
  const hash = await hashPassword(password);
  const orgId = randomUUID(), userId = randomUUID();
  transaction(db, () => {
    authorize();
    db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(orgId, slug, name.trim(), name.trim().slice(0,24));
    db.prepare('INSERT INTO users(id,org_id,name,email,password_hash,role) VALUES(?,?,?,?,?,?)')
      .run(userId, orgId, adminName.trim(), email.trim().toLowerCase(), hash, 'admin');
    if(parentId)db.prepare('INSERT INTO company_partners VALUES(?,?)').run(orgId,parentId);
    if(initialPassword)db.prepare('UPDATE users SET must_change_password=1 WHERE id=?').run(userId);
    onCreated(orgId);
  });
  return { orgId, userId };
}
export function audit(db, user, action, target) {
  const id=randomUUID();
  db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(id, user.org_id, user.id, action, target, new Date().toISOString());
  return id;
}
