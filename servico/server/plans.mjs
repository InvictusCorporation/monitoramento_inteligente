function fail(status,message){throw Object.assign(Error(message),{status})}
export function validatePlan(data){
  if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80||!Number.isInteger(data.cameraLimit)||data.cameraLimit<1||data.cameraLimit>256||typeof data.active!=='boolean'||data.module!=='patrimonial')fail(400,'Informe nome, módulo patrimonial, limite de 1 a 256 câmeras e situação do plano.');
  return {name:data.name.trim(),cameraLimit:data.cameraLimit,active:data.active,module:'patrimonial'};
}
export function listPlans(db,org){return db.prepare('SELECT id,name,camera_limit AS cameraLimit,active,version FROM commercial_plans WHERE org_id=? ORDER BY name,id').all(org).map(p=>({...p,active:!!p.active,module:'patrimonial'}))}
export function selectPlan(db,org,id,version){
  if(typeof id!=='string'||!Number.isInteger(version)||version<1)fail(400,'Seleção de plano inválida.');
  const plan=db.prepare('SELECT id,name,camera_limit AS cameraLimit,active,version FROM commercial_plans WHERE id=? AND org_id=?').get(id,org);
  if(!plan)fail(404,'Plano não encontrado.');
  if(!plan.active||plan.version!==version)fail(409,'Plano alterado ou inativo. Atualize a página antes de salvar.');
  return plan;
}
