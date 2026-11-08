import { mkdir, readFile, writeFile, readdir, access } from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
if(Number(process.versions.node.split('.')[0])<24)throw Error('Este aplicativo exige Node.js 24 ou superior.');
if(process.platform!=='win32')throw Error('Este iniciador foi preparado para Windows. Consulte README.md para outras instalações.');
const runtime=resolve('data/local-runtime.json'),tools=resolve('.tools');
async function valid(path){try{const r=await exec(path,['-hide_banner','-encoders'],{windowsHide:true,timeout:15000,maxBuffer:1000000});return /\blibx264\b/.test(r.stdout)}catch{return false}}
async function findExecutable(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})) {
    if(entry.isDirectory()){const found=await findExecutable(join(directory,entry.name));if(found)return found}
    if(entry.isFile()&&entry.name.toLowerCase()==='ffmpeg.exe')return join(directory,entry.name);
  }
}
try {
  let existing;try{existing=JSON.parse(await readFile(runtime,'utf8')).ffmpeg}catch{}
  if(existing&&await valid(existing)){console.log('Componente de vídeo já disponível.');process.exit(0)}
  if(process.env.FFMPEG_PATH&&await valid(process.env.FFMPEG_PATH)) {
    await mkdir(resolve('data'),{recursive:true});await writeFile(runtime,JSON.stringify({ffmpeg:resolve(process.env.FFMPEG_PATH)}));
    console.log('Componente de vídeo existente configurado.');process.exit(0);
  }
  await mkdir(tools,{recursive:true});
  const archive=join(tools,'ffmpeg-release-essentials.zip');
  const url='https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
  console.log('Baixando FFmpeg Essentials de gyan.dev, fonte indicada pelo site ffmpeg.org.');
  const checksumResponse=await fetch(url+'.sha256',{signal:AbortSignal.timeout(30000)});
  if(!checksumResponse.ok)throw Error('Não foi possível obter a verificação do download.');
  const expected=(await checksumResponse.text()).match(/\b[a-fA-F0-9]{64}\b/)?.[0]?.toLowerCase();
  if(!expected)throw Error('Código de verificação inválido.');
  let reuse=false;
  try{await access(archive);const hash=createHash('sha256');for await(const chunk of createReadStream(archive))hash.update(chunk);reuse=hash.digest('hex')===expected}catch{}
  if(!reuse){
    const r=await fetch(url,{signal:AbortSignal.timeout(600000)});if(!r.ok)throw Error('Download do FFmpeg indisponível.');
    let bytes=0,reported=0;
    const bounded=new Transform({transform(chunk,encoding,callback){bytes+=chunk.length;if(bytes>300*1024*1024)return callback(Error('Download excedeu o limite esperado.'));if(bytes-reported>20*1024*1024){reported=bytes;console.log(`Recebidos ${Math.round(bytes/1024/1024)} MB…`)}callback(null,chunk)}});
    await pipeline(Readable.fromWeb(r.body),bounded,createWriteStream(archive));
  }
  const hash=createHash('sha256');for await(const chunk of createReadStream(archive))hash.update(chunk);
  if(hash.digest('hex')!==expected)throw Error('A verificação do arquivo falhou. Nenhum executável foi iniciado. Abra novamente o iniciador para tentar baixar outra vez.');
  const destination=join(tools,'ffmpeg-'+expected.slice(0,16));
  await mkdir(destination,{recursive:true});
  const script=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $dest=[System.IO.Path]::GetFullPath($env:INVICTUS_EXTRACT_DEST).TrimEnd([System.IO.Path]::DirectorySeparatorChar)+[System.IO.Path]::DirectorySeparatorChar; $zip=[System.IO.Compression.ZipFile]::OpenRead($env:INVICTUS_EXTRACT_ARCHIVE); try { foreach($entry in $zip.Entries){ $target=[System.IO.Path]::GetFullPath([System.IO.Path]::Combine($dest,$entry.FullName)); if(-not $target.StartsWith($dest,[System.StringComparison]::OrdinalIgnoreCase)){throw 'Caminho invalido no arquivo.'} } } finally {$zip.Dispose()}; Expand-Archive -LiteralPath $env:INVICTUS_EXTRACT_ARCHIVE -DestinationPath $dest -Force`;
  await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:300000,env:{...process.env,INVICTUS_EXTRACT_DEST:destination,INVICTUS_EXTRACT_ARCHIVE:archive}});
  const executable=await findExecutable(destination);
  if(!executable||!await valid(executable))throw Error('O componente foi extraído, mas não passou na verificação de vídeo.');
  await mkdir(resolve('data'),{recursive:true});await writeFile(runtime,JSON.stringify({ffmpeg:executable,source:url,sha256:expected},null,2));
  console.log('Componente de vídeo instalado e verificado.');
}catch(error){console.error('Não foi possível preparar o vídeo: '+error.message);process.exitCode=1}
