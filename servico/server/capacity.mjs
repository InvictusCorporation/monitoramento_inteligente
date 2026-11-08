import {readFileSync} from 'node:fs';
export function validateCapacity(value={}){
  const live=value.live??8,captures=value.captures??2;
  if(!Number.isInteger(live)||live<1||live>64||!Number.isInteger(captures)||captures<1||captures>8)throw Error('Capacidade inválida: live de 1 a 64; captures de 1 a 8.');
  const perOwner=value.perOperator??Math.min(live,16);
  if(!Number.isInteger(perOwner)||perOwner<1||perOwner>live)throw Error('perOperator deve ser inteiro de 1 até live.');
  return {maxStreams:live,maxSnapshots:captures,maxStreamsPerOwner:perOwner};
}
export function loadCapacity(path,env=process.env){
  let value={};try{value=JSON.parse(readFileSync(path,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
  if(env.INVICTUS_MAX_LIVE!==undefined)value.live=Number(env.INVICTUS_MAX_LIVE);
  if(env.INVICTUS_MAX_CAPTURES!==undefined)value.captures=Number(env.INVICTUS_MAX_CAPTURES);
  if(env.INVICTUS_MAX_LIVE_PER_OPERATOR!==undefined)value.perOperator=Number(env.INVICTUS_MAX_LIVE_PER_OPERATOR);
  return validateCapacity(value);
}
