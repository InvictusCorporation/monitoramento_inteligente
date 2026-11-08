(function(root){
  const masterNav=[['master','◇','Visão geral'],['master-clientes','◇','Clientes diretos'],['master-planos','◇','Planos'],['master-marcas','◇','Marcas das empresas'],['empresas','◇','Empresas e licenças']];
  function route(user,hash,nav){
    const requested=hash.replace(/^#/,'')||(user.platformAdmin?'master':'painel');
    const master=!!user.platformAdmin&&masterNav.some(n=>n[0]===requested);
    const allowed=master?masterNav:nav.filter(n=>n[0]!=='empresas'&&(user.role==='admin'||!['clientes','usuarios','auditoria'].includes(n[0])));
    return {master,allowed,page:allowed.some(n=>n[0]===requested)?requested:'painel'};
  }
  function summary(companies){
    const locals=companies.flatMap(c=>c.locations);
    return {partners:companies.filter(c=>c.parent).length,locations:locals.length,cameras:locals.reduce((n,l)=>n+l.cameras,0),active:locals.filter(l=>l.license.status==='active').length,attention:locals.filter(l=>l.license.status!=='active').length};
  }
  root.InvictusMaster={route,summary};
})(globalThis);
