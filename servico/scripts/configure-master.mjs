import {createInterface} from 'node:readline/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {openDatabase,audit,transaction} from '../server/database.mjs';
const rl=createInterface({input:process.stdin,output:process.stdout});let db;
try{
  console.log('Acesso master comercial: permite cadastrar parceiras e licenciar locais. Nao concede acesso as imagens de outras empresas.');
  const slug=(await rl.question('Codigo da sua empresa existente: ')).trim(),email=(await rl.question('Email do administrador existente: ')).trim().toLowerCase();
  const path=process.env.DB_PATH||resolve('data/monitoramento.sqlite');if(!existsSync(path))throw Error('Instalacao existente nao encontrada. Configure o primeiro acesso antes.');
  db=openDatabase(path);
  const user=db.prepare("SELECT u.* FROM users u JOIN organizations o ON o.id=u.org_id WHERE o.slug=? AND u.email=? AND u.active=1 AND u.role='admin' AND u.must_change_password=0").get(slug,email);
  if(!user)throw Error('Administrador ativo com senha definida nao encontrado.');
  const option=(await rl.question('Digite ATIVAR para conceder ou REMOVER para revogar o acesso master: ')).trim();
  if(!['ATIVAR','REMOVER'].includes(option))throw Error('Nenhuma alteracao realizada.');
  transaction(db,()=>{if(option==='ATIVAR'){db.prepare('INSERT OR IGNORE INTO platform_admins VALUES(?)').run(user.id);db.prepare('INSERT OR IGNORE INTO commercial_centrals VALUES(?)').run(user.org_id)}else db.prepare('DELETE FROM platform_admins WHERE user_id=?').run(user.id);audit(db,user,option==='ATIVAR'?'platform.granted':'platform.revoked',user.id)});
  console.log('Acesso comercial atualizado. Atualize o painel no navegador.');
}catch(error){console.error(error.message);process.exitCode=1}finally{rl.close();db?.close()}
