import {DatabaseSync} from 'node:sqlite';
import {copyFileSync,constants,mkdirSync,readFileSync,writeFileSync,renameSync,realpathSync,lstatSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {verifyBackup,fingerprint} from './backup-local.mjs';
import {openConnection} from '../server/camera-secrets.mjs';

export function restoreBackup(root,directory){
  root=realpathSync(resolve(root));directory=realpathSync(resolve(directory));
  if(basename(directory).endsWith('.incompleto'))throw Error('Use um backup concluído, não uma pasta .incompleto.');
  const manifest=verifyBackup(directory);
  const base=join(root,'restauracoes');mkdirSync(base,{recursive:true,mode:0o700});
  if(lstatSync(base).isSymbolicLink()||realpathSync(base)!==base)throw Error('A pasta restauracoes deve estar dentro da instalação, sem redirecionamentos.');
  const name='recuperacao-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID();
  const pending=join(base,name+'.incompleto'),complete=join(base,name);
  mkdirSync(pending,{mode:0o700});const data=join(pending,'data');mkdirSync(data,{mode:0o700});
  for(const name of Object.keys(manifest.files))copyFileSync(join(directory,name),join(data,name),constants.COPYFILE_EXCL);
  // Verify the actual copied bytes before modifying them; the source may change while copying.
  writeFileSync(join(data,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
  verifyBackup(data);
  renameSync(join(data,'manifest.json'),join(pending,'backup-manifest.json'));
  const db=new DatabaseSync(join(data,'monitoramento.sqlite'));
  let result;
  try{
    db.exec('PRAGMA foreign_keys=ON; PRAGMA trusted_schema=OFF; PRAGMA journal_mode=DELETE');
    const tables=new Set(db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(t=>t.name));
    for(const table of ['schema_migrations','organizations','users','cameras','events','sessions','camera_connections','ai_settings'])if(!tables.has(table))throw Error('O banco não é um backup compatível do Invictus Monitoramento.');
    const version=db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version;
    if(!Number.isInteger(version)||version>16||version<4)throw Error('Versão do banco incompatível com esta ferramenta.');
    if(db.prepare('PRAGMA foreign_key_check').get())throw Error('O banco contém vínculos inválidos.');
    const key=readFileSync(join(data,'camera.key'));let credentials=0;
    try{
      for(const row of db.prepare('SELECT camera_id,org_id,secret FROM camera_connections').iterate()){
        openConnection(key,{id:row.camera_id,org_id:row.org_id},row.secret);credentials++;
      }
      for(const row of db.prepare('SELECT org_id,secret FROM ai_settings').iterate()){
        openConnection(key,{id:'openai-credential',org_id:row.org_id},row.secret);credentials++;
      }
    }catch{throw Error('A chave do backup não permite recuperar todas as credenciais. Nenhuma credencial foi exibida.')}
    db.exec('BEGIN IMMEDIATE');
    try{
      const sessionsRemoved=db.prepare('DELETE FROM sessions').run().changes;
      const servicesPaused=tables.has('monitoring_service')?db.prepare('UPDATE monitoring_service SET enabled=0,version=version+1 WHERE enabled=1').run().changes:0;
      if(tables.has('monitoring_jobs'))db.prepare("UPDATE monitoring_jobs SET status='interrupted',message='Recuperação de backup: serviço pausado; revisão necessária.' WHERE status='running'").run();
      result={sessionsRemoved,servicesPaused,credentialsChecked:credentials,organizations:db.prepare('SELECT count(*) n FROM organizations').get().n,users:db.prepare('SELECT count(*) n FROM users').get().n,cameras:db.prepare('SELECT count(*) n FROM cameras').get().n,events:db.prepare('SELECT count(*) n FROM events').get().n,photos:tables.has('event_evidence')?db.prepare('SELECT count(*) n FROM event_evidence').get().n:0};
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error}
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').get())throw Error('A cópia recuperada não passou na verificação final.');
  }finally{db.close()}
  const files={};for(const name of Object.keys(manifest.files))files[name]=fingerprint(join(data,name));
  const report={format:1,restoredAt:new Date().toISOString(),backupCreatedAt:manifest.createdAt,backupFormat:manifest.format,capacityRestored:Boolean(manifest.files['capacity.json']),...result,files};
  writeFileSync(join(pending,'restoration-report.json'),JSON.stringify(report,null,2),{flag:'wx',mode:0o600});
  writeFileSync(join(pending,'LEIA-ANTES-DE-USAR.txt'),
    'RECUPERACAO CONCLUIDA EM PASTA SEPARADA\n\nA instalacao original nao foi alterada. Nao envie esta pasta por chat.\n'+
    '1. Confira restoration-report.json e as quantidades recuperadas.\n'+
    '2. Para colocar em uso, encerre o servidor Invictus e faca backup dos dados atuais.\n'+
    '3. Na pasta da aplicacao, renomeie a pasta data atual para um nome novo (por exemplo data-anterior-DATA). Nao misture arquivos nem WAL de bancos diferentes.\n'+
    '4. Copie a pasta data desta recuperacao inteira para a pasta da aplicacao, onde a antiga data estava. Nao substitua arquivos individualmente.\n'+
    '5. Execute INICIAR-INVICTUS na aplicacao compativel, entre novamente e confira cadastros, ocorrencias, fotos e cameras. Senhas sao as que existiam na data do backup.\n'+
    '6. O monitoramento continuo esta pausado na copia. Reative somente depois de conferir as configuracoes.\n'+
    (report.capacityRestored?'A configuracao capacity.json foi recuperada.\n':'Este backup nao tinha capacity.json. O sistema usara os limites padrao, salvo variaveis de ambiente.\n')+
    'A ferramenta nao inicia o servidor, nao testa o DVR e nao consulta a API de IA. Nao confirma autenticidade do backup: use apenas uma copia de origem confiavel.\n',
    {flag:'wx',mode:0o600});
  renameSync(pending,complete);return {directory:complete,report};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let rl;
  try{
    let directory=process.argv[2];
    if(!directory){
      rl=createInterface({input:process.stdin,output:process.stdout});
      console.log('Recuperacao em pasta separada. O sistema atual nao sera substituido.');
      directory=(await rl.question('Cole o caminho da pasta do backup concluido e pressione Enter: ')).trim();
      if(directory.startsWith('"')&&directory.endsWith('"'))directory=directory.slice(1,-1);
    }
    if(!directory)throw Error('Informe a pasta do backup.');
    const result=restoreBackup(fileURLToPath(new URL('../',import.meta.url)),directory);
    console.log('Recuperacao verificada em:\n'+result.directory);
    console.log('Leia LEIA-ANTES-DE-USAR.txt nessa pasta. Logins antigos removidos; monitoramento continuo pausado na copia.');
  }catch(error){console.error('Recuperacao nao concluida: '+(error.code==='ENOENT'?'Pasta ou arquivo necessario nao encontrado.':error.message));console.error('Nao use pastas terminadas em .incompleto. A instalacao original nao foi substituida.');process.exitCode=1}
  finally{rl?.close()}
}
