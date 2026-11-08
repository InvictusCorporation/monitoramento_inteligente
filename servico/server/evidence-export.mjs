export function evidenceFilename(camera,date,id){
  const safe=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  const parsed=new Date(date);
  const stamp=Number.isNaN(parsed.getTime())?'sem-data':parsed.toISOString().replace(/[:.]/g,'-');
  return `invictus-${safe(camera)||'camera'}-${stamp}-${safe(id)||'ocorrencia'}.jpg`;
}
