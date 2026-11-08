export const DEFAULT_COLOR='#1973f9';
function invalid(message){throw Object.assign(Error(message),{status:400})}
export function branding(db,org){
  return db.prepare('SELECT primary_color AS primaryColor,logo AS logoDataUrl,version FROM organization_branding WHERE org_id=?').get(org)||{primaryColor:DEFAULT_COLOR,logoDataUrl:null,version:0};
}
export function validateBranding(data){
  if(typeof data.brand!=='string'||!data.brand.trim()||data.brand.length>24)invalid('Informe uma marca com até 24 caracteres.');
  if(typeof data.primaryColor!=='string'||!/^#[0-9a-fA-F]{6}$/.test(data.primaryColor))invalid('Cor inválida. Use o seletor de cor.');
  if(!Number.isInteger(data.version)||data.version<0)invalid('Versão inválida.');
  if(data.logoDataUrl!==null){
    if(typeof data.logoDataUrl!=='string'||data.logoDataUrl.length>131100||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(data.logoDataUrl))invalid('Use uma imagem PNG de até 96 KB.');
    const b=Buffer.from(data.logoDataUrl.slice(22),'base64');
    if(b.toString('base64')!==data.logoDataUrl.slice(22)||b.length>98304||b.length<45||!b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||b.readUInt32BE(8)!==13||b.toString('ascii',12,16)!=='IHDR')invalid('Arquivo PNG inválido.');
    const w=b.readUInt32BE(16),h=b.readUInt32BE(20);
    if(!w||!h||w>512||h>512)invalid('A logo deve ter até 512 × 512 pixels.');
    let offset=8,idat=false,ended=false;
    while(offset+12<=b.length){
      const size=b.readUInt32BE(offset),type=b.toString('ascii',offset+4,offset+8);
      if(size>b.length-offset-12||!/^[a-zA-Z]{4}$/.test(type)||type==='acTL')invalid('Arquivo PNG inválido.');
      if(type==='IDAT')idat=true;
      offset+=size+12;
      if(type==='IEND'){ended=size===0&&offset===b.length;break}
    }
    if(!idat||!ended)invalid('Arquivo PNG incompleto.');
  }
  return {brand:data.brand.trim(),primaryColor:data.primaryColor.toLowerCase(),logoDataUrl:data.logoDataUrl,version:data.version};
}
