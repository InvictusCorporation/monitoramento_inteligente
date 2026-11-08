import {readFile,readdir,realpath,lstat} from 'node:fs/promises';
import {resolve,relative,sep,extname} from 'node:path';

// Build-only allowlist. No source maps, symlinks, fallback HTML or data directories.
export async function modernUi(root){
  const base=await realpath(root),files=new Map();
  async function walk(directory){
    for(const entry of await readdir(directory,{withFileTypes:true})){
      const file=resolve(directory,entry.name);
      if(entry.isSymbolicLink())throw Error('Symlink não permitido no build operacional.');
      if(entry.isDirectory()){if(directory===base&&entry.name==='assets')await walk(file);continue}
      const rel=relative(base,file).split(sep).join('/');
      if(rel!=='index.html'&&!/^assets\/[a-zA-Z0-9_.-]+\.(js|css|woff2|png|jpg|ico)$/.test(rel))continue;
      const canonical=await realpath(file);
      if(relative(base,canonical).startsWith('..')||!(await lstat(canonical)).isFile())throw Error('Build operacional inválido.');
      files.set('/interface/'+rel,{bytes:await readFile(canonical),type:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'})[extname(rel)]});
    }
  }
  await walk(base);
  if(!files.has('/interface/index.html'))throw Error('Compile a interface operacional antes de iniciar.');
  return async(path,res)=>{
    const asset=files.get(path==='/'||path==='/interface/'?'/interface/index.html':path);
    if(!asset)return false;
    res.setHeader('Content-Type',asset.type);res.end(asset.bytes);return true;
  };
}