import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateConnection, parseEndpoints } from '../server/video-gateway.mjs';

const endpoints=parseEndpoints('[{"clientId":"local","address":"192.168.1.100:554"}]');
const base={host:'192.168.1.100',port:554,username:'operador',password:'teste',profile:'intelbras-mhdx-1208'};
test('MHDX 1208 produz os oito canais e ambos os fluxos, ignorando caminho adulterado',()=>{
  for(let channel=1;channel<=8;channel++)for(const stream of [0,1]) {
    const result=validateConnection({...base,channel:String(channel),stream:String(stream),path:'/injetado'},endpoints,'local');
    assert.equal(result.path,`/cam/realmonitor?channel=${channel}&subtype=${stream}`);
    assert.equal(result.channel,channel);assert.equal(result.stream,stream);
  }
});
test('MHDX 1208 rejeita canais, fluxos e modelos fora do perfil',()=>{
  for(const channel of [0,9,-1,1.5,null,true,'1&subtype=0'])assert.throws(()=>validateConnection({...base,channel,stream:1},endpoints,'local'),/canal/);
  for(const stream of [-1,2,null,true,'0&x=1'])assert.throws(()=>validateConnection({...base,channel:1,stream},endpoints,'local'),/fluxo/);
  assert.throws(()=>validateConnection({...base,profile:'desconhecido'},endpoints,'local'),/Modelo/);
});
test('Perfil Intelbras mantém autorização por local; configuração manual continua disponível',()=>{
  assert.throws(()=>validateConnection({...base,channel:1,stream:1},endpoints,'outro'),/este local/);
  assert.equal(validateConnection({...base,profile:'manual',path:'/canal-customizado'},endpoints,'local').path,'/canal-customizado');
});
