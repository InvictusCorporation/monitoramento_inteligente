export const INTELBRAS_MHDX_1208='intelbras-mhdx-1208';
export function normalizeCameraProfile(data) {
  const profile=data.profile||'manual';
  if(profile==='manual')return data;
  if(profile!==INTELBRAS_MHDX_1208)throw Object.assign(new Error('Modelo de equipamento não reconhecido.'),{status:400});
  if(!['1','2','3','4','5','6','7','8'].includes(String(data.channel)))throw Object.assign(new Error('Selecione um canal de 1 a 8.'),{status:400});
  if(!['0','1'].includes(String(data.stream)))throw Object.assign(new Error('Selecione o fluxo principal ou extra.'),{status:400});
  const channel=Number(data.channel),stream=Number(data.stream);
  return {...data,profile,channel,stream,path:`/cam/realmonitor?channel=${channel}&subtype=${stream}`};
}
