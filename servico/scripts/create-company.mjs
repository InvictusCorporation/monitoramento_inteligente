import { createInterface } from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { openDatabase, createOrganization } from '../server/database.mjs';

if(!process.stdin.isTTY)throw Error('Execute em um terminal interativo. Senhas não devem ser passadas em argumentos.');
const rl=createInterface({input:process.stdin,output:process.stdout});
const name=await rl.question('Nome da empresa: ');
const slug=await rl.question('Código de acesso da empresa (ex.: invictus): ');
const adminName=await rl.question('Nome do administrador: ');
const email=await rl.question('E-mail do administrador: ');
rl.close();
async function secret(prompt){
  process.stdout.write(prompt);emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
  return new Promise((resolve,reject)=>{
    let value='';
    function finish(error){process.stdin.off('keypress',handler);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');error?reject(error):resolve(value)}
    function handler(text,key){
      if(key?.ctrl&&key.name==='c')return finish(Error('Cancelado.'));
      if(key?.name==='return')return finish();
      if(key?.name==='backspace'){value=value.slice(0,-1);return}
      if(text&&!key?.ctrl&&!key?.meta&&![...text].some(c=>c.charCodeAt(0)<32))value+=text;
    }
    process.stdin.on('keypress',handler);
  });
}
let password=await secret('Senha (12–128 caracteres, entrada oculta): ');
const confirm=await secret('Repita a senha: ');
if(password!==confirm)throw Error('As senhas não coincidem.');
const db=openDatabase(process.env.DB_PATH||undefined);
try{await createOrganization(db,{name,slug:slug.trim().toLowerCase(),adminName,email:email.trim(),password});console.log('Empresa e administrador criados. Inicie o servidor e entre com os dados informados.');}
catch(error){console.error(error.code?.includes('SQLITE')?'Não foi possível cadastrar. Verifique se o código da empresa já existe.':error.message);process.exitCode=1;}
finally{password='';db.close()}
