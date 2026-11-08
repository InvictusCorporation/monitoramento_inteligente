import { openDatabase } from '../server/database.mjs';
const db=openDatabase(process.env.DB_PATH||undefined);
try {
  const rows=db.prepare('SELECT o.slug AS empresa,c.id AS clientId,c.name AS local FROM clients c JOIN organizations o ON o.id=c.org_id ORDER BY o.slug,c.name').all();
  console.table(rows);
  if(!rows.length)console.log('Cadastre um cliente/local no painel antes de autorizar seus equipamentos.');
} finally {db.close()}
