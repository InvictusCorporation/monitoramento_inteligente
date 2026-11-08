import {createInterface} from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import {readBackupSchedule,readBackupStatus,validateBackupSchedule,writeLocalJson} from '../server/backup-scheduler.mjs';
import {externalDestination} from './external-backup.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),rl=createInterface({input:process.stdin,output:process.stdout});
try{
  let config;try{config=readBackupSchedule(root)}catch{config=validateBackupSchedule();console.log('Configuracao atual invalida. Corrija usando a opcao 1 ou 2.')}
  const state=readBackupStatus(root),labels={success:'Concluido e verificado',error:'Falha na copia',interrupted:'Interrompido',running:'Em andamento ou interrompido antes de registrar conclusao',disabled:'Desativado',config_error:'Configuracao invalida',invalid_state:'Historico local invalido'};
  console.log('Backup automatico: '+(config.enabled?'ATIVADO':'DESATIVADO'));
  console.log('Situacao registrada: '+(labels[state.status]||'Sem execucao registrada'));
  console.log('Ultima conclusao: '+(state.lastSuccess?new Date(state.lastSuccess).toLocaleString('pt-BR'):'Nenhuma'));
  console.log('Intervalo: '+config.intervalHours+' hora(s). Destino: '+(config.destination||'Nao definido'));
  console.log('1 - Ativar/alterar | 2 - Desativar | Enter - Sair');
  const option=(await rl.question('Opcao: ')).trim();
  if(option==='1'){
    let destination=(await rl.question('Pasta externa existente (caminho completo): ')).trim();if(destination.startsWith('"')&&destination.endsWith('"'))destination=destination.slice(1,-1);
    const intervalHours=Number((await rl.question('Intervalo em horas (1 a 168): ')).trim());
    config=validateBackupSchedule({enabled:true,intervalHours,destination:externalDestination(root,destination)});
    writeLocalJson(root,'backup-schedule.json',config);
    console.log('Configurado. O servidor aberto verifica a configuracao a cada minuto. A primeira copia ocorre quando houver uma execucao pendente.');
    console.log('Use disco externo ou pasta de rede protegida. Estar fora da instalacao nao garante que seja outro disco. Backups nao sao apagados automaticamente.');
  }else if(option==='2'){
    writeLocalJson(root,'backup-schedule.json',{...config,enabled:false});console.log('Desativado. Uma copia ja em andamento pode terminar; as proximas nao serao iniciadas.');
  }else if(option)throw Error('Opcao invalida.');
}catch(error){console.error('Configuracao nao concluida: '+error.message);process.exitCode=1}finally{rl.close()}
