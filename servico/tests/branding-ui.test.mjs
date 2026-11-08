import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
test('cor clara/escura mantém contraste e logout remove a logo da sessão anterior',()=>{
  const nodes={'#appView':{style:{setProperty(){}}},'#brandLogo':{removeAttribute(key){delete this[key]}},'aside .shield':{},'footer':{}};
  const ctx=vm.createContext({$:s=>nodes[s],document:{}});
  vm.runInContext(source.slice(source.indexOf('function brandColors('),source.indexOf('function showLogin(')),ctx);
  assert.equal(ctx.brandColors('#ffffff').foreground,'#000000');assert.equal(ctx.brandColors('#000000').foreground,'#ffffff');assert.equal(ctx.brandColors('url(evil)').color,'#1973f9');
  ctx.applyBranding({brand:'Marca',branding:{primaryColor:'#ffcc00',logoDataUrl:'data:image/png;base64,fixture'}});
  assert.equal(nodes['#brandLogo'].hidden,false);assert.equal(nodes['aside .shield'].hidden,true);
  ctx.applyBranding(null);assert.equal(nodes['#brandLogo'].hidden,true);assert.equal(nodes['#brandLogo'].src,undefined);assert.equal(nodes['aside .shield'].hidden,false);
});
