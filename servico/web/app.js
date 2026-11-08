const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roles = {admin:'Administrador', operator:'Operador', client:'Cliente'};
let previewController=null;
function stopPreview(){previewController?.abort();previewController=null}
let state = null, csrf = '', page = 'painel', filter = '', eventStatus = 'Todos', revision = 0, authEpoch = 0;
let reportPage=1,reportSize=25;
let reportFilters={camera:'',priority:'',from:'',to:'',assignment:'',order:'newest'};
const filteredEvents=()=>window.InvictusReport.select(events(),{...reportFilters,search:filter,status:eventStatus,userId:state.user.id});
const nav = [['empresas','◇','Gestão comercial'],['saude','♡','Saúde do sistema'],['monitoramento','◎','Monitoramento'],['painel','▦','Painel'],['cameras','▣','Câmeras'],['ocorrencias','△','Ocorrências'],['clientes','♧','Clientes'],['usuarios','♙','Usuários'],['relatorios','▤','Relatórios'],['auditoria','☷','Histórico'],['configuracoes','⚙','Configurações']];

function brandColors(value){
  const color=/^#[0-9a-f]{6}$/i.test(value||'')?value:'#1973f9';
  const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const light=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  return {color,foreground:light>.179?'#000000':'#ffffff'};
}
function applyBranding(organization){
  const appearance=organization?.branding||{},colors=brandColors(appearance.primaryColor);
  $('#appView').style.setProperty('--blue',colors.color);$('#appView').style.setProperty('--brand-foreground',colors.foreground);
  const logo=$('#brandLogo');logo.hidden=!appearance.logoDataUrl;
  if(appearance.logoDataUrl){logo.src=appearance.logoDataUrl;logo.alt=organization.brand}else{logo.removeAttribute('src');logo.alt=''}
  $('aside .shield').hidden=!!appearance.logoDataUrl;
  document.title=(organization?.brand||'Invictus')+' — Monitoramento';
  $('footer').textContent=(organization?.brand||'INVICTUS')+' · Monitoramento Inteligente';
}
function showLogin() {
  applyBranding(null);
  if($('#requiredPassword'))$('#requiredPassword').remove();
  stopPreview();
  window.InvictusAlerts.stop();
  stopAnalysis();
  window.InvictusLive.stop();
  state = null; csrf = ''; reportPage=1;reportSize=25; reportFilters={camera:'',priority:'',from:'',to:'',assignment:'',order:'newest'}; eventStatus='Todos'; filter=''; revision++; authEpoch++;
  $('#content').replaceChildren(); $('#nav').replaceChildren(); $('#identity').replaceChildren();
  $('.demo').textContent='Central de câmeras';
  $('#brand').textContent = 'INVICTUS'; $('#fields').replaceChildren(); $('#dialog').close();
  $('#appView').hidden = true; $('#loginView').hidden = false;
  document.body.classList.remove('menuopen');
}
async function api(path, options = {}) {
  const response = await fetch('/api'+path, {
    signal:options.signal, method: options.method || 'GET', credentials:'same-origin', cache:'no-store',
    headers: {'Content-Type':'application/json', ...(csrf ? {'X-CSRF-Token':csrf} : {})},
    ...(options.body ? {body:JSON.stringify(options.body)} : {})
  });
  let data;
  try { data = await response.json(); } catch { throw Error('O servidor não respondeu corretamente. Tente novamente.'); }
  if (!response.ok) {
    if(data.passwordChangeRequired)showRequiredPassword();
    if (response.status===401 && path!=='/login') showLogin();
    throw Error(data.error || 'Não foi possível concluir.');
  }
  return data;
}
function toast(message) {
  $('#toast').textContent=message; $('#toast').classList.add('visible');
  clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4500);
}
function locations() {
  const selected=$('#location').value;
  $('#location').innerHTML='<option value="">Todos os locais autorizados</option>'+state.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  if(state.clients.some(c=>c.id===selected)) $('#location').value=selected;
}
async function refresh() {
  const epoch=authEpoch;
  const data=await api('/state');
  if(epoch!==authEpoch)return;
  state=data; locations();
  $('.demo').textContent='Versão '+(state.installation?.version||'não informada');
  $('#syncState').textContent='Atualizado às '+new Date().toLocaleTimeString('pt-BR');
  $('#identity').innerHTML=esc(state.user.name)+`<small>${roles[state.user.role]}</small>`;
  $('#brand').innerHTML=esc(state.organization.brand)+'<small>Monitoramento Inteligente</small>';
  applyBranding(state.organization);
  $('#loginView').hidden=true; $('#appView').hidden=false;
  await render();
}
function syncAreaAlerts(){
  if(!state||['master','empresas','master-clientes','master-planos','master-marcas'].includes(page)){window.InvictusAlerts.stop();return}
  window.InvictusAlerts.start({role:state.user.role,api,open:async id=>{
    try{const epoch=authEpoch;const latest=await api('/state');if(epoch!==authEpoch||!state)return;state=latest;locations();$('#location').value='';eventModal(id)}catch(error){toast(error.message)}
  }});
}
const cameras=()=>state.cameras.filter(c=>!$('#location').value||c.client===$('#location').value);
const events=()=>{const ids=new Set(cameras().map(c=>c.id));return state.events.filter(e=>ids.has(e.camera))};
const badge=p=>`<span class="badge ${p==='Alta'?'high':p==='Média'?'medium':'low'}">${esc(p)}</span>`;
const date=value=>new Date(value).toLocaleString('pt-BR');
const clientName=id=>state.clients.find(c=>c.id===id)?.name||'Local';
let mosaicSize=4,mosaicPage=1;
function mosaicCameras(){return cameras().filter(c=>c.name.toLowerCase().includes(filter.toLowerCase()))}
function gridControls(){
  const limit=Math.min(state.video?.maxLive||4,state.video?.maxPerOperator||state.video?.maxLive||4);const options=[1,4,8,9,16,25].filter(n=>n<=limit);if(!options.includes(mosaicSize))mosaicSize=options.at(-1);
  const count=mosaicCameras().length,pages=Math.max(1,Math.ceil(count/mosaicSize));mosaicPage=Math.min(mosaicPage,pages);
  return `<div class="reportpager"><label>Câmeras por página<select id="mosaicSize">${options.map(n=>`<option ${n===mosaicSize?'selected':''}>${n}</option>`).join('')}</select></label><span>Página ${mosaicPage} de ${pages} · ${count} câmera(s) · limite por conta: ${limit} vídeos; central: ${state.video?.maxLive||4}</span><button id="mosaicPrev" ${mosaicPage===1?'disabled':''}>Anterior</button><button id="mosaicNext" ${mosaicPage===pages?'disabled':''}>Próxima</button></div>`;
}
function cards() {
  let slots=0;
  return mosaicCameras().slice((mosaicPage-1)*mosaicSize,mosaicPage*mosaicSize).map(c=>{
    const licensed=state.clients?.find(l=>l.id===c.client)?.license?.allowed!==false;
    const live=licensed&&c.connectionStatus==='configured'&&state.video?.available&&slots++<Math.min(mosaicSize,state.video?.maxLive||4,state.video?.maxPerOperator||state.video?.maxLive||4);
    const label=!licensed?'Licença indisponível. Consulte a gestão comercial.':c.connectionStatus==='disabled'?'Conexão desabilitada':c.connectionStatus!=='configured'?'Configurar conexão':!state.video?.available?'Serviço de vídeo indisponível':'Capacidade do mosaico atingida. Use a busca ou outra página.';
    return `<article class="camera gridcamera" data-grid="${esc(c.id)}">${live?`<video muted autoplay playsinline controls aria-label="${esc(c.name)}"></video>`:`<div class="pendingicon"><small>${label}</small></div>`}<div class="camtop"><span class="tag" role="status">${live?'Conectando…':label}</span></div><div class="cambottom"><span>${esc(c.name)}<small>${esc(clientName(c.client))}</small></span><div class="gridactions">${live?'<button type="button" data-reconnect>Reconectar</button><button type="button" data-expand>Ampliar</button>':''}<button type="button" data-camera="${esc(c.id)}">Opções</button></div></div></article>`;
  }).join('')||'<div class="empty">Nenhuma câmera encontrada.</div>';
}
function startGrid() {
  document.querySelectorAll('.cameras').forEach(el=>el.dataset.columns=mosaicSize<=4?'2':mosaicSize<=9?'3':mosaicSize<=16?'4':'5');
  if(!state||$('#dialog').open)return;
  document.querySelectorAll('[data-grid]').forEach(card=>{
    const video=card.querySelector('video');if(!video)return;
    const key='grid:'+card.dataset.grid;
    const start=()=>window.InvictusLive.start({key,video,status:card.querySelector('[role="status"]'),url:'/api/cameras/'+card.dataset.grid+'/live',csrf,onUnauthorized:showLogin});
    card.querySelector('[data-reconnect]').onclick=start;
    card.querySelector('[data-expand]').onclick=async()=>{try{await video.requestFullscreen()}catch{toast('Use o botão de tela cheia nos controles do vídeo.')}};
    start();
  });
}
function dashboard() {
  const pending=events().filter(e=>e.status!=='Finalizada');
  return `<div class="stats">${[['▣','Câmeras cadastradas',cameras().length,'Mosaico por páginas'],['△','Ocorrências abertas',pending.length,'Eventos registrados'],['♙','Prioridade alta',pending.filter(e=>e.priority==='Alta').length,'Revisão pelo operador'],['▥','Locais autorizados',state.clients.filter(c=>!$('#location').value||c.id===$('#location').value).length,'Acesso da sua conta']].map(x=>`<div class="stat"><span class="symbol">${x[0]}</span><div><small>${x[1]}</small><strong>${x[2]}</strong><em>${x[3]}</em></div></div>`).join('')}</div>
    <div class="columns"><div class="panel"><div class="panelhead"><h3>Suas câmeras</h3><a class="textbtn" href="#cameras">Ver todas ↗</a></div>${gridControls()}<div class="cameras">${cards()}</div></div>
    <div><div class="panel"><div class="panelhead"><h3>Ocorrências recentes</h3></div>${events().slice(0,4).map(e=>`<button class="event eventbutton" data-event="${esc(e.id)}"><span class="eventicon">△</span><span><strong>${esc(e.title)}</strong><small>${esc(e.cameraName)}<br>${date(e.createdAt)}</small></span>${badge(e.priority)}</button>`).join('')||'<div class="empty">Nenhuma ocorrência registrada.</div>'}</div>
    <div class="panel"><div class="panelhead"><h3>Status do ambiente</h3></div><div class="status"><div>Acesso <span>${roles[state.user.role]}</span></div><div>Cadastros <span>Salvos no servidor</span></div><div>Serviço de vídeo <span>${state.video?.available?'Habilitado':'Não habilitado'}</span></div><div>Análise por IA <span>Manual e contínua</span></div><div>Alertas <span>Disponíveis para a central</span></div></div></div></div></div>`;
}
function eventTable() {
  const list=filteredEvents(),pagination=window.InvictusReport.paginate(list,reportPage,reportSize);reportPage=pagination.page;
  return `<div class="panel"><div class="panelhead"><h3>Gestão de ocorrências</h3><button id="openQueue">Somente abertas</button><button data-export>Exportar resultados CSV</button></div><div class="listfilters reportfilters"><label>Buscar<input id="search" aria-label="Buscar ocorrência" placeholder="Evento ou câmera" value="${esc(filter)}"></label><label>Situação<select id="eventStatus">${['Todos','Abertas','Pendente','Em análise','Finalizada'].map(s=>`<option ${s===eventStatus?'selected':''}>${s}</option>`).join('')}</select></label><label>Câmera<select data-report="camera"><option value="">Todas</option>${cameras().map(c=>`<option value="${esc(c.id)}" ${reportFilters.camera===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>Prioridade<select data-report="priority"><option value="">Todas</option>${['Alta','Média','Baixa'].map(p=>`<option ${reportFilters.priority===p?'selected':''}>${p}</option>`).join('')}</select></label>${state.user.role!=='client'?`<label>Atendimento<select data-report="assignment">${[['','Todos'],['unassigned','Sem responsável'],['mine','Assumidas por mim'],['others','Assumidas por outros']].map(([v,n])=>`<option value="${v}" ${reportFilters.assignment===v?'selected':''}>${n}</option>`).join('')}</select></label>`:''}<label>Ordenar<select data-report="order">${[['newest','Mais recentes'],['oldest','Mais antigas'],['priority','Prioridade e mais antigas']].map(([v,n])=>`<option value="${v}" ${reportFilters.order===v?'selected':''}>${n}</option>`).join('')}</select></label><label>De<input type="date" data-report="from" value="${esc(reportFilters.from)}"></label><label>Até<input type="date" data-report="to" value="${esc(reportFilters.to)}"></label><button id="clearReport">Limpar filtros</button></div><div class="notice" role="status">${reportFilters.from&&reportFilters.to&&reportFilters.from>reportFilters.to?'A data inicial deve ser anterior ou igual à final.':`${list.length} ocorrência(s) no filtro. Datas pelo fuso deste computador; dia final incluído. O CSV inclui todas as páginas deste filtro, com datas em UTC.`}</div><div class="tablewrap"><table><thead><tr><th>OCORRÊNCIA</th><th>CÂMERA</th><th>PRIORIDADE</th><th>STATUS</th><th>ATENDIMENTO</th><th>AÇÃO</th></tr></thead><tbody>${pagination.items.map(e=>`<tr><td>${esc(e.title)}<small>${date(e.createdAt)}</small></td><td>${esc(e.cameraName)}</td><td>${badge(e.priority)}</td><td>${esc(e.status)}</td><td>${e.claimedBy?esc(e.claimedName||'Usuário')+(e.claimedBy===state.user.id?' (você)':''):'Sem responsável'}${e.claimedAt?`<small>Assumida em ${date(e.claimedAt)}</small>`:''}</td><td><button data-event="${esc(e.id)}">Analisar</button></td></tr>`).join('')}</tbody></table>${list.length?'':'<div class="empty">Nenhuma ocorrência encontrada.</div>'}</div><nav class="reportpager" aria-label="Páginas de ocorrências"><label>Por página <select id="reportSize">${[25,50,100].map(n=>`<option ${n===reportSize?'selected':''}>${n}</option>`).join('')}</select></label><span role="status">${pagination.start}–${pagination.end} de ${pagination.total} · Página ${pagination.page} de ${pagination.pages}</span><button data-report-page="1" ${pagination.page===1?'disabled':''}>Primeira</button><button data-report-page="${pagination.page-1}" ${pagination.page===1?'disabled':''}>Anterior</button><button data-report-page="${pagination.page+1}" ${pagination.page===pagination.pages?'disabled':''}>Próxima</button><button data-report-page="${pagination.pages}" ${pagination.page===pagination.pages?'disabled':''}>Última</button></nav></div>`;
}
async function render() {
  stopPreview();
  stopAnalysis();
  if(!state)return;
  window.InvictusLive.stop();
  const current=++revision;
  const area=window.InvictusMaster.route(state.user,location.hash,nav);
  const allowed=area.allowed;page=area.page;
  document.body.classList.toggle('masterarea',area.master);
  $('#areaSwitch').hidden=!state.user.platformAdmin;
  $('#areaSwitch').innerHTML=state.user.platformAdmin?`<a href="#master" class="${area.master?'selected':''}">Gestão master</a><a href="#painel" class="${area.master?'':'selected'}">Central de monitoramento</a>`:'';
  $('.navlabel').textContent=area.master?'GESTÃO MASTER':'CENTRAL DE OPERAÇÕES';
  $('header small').textContent=state.organization.brand+(area.master?' / GESTÃO MASTER':' / OPERAÇÕES');
  $('.welcome').hidden=area.master;
  $('#location').closest('label').hidden=area.master;
  $('aside .brand').href=area.master?'#master':'#painel';
  syncAreaAlerts();
  $('#content').textContent='Carregando…';
  $('#title').textContent=allowed.find(n=>n[0]===page)[2];
  $('#nav').innerHTML=allowed.map(n=>`<a href="#${n[0]}" class="${page===n[0]?'active':''}"><span>${n[1]}</span>${n[2]}</a>`).join('');
  if(page==='saude'){try{await healthPage(current)}catch(error){if(current===revision&&state)$('#content').textContent=error.message}return;}
  if(area.master){try{if(page==='master')await masterOverview(current);else if(page==='master-clientes'){masterCustomers();bind()}else if(page==='master-planos')await planPage(current);else if(page==='master-marcas')await brandPage(current);else await commercialPage(current)}catch(error){if(current===revision&&state)$('#content').textContent=error.message}return;}
  if(page==='monitoramento'){try{await monitoringPage(current)}catch(e){if(current===revision&&state)$('#content').textContent=e.message}return;}
  let html='';
  if(page==='painel')html=dashboard();
  if(page==='cameras')html=`<div class="panel"><div class="panelhead"><h3>Câmeras cadastradas</h3></div><div class="listfilters"><input id="search" aria-label="Buscar câmera" placeholder="Buscar câmera" value="${esc(filter)}"></div>${gridControls()}<div class="cameras">${cards()}</div></div>`;
  if(page==='ocorrencias')html=eventTable();
  if(page==='clientes')html=`<div class="panel"><div class="panelhead"><h3>Clientes e locais</h3><button id="addCustomer">Novo cliente</button><button class="primary" id="addClient">Novo local</button></div><div class="tablewrap"><table><thead><tr><th>LOCAL / CLIENTE</th><th>CÂMERAS / LICENÇA</th><th>AÇÃO</th></tr></thead><tbody>${state.clients.map(c=>`<tr><td>${esc(c.name)}<small>${esc(c.customerName||'Cliente ainda não vinculado')}</small></td><td>${state.cameras.filter(x=>x.client===c.id).length}<small>${licenseLabel(c.license)}${c.license?.cameraLimit?' · limite '+c.license.cameraLimit:''}</small></td><td><button data-rename-client="${esc(c.id)}">Editar nome</button><button data-link-customer="${esc(c.id)}">Vincular cliente</button></td></tr>`).join('')}</tbody></table>${state.clients.length?'':'<div class="empty">Cadastre o primeiro cliente para começar.</div>'}</div></div>`;
  if(page==='relatorios'){const list=filteredEvents();html=`<div class="panel"><div class="panelhead"><h3>Resumo do período selecionado</h3></div><div class="status">${['Pendente','Em análise','Finalizada'].map(s=>`<div>${s}<span>${list.filter(e=>e.status===s).length}</span></div>`).join('')}</div><div class="notice">Dados autorizados conforme a última atualização do painel. Use Atualizar para buscar novos registros.</div></div>`+eventTable();}
  if(page==='configuracoes')html=`<div class="panel"><div class="panelhead"><h3>Minha conta</h3></div><div class="settings"><p>${esc(state.user.name)} · ${roles[state.user.role]}<br>${esc(state.user.email)}</p><button id="changePassword">Alterar senha</button><button id="manageSessions">Meus acessos</button>${state.user.role==='admin'?`<label>Nome exibido na marca<input id="brandName" maxlength="24" value="${esc(state.organization.brand)}"></label><button class="primary" id="saveBrand">Salvar identidade</button><button id="alertPolicy">Prazos de atendimento</button>`:''}<p>Empresa: ${esc(state.organization.name)}</p></div></div>`;
  if(page==='configuracoes')html+=installationPanel();
  if(['usuarios','auditoria'].includes(page)) {
    $('#content').innerHTML='<div class="empty">Carregando…</div>';
    try {
      if(page==='usuarios') {
        const data=await api('/users');
        if(current!==revision||!state)return;
        html=`<div class="panel"><div class="panelhead"><h3>Acessos da empresa</h3><button class="primary" id="addUser">＋ Novo usuário</button></div><div class="tablewrap"><table><thead><tr><th>USUÁRIO</th><th>PERFIL</th><th>LOCAL</th><th>ACESSO</th></tr></thead><tbody>${data.users.map(u=>`<tr><td>${esc(u.name)}<small>${esc(u.email)}</small></td><td>${roles[u.role]}</td><td>${u.clientId?esc(clientName(u.clientId)):'Todos os locais da empresa'}</td><td>${u.id===state.user.id?'Sua conta':`<button data-user="${esc(u.id)}" data-active="${u.active}">${u.active?'Desativar':'Reativar'}</button><button data-reset-password="${esc(u.id)}" data-reset-name="${esc(u.name)}">Redefinir senha</button>`}</td></tr>`).join('')}</tbody></table></div></div>`;
      } else {
        const data=await api('/audit');
        const labels={'event.image.deleted':'Foto excluída pela retenção','branding.updated':'Identidade visual alterada','plan.created':'Plano cadastrado','plan.updated':'Plano alterado','partner.created':'Empresa parceira cadastrada','license.updated':'Licença de local alterada','customer.created':'Cliente cadastrado','location.customer.updated':'Local vinculado a cliente','platform.granted':'Acesso master concedido','platform.revoked':'Acesso master revogado','login':'Entrada na conta','client.created':'Cliente cadastrado','client.renamed':'Local renomeado','camera.renamed':'Câmera renomeada','camera.created':'Câmera cadastrada','alerts.policy.updated':'Prazos de atendimento alterados','event.transferred':'Atendimento transferido','event.updated':'Ocorrência atualizada','event.image.downloaded':'Download de foto solicitado','event.image.viewed':'Foto consultada','brand.updated':'Identidade alterada','user.created':'Usuário cadastrado','user.password.reset':'Senha de usuário redefinida pelo administrador','user.activated':'Usuário reativado','user.disabled':'Usuário desativado','password.changed':'Senha alterada','sessions.others.revoked':'Outras sessões da própria conta encerradas'};
        html=`<div class="panel"><div class="panelhead"><h3>Últimas 100 ações da empresa</h3></div><div class="tablewrap"><table><thead><tr><th>DATA</th><th>RESPONSÁVEL</th><th>AÇÃO</th></tr></thead><tbody>${data.entries.map(e=>`<tr><td>${date(e.createdAt)}</td><td>${esc(e.actor)}</td><td>${esc(labels[e.action]||e.action)}</td></tr>`).join('')}</tbody></table></div></div>`;
      }
    } catch(error) { if(current===revision&&state)$('#content').innerHTML=`<div class="empty">${esc(error.message)}</div>`;return; }
  }
  if(current!==revision||!state)return;
  $('#content').innerHTML=html; bind(); startGrid();
}
let modalGeneration=0;
function modal(title,fields,save) {
  const generation=++modalGeneration,epoch=authEpoch;
  const same=()=>generation===modalGeneration&&epoch===authEpoch;
  const active=()=>same()&&$('#dialog').open;
  stopPreview();
  stopAnalysis();
  window.InvictusLive.stop();
  $('#dialogtitle').textContent=title;$('#fields').innerHTML=fields;$('#modalError').textContent='';
  $('.dialogactions').hidden=!save;$('#save').disabled=false;
  $('#form').onsubmit=async e=>{
    e.preventDefault();if(!save||$('#save').disabled)return;
    $('#save').disabled=true;$('#modalError').textContent='';
    try{await save(Object.fromEntries(new FormData($('#form'))));if(!active())return;$('#fields').replaceChildren();$('#dialog').close();if(state)await refresh();}
    catch(error){if(active())$('#modalError').textContent=error.message;else if(same())toast(error.message);}
    finally{if(same())$('#save').disabled=false}
  };
  $('#dialog').showModal();
}
function eventModal(id,draft=null) {
  const e=events().find(x=>x.id===id);if(!e)return;
  modal('Análise da ocorrência',`<p><strong>${esc(e.title)}</strong><br>${esc(e.cameraName)} · ${date(e.createdAt)}<br>${esc(e.rule)}</p><p>${e.claimedBy?`Atendimento assumido por ${esc(e.claimedName||'Usuário')} em ${date(e.claimedAt)}.`:'Atendimento ainda não assumido.'}</p>${!e.claimedBy&&e.status!=='Finalizada'&&state.user.role!=='client'?'<button type="button" id="claimEvent">Assumir atendimento</button>':''}${e.claimedBy&&e.status!=='Finalizada'&&(state.user.role==='admin'||(state.user.role==='operator'&&e.claimedBy===state.user.id))?'<button type="button" id="transferEvent">Transferir atendimento</button><section id="transferPanel" hidden><p>A transferência é imediata. A lista não indica quem está online.</p><label>Destinatário<select id="transferTo"></select></label><label>Motivo<textarea id="transferReason" maxlength="1000" rows="3"></textarea></label><button type="button" id="confirmTransfer">Confirmar transferência</button><p id="transferStatus" role="status"></p></section>':''}${e.hasEvidence?'<button type="button" id="viewEvidence">Ver imagem</button><button type="button" id="downloadEvidence">Baixar foto</button><p id="evidenceStatus" role="status"></p><img id="eventImage" hidden alt="Imagem recortada da câmera que gerou esta ocorrência">':(e.evidenceRemoved?'<p>A foto desta ocorrência foi excluída pela limpeza de retenção. O registro da ocorrência foi preservado.</p>':'<p>Esta ocorrência não possui imagem salva.</p>')}${state.user.role!=='client'?'<button type="button" id="eventHistory">Ver histórico do atendimento</button><section id="eventHistoryContent" aria-live="polite"></section>':''}<label>Status<select name="status">${['Pendente','Em análise','Finalizada'].map(s=>`<option ${s===e.status?'selected':''}>${s}</option>`).join('')}</select></label>${state.user.role!=='client'?`<section class="notice"><strong>Alertas pausados nesta câmera: ${esc((e.pausedTargets||[]).map(t=>({person:'Pessoas',vehicle:'Veículos',animal:'Animais'})[t]).join(', ')||'Nenhum')}</strong><label>Após este atendimento<select name="alertAction"><option value="">Manter configuração dos alertas</option>${[['person','pessoas'],['vehicle','veículos'],['animal','animais']].map(([t,label])=>`<option value="pause:${t}">Finalizar e pausar alertas de ${label} nesta câmera</option><option value="resume:${t}">Reativar alertas de ${label} nesta câmera</option>`).join('')}</select></label><p>A pausa bloqueia toda a categoria nesta câmera, inclusive novos alvos, até reativar. Não identifica o mesmo veículo. O vídeo continua funcionando. Ocorrências anteriores permanecem na fila.</p></section>`:''}<label>Registro da verificação<textarea name="note" maxlength="2000" rows="4">${esc(e.note)}</textarea></label>`,async data=>{
    if(data.alertAction?.startsWith('pause:'))data.status='Finalizada';
    await api('/events/'+encodeURIComponent(e.id),{method:'PATCH',body:{...data,version:e.version}});toast('Ocorrência atualizada.');
  });
  if(draft){$('#form').elements.note.value=draft.note;$('#form').elements.status.value=draft.status}
  if($('#form').elements.alertAction)$('#form').elements.alertAction.onchange=()=>{if($('#form').elements.alertAction.value.startsWith('pause:'))$('#form').elements.status.value='Finalizada'};
  if($('#transferEvent'))bindEventTransfer(e);
  if($('#eventHistory'))$('#eventHistory').onclick=async()=>{
    const button=$('#eventHistory'),container=$('#eventHistoryContent'),epoch=authEpoch;button.disabled=true;container.textContent='Consultando histórico.';
    try{
      const data=await api('/events/'+encodeURIComponent(e.id)+'/history');
      if(epoch!==authEpoch||!container.isConnected)return;
      const labels={'event.transferred':'Transferiu o atendimento','event.claimed':'Assumiu o atendimento','event.updated':'Atualizou situação ou observação','event.image.viewed':'Consultou a foto','event.image.downloaded':'Solicitou download da foto'};
      container.innerHTML=`<p>Ocorrência registrada em ${date(data.createdAt)}.</p><p>Ações mais recentes primeiro. Detalhes de antes e depois estão disponíveis para salvamentos feitos a partir da versão 0.19.0.</p>${data.entries.length?`<ol class="eventhistory">${data.entries.map(item=>`<li><strong>${esc(labels[item.action]||item.action)}</strong><br>${esc(item.actor)} · ${date(item.createdAt)}${item.transferVersion?`<p>De ${esc(item.transferredFrom)} para ${esc(item.transferredTo)} · versão ${item.transferVersion}</p><strong>Motivo</strong><pre class="revisionnote">${esc(item.transferReason)}</pre>`:''}${item.revision?`<details><summary>Ver alteração · versão ${item.revision}</summary><p>Situação: ${esc(item.oldStatus)} → ${esc(item.newStatus)}</p><strong>Observação anterior</strong><pre class="revisionnote">${esc(item.oldNote||'(vazia)')}</pre><strong>Observação salva</strong><pre class="revisionnote">${esc(item.newNote||'(vazia)')}</pre></details>`:item.action==='event.updated'?'<small>Conteúdo anterior não registrado nesta ação.</small>':''}</li>`).join('')}</ol>`:'<p>Nenhuma ação de atendimento registrada.</p>'}${data.hasMore?'<p>Exibindo somente as 100 ações mais recentes.</p>':''}`;
      button.textContent='Atualizar histórico';
    }catch(error){if(container.isConnected)container.textContent=error.message}
    finally{button.disabled=false}
  };
  if($('#claimEvent'))$('#claimEvent').onclick=async()=>{
    const button=$('#claimEvent'),noteField=$('#form').elements.note,statusField=$('#form').elements.status,epoch=authEpoch,sourceHash=location.hash;
    button.disabled=true;
    try{
      await api('/events/'+encodeURIComponent(e.id)+'/claim',{method:'POST',body:{version:e.version}});
      if(epoch!==authEpoch||!noteField.isConnected||!$('#dialog').open)return;
      const pending={note:noteField.value,status:statusField.value===e.status?'Em análise':statusField.value};
      $('#dialog').close();await refresh();
      if(epoch===authEpoch&&state&&location.hash===sourceHash){eventModal(e.id,pending);toast('Atendimento assumido. Sua observação foi mantida no formulário; clique em Salvar para registrá-la.')}
    }catch(error){if(noteField.isConnected){$('#modalError').textContent=error.message;button.disabled=false}}
  };
  if($('#downloadEvidence'))$('#downloadEvidence').onclick=async()=>{
    const button=$('#downloadEvidence'),status=$('#evidenceStatus'),epoch=authEpoch;
    button.disabled=true;status.textContent='Preparando download da foto salva.';
    try{
      const response=await fetch('/api/events/'+encodeURIComponent(e.id)+'/image?download=1',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok){if(response.status===401)showLogin();throw Error('Não foi possível baixar a foto. Atualize a página e confira seu acesso.')}
      const blob=await response.blob();if(epoch!==authEpoch||!state||!button.isConnected)return;
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;
      link.download=response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]||'ocorrencia.jpg';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent='Download solicitado ao navegador. Foto da área analisada; data do nome em UTC.';
    }catch(error){if(button.isConnected)status.textContent=error.message}
    finally{button.disabled=false}
  };
  if($('#viewEvidence'))$('#viewEvidence').onclick=()=>{
    const image=$('#eventImage'),status=$('#evidenceStatus');status.textContent='Carregando imagem…';
    image.onload=()=>{image.hidden=false;status.textContent='Imagem da área analisada no momento da detecção. Não é vídeo ao vivo.'};
    image.onerror=()=>{image.hidden=true;status.textContent='Não foi possível carregar a imagem. Confira sua sessão e tente novamente.'};
    image.src='/api/events/'+encodeURIComponent(e.id)+'/image';
  };
}
function bindEventTransfer(e) {
  const button=$('#transferEvent'),panel=$('#transferPanel'),select=$('#transferTo'),reason=$('#transferReason'),confirm=$('#confirmTransfer'),status=$('#transferStatus');
  const generation=modalGeneration,epoch=authEpoch;
  const active=()=>generation===modalGeneration&&epoch===authEpoch&&panel.isConnected&&$('#dialog').open;
  button.onclick=async()=>{
    if(!active())return;panel.hidden=false;button.disabled=true;confirm.disabled=true;status.textContent='Consultando operadores.';
    try{
      const data=await api('/operators');if(!active())return;
      const list=data.operators.filter(u=>u.id!==e.claimedBy);
      select.innerHTML='<option value="">Selecione</option>'+list.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} (${u.role==='admin'?'Administrador':'Operador'})</option>`).join('');
      confirm.disabled=!list.length;status.textContent=list.length?'Informe o motivo antes de confirmar.':'Nenhum outro operador elegível nesta empresa.';
    }catch(error){if(active()){status.textContent=error.message;button.disabled=false}}
  };
  confirm.onclick=async()=>{
    if(!active()||confirm.disabled||$('#save').disabled)return;
    if(!select.value||!reason.value.trim()||reason.value.length>1000){status.textContent='Selecione o destinatário e informe um motivo de até 1.000 caracteres.';return}
    const noteField=$('#form').elements.note,statusField=$('#form').elements.status,save=$('#save'),sourceHash=location.hash;
    confirm.disabled=true;save.disabled=true;let transferred=false;
    try{
      await api('/events/'+encodeURIComponent(e.id)+'/transfer',{method:'POST',body:{to:select.value,reason:reason.value.trim(),version:e.version}});transferred=true;
      if(!active())return;
      const latest=await api('/state');if(!active())return;state=latest;
      const pending={note:noteField.value,status:statusField.value};
      $('#dialog').close();await render();
      if(generation===modalGeneration&&epoch===authEpoch&&state&&location.hash===sourceHash&&!$('#dialog').open){eventModal(e.id,pending);toast('Atendimento transferido. O rascunho da verificação foi mantido; clique em Salvar para registrá-lo.')}
    }catch(error){if(active())status.textContent=transferred?'Transferência realizada. Atualize a página para consultar o novo responsável.':error.message;else if(generation===modalGeneration&&epoch===authEpoch)toast(transferred?'Transferência realizada. Atualize a página.':error.message)}
    finally{if(active()&&!transferred){confirm.disabled=false;save.disabled=false}}
  };
}
function exportCSV() {
  const csv=window.InvictusReport.csv(filteredEvents(),e=>clientName(state.cameras.find(c=>c.id===e.camera)?.client));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='invictus-ocorrencias.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function licenseLabel(license){return ({legacy:'Legado — licença não configurada',pending:'Licença pendente',active:'Licença ativa',suspended:'Licença suspensa',expired:'Licença vencida'})[license?.status]||'Não informada'}
function masterCustomers(){
  const customerRows=(state.customers||[]).map(customer=>{
    const locals=state.clients.filter(l=>l.customerId===customer.id);
    const ids=new Set(locals.map(l=>l.id));
    return `<tr><td>${esc(customer.name)}</td><td>${locals.length}</td><td>${state.cameras.filter(c=>ids.has(c.client)).length}</td><td>${locals.filter(l=>l.license?.status==='active').length}</td></tr>`;
  }).join('');
  $('#content').innerHTML=`<section class="panel masterhero"><h2>Clientes diretos de ${esc(state.organization.brand)}</h2><p>Cadastre o cliente, crie seus locais e vincule cada local ao cliente correspondente. Esta área contém somente os cadastros da sua empresa.</p><p>Depois do cadastro do local, configure sua licença em <a href="#empresas">Empresas e licenças</a>. Para câmeras e acessos do cliente, use a <a href="#painel">Central de monitoramento</a>.</p></section><section class="panel"><h3>Clientes cadastrados: ${(state.customers||[]).length}</h3><div class="tablewrap"><table><thead><tr><th>CLIENTE</th><th>LOCAIS</th><th>CÂMERAS</th><th>LICENÇAS ATIVAS</th></tr></thead><tbody>${customerRows}</tbody></table></div>${customerRows?'':'<p>Nenhum cliente cadastrado. Use Novo cliente abaixo.</p>'}<p>Locais sem cliente vinculado: ${state.clients.filter(l=>!l.customerId).length}. Use Vincular cliente na lista abaixo para organizar os locais existentes.</p></section>`+`<div class="panel"><div class="panelhead"><h3>Clientes e locais</h3><button id="addCustomer">Novo cliente</button><button class="primary" id="addClient">Novo local</button></div><div class="tablewrap"><table><thead><tr><th>LOCAL / CLIENTE</th><th>CÂMERAS / LICENÇA</th><th>AÇÃO</th></tr></thead><tbody>${state.clients.map(c=>`<tr><td>${esc(c.name)}<small>${esc(c.customerName||'Cliente ainda não vinculado')}</small></td><td>${state.cameras.filter(x=>x.client===c.id).length}<small>${licenseLabel(c.license)}${c.license?.cameraLimit?' · limite '+c.license.cameraLimit:''}</small></td><td><button data-rename-client="${esc(c.id)}">Editar nome</button><button data-link-customer="${esc(c.id)}">Vincular cliente</button></td></tr>`).join('')}</tbody></table>${state.clients.length?'':'<div class="empty">Cadastre o primeiro cliente para começar.</div>'}</div></div>`;
}
async function masterOverview(current){
  const data=await api('/platform/companies');if(current!==revision||!state)return;
  const counts=window.InvictusMaster.summary(data.companies);
  $('#content').innerHTML=`<section class="panel masterhero"><div class="eyebrow">GESTÃO MASTER</div><h2>Empresas e licenças em um só lugar</h2><p>Administre sua empresa e parceiras diretas. Os números abaixo representam os cadastros, não transmissões ao vivo.</p><a class="primary" href="#master-clientes">Gerenciar clientes diretos</a> <a class="primary" href="#empresas">Gerenciar empresas e licenças</a></section><div class="stats">${[['Empresas parceiras',counts.partners],['Locais cadastrados',counts.locations],['Câmeras cadastradas',counts.cameras],['Licenças ativas',counts.active]].map(([name,value])=>`<div class="stat"><div><small>${name}</small><strong>${value}</strong></div></div>`).join('')}</div><section class="panel"><h3>Licenças que precisam de atenção: ${counts.attention}</h3><p>Inclui locais pendentes, suspensos, vencidos ou legados sem licença configurada.</p><div class="tablewrap"><table><thead><tr><th>EMPRESA</th><th>LOCAL</th><th>SITUAÇÃO</th></tr></thead><tbody>${data.companies.flatMap(c=>c.locations.filter(l=>l.license.status!=='active').map(l=>`<tr><td>${esc(c.name)}</td><td>${esc(l.name)}</td><td>${licenseLabel(l.license)}</td></tr>`)).join('')}</tbody></table></div>${counts.attention?'':'<p>Nenhuma pendência de licença nos locais cadastrados.</p>'}</section><section class="panel"><h3>Escopo desta área</h3><p>Disponível: cadastro de parceiras e licenças patrimoniais por local, com limite de câmeras, vencimento e suspensão. Clientes diretos e seus locais podem ser cadastrados aqui em Clientes diretos. As parceiras administram seus próprios cadastros.</p><p>O catálogo de planos patrimoniais está disponível no menu Planos. Logo e cor principal estão disponíveis em Marcas das empresas. Cobrança automática e módulo de supermercado ainda não estão implementados.</p><a href="#painel">Abrir a operação da minha empresa</a><p>Imagens e ocorrências das parceiras permanecem restritas aos respectivos acessos.</p></section>`;
}
async function brandPage(current){
  const data=await api('/platform/companies');if(current!==revision||!state)return;
  $('#content').innerHTML=`<section class="panel"><div class="panelhead"><h3>Marcas das empresas</h3></div><div class="settings"><p>Logo, nome exibido e cor principal por empresa. A personalização aparece depois do login dos usuários dessa empresa; a entrada compartilhada permanece Invictus.</p><p>As cores de prioridade e alertas continuam padronizadas. Esta configuração não altera licenças nem concede acesso às imagens das parceiras.</p></div><div class="tablewrap"><table><thead><tr><th>EMPRESA</th><th>MARCA ATUAL</th><th>AÇÃO</th></tr></thead><tbody>${data.companies.map(c=>`<tr><td>${esc(c.name)}<small>${c.parent?'Parceira':'Sua empresa'}</small></td><td>${esc(c.brand)}</td><td><button data-brand-company="${esc(c.id)}">Personalizar</button></td></tr>`).join('')}</tbody></table></div></section>`;
  document.querySelectorAll('[data-brand-company]').forEach(button=>button.onclick=()=>brandEditor(button.dataset.brandCompany));
}
async function normalizeLogo(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2097152)throw Error('Escolha PNG, JPEG ou WebP de até 2 MB.');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width>4096||bitmap.height>4096)throw Error('Use uma imagem de até 4096 × 4096 pixels.');
    const scale=Math.min(1,256/bitmap.width,256/bitmap.height),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const result=canvas.toDataURL('image/png');if(result.length>131094)throw Error('A imagem ficou grande. Use uma logo mais simples.');return result;
  }finally{bitmap.close()}
}
async function brandEditor(org){
  modal('Personalizar marca','<p id="brandLoading">Carregando marca.</p>',null);
  const generation=modalGeneration,epoch=authEpoch;
  try{
    const data=await api('/platform/branding/'+encodeURIComponent(org));
    if(generation!==modalGeneration||epoch!==authEpoch||!state||!$('#dialog').open)return;
    let logo=data.logoDataUrl,processing=false,selection=0;
    modal('Personalizar marca',`<label>Nome exibido<input name="brand" required maxlength="24" value="${esc(data.brand)}"></label><label>Cor principal<input name="primaryColor" type="color" required value="${esc(data.primaryColor)}"></label><label>Logo (PNG, JPEG ou WebP, até 2 MB)<input id="brandFile" type="file" accept="image/png,image/jpeg,image/webp"></label><img id="brandPreview" class="brandpreview" alt="Prévia da logo" ${logo?'src="'+esc(logo)+'"':'hidden'}><p id="brandFileStatus" role="status">A imagem será reduzida para até 256 pixels e convertida para PNG.</p><button type="button" id="removeLogo">Remover logo</button><p>Salvar aplica a marca no próximo carregamento dos usuários desta empresa. A alteração não modifica o nome jurídico nem o código usado no login.</p>`,async value=>{
      if(processing)throw Error('Aguarde o processamento da logo.');
      await api('/platform/branding/'+encodeURIComponent(org),{method:'PATCH',body:{brand:value.brand,primaryColor:value.primaryColor,logoDataUrl:logo,version:data.version}});toast('Marca salva. Atualize as outras sessões para visualizar.');
    });
    const editor=modalGeneration,preview=$('#brandPreview'),status=$('#brandFileStatus');
    $('#brandFile').onchange=async e=>{
      const file=e.target.files[0];if(!file)return;const request=++selection;processing=true;status.textContent='Preparando logo…';
      try{const value=await normalizeLogo(file);if(editor!==modalGeneration||request!==selection)return;logo=value;preview.src=value;preview.hidden=false;status.textContent='Logo pronta para salvar.'}
      catch(error){if(editor===modalGeneration&&request===selection)status.textContent=error.message}
      finally{if(request===selection)processing=false}
    };
    $('#removeLogo').onclick=()=>{selection++;processing=false;logo=null;preview.hidden=true;preview.removeAttribute('src');$('#brandFile').value='';status.textContent='Logo removida da prévia. Clique em Salvar para confirmar.'};
  }catch(error){if(generation===modalGeneration&&epoch===authEpoch&&$('#brandLoading'))$('#brandLoading').textContent=error.message}
}
async function planPage(current){
  const data=await api('/platform/plans');if(current!==revision||!state)return;
  $('#content').innerHTML=`<section class="panel"><div class="panelhead"><h3>Catálogo de planos patrimoniais</h3><button id="addPlan" class="primary">Novo plano</button></div><p>Cadastre as opções oferecidas aos clientes diretos e às empresas parceiras. Selecione o plano ao configurar a licença de cada local.</p><p>Alterar ou desativar um plano não modifica licenças existentes. Cada licença guarda as condições aplicadas ao salvar. Não há cobrança automática ou preços neste catálogo.</p><div class="tablewrap"><table><thead><tr><th>PLANO</th><th>LIMITE DE CÂMERAS</th><th>SITUAÇÃO</th><th>AÇÃO</th></tr></thead><tbody>${data.plans.map(p=>`<tr><td>${esc(p.name)}</td><td>${p.cameraLimit}</td><td>${p.active?'Ativo':'Inativo'}</td><td><button data-plan="${esc(p.id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>${data.plans.length?'':'<p>Nenhum plano cadastrado. Crie seus planos antes de selecioná-los nas licenças.</p>'}<a href="#empresas">Configurar licenças dos locais</a></section>`;
  $('#addPlan').onclick=()=>planEditor();
  document.querySelectorAll('[data-plan]').forEach(button=>button.onclick=()=>planEditor(data.plans.find(p=>p.id===button.dataset.plan)));
}
function planEditor(plan){
  modal(plan?'Editar plano':'Novo plano',`<label>Nome do plano<input name="name" required maxlength="80" value="${esc(plan?.name||'')}"></label><label>Limite de câmeras por local<input name="cameraLimit" type="number" min="1" max="256" required value="${plan?.cameraLimit||16}"></label><label>Situação<select name="active"><option value="true" ${plan?.active===false?'':'selected'}>Ativo</option><option value="false" ${plan?.active===false?'selected':''}>Inativo</option></select></label><p>Módulo patrimonial. Desativar impede novas seleções; as licenças já configuradas permanecem com suas condições atuais.</p>`,async value=>{
    await api('/platform/plans'+(plan?'/'+encodeURIComponent(plan.id):''),{method:plan?'PATCH':'POST',body:{name:value.name,cameraLimit:Number(value.cameraLimit),active:value.active==='true',module:'patrimonial',...(plan?{version:plan.version}:{})}});toast('Plano salvo. Licenças existentes preservadas.');
  });
}
async function commercialPage(current){
  const [data,catalog]=await Promise.all([api('/platform/companies'),api('/platform/plans')]);if(current!==revision||!state)return;
  $('#content').innerHTML=`<div class="panel"><div class="panelhead"><h3>Empresas e licenças</h3><button id="addPartner">+ Empresa parceira</button></div><p>Gestão comercial da sua empresa e parceiras diretas. Imagens e ocorrências permanecem separadas por empresa. Módulo de supermercado ainda indisponível.</p>${data.companies.map(c=>`<section class="panel"><h3>${esc(c.name)}</h3><p>Código de acesso: <strong>${esc(c.slug)}</strong> · Marca: ${esc(c.brand)} · ${c.parent?'Parceira':'Sua empresa'}</p><div class="tablewrap"><table><thead><tr><th>LOCAL</th><th>CÂMERAS</th><th>LICENÇA PATRIMONIAL</th><th>AÇÃO</th></tr></thead><tbody>${c.locations.map(l=>`<tr><td>${esc(l.name)}</td><td>${l.cameras}${l.license.cameraLimit?' / '+l.license.cameraLimit:''}</td><td>${licenseLabel(l.license)}<small>${esc(l.license.plan||'Sem plano')}${l.license.expiresAt?' · vence '+date(l.license.expiresAt):''}</small></td><td><button data-license="${esc(l.id)}">Configurar licença</button></td></tr>`).join('')}</tbody></table></div>${c.locations.length?'':'<p>O administrador desta empresa deve cadastrar seus clientes e locais pelo acesso próprio.</p>'}</section>`).join('')}</div>`;
  $('#addPartner').onclick=()=>modal('Nova empresa parceira',`<label>Nome da empresa<input name="name" required maxlength="100"></label><label>Código de acesso<input name="slug" required maxlength="60" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="empresa-exemplo"></label><label>Nome do administrador<input name="adminName" required maxlength="100"></label><label>E-mail do administrador<input name="email" type="email" required maxlength="254"></label><label>Senha inicial<input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128"></label><p>O administrador definirá uma nova senha no primeiro acesso. Entregue as credenciais por seu canal habitual. Não há envio automático.</p>`,async value=>{await api('/platform/companies',{method:'POST',body:value});toast('Parceira criada. O administrador deve entrar com o código e definir sua senha.')});
  document.querySelectorAll('[data-license]').forEach(button=>button.onclick=()=>{
    const plans=(catalog.plans||[]).filter(p=>p.active);
    const local=data.companies.flatMap(c=>c.locations).find(l=>l.id===button.dataset.license),l=local.license;
    let expiration='';if(l.expiresAt){const d=new Date(l.expiresAt);expiration=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)}
    modal('Licença — '+local.name,`<p>Módulo: segurança patrimonial. O vencimento usa o horário deste computador.</p><label>Selecionar do catálogo<select name="planId" id="licensePlan"><option value="">Manter condições atuais / personalizadas</option>${plans.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} — ${p.cameraLimit} câmeras</option>`).join('')}</select></label><p>Ao selecionar um plano, nome e limite serão aplicados. Vencimento e situação continuam definidos por local. Para cadastrar opções, use Planos no menu.</p><label>Plano / referência comercial<input name="plan" required maxlength="80" value="${esc(l.plan)}"></label><label>Situação<select name="enabled"><option value="true" ${l.enabled?'selected':''}>Ativa</option><option value="false" ${l.enabled?'':'selected'}>Suspensa</option></select></label><label>Limite de câmeras<input name="cameraLimit" type="number" min="${Math.max(1,local.cameras)}" max="256" required value="${l.cameraLimit||Math.max(16,local.cameras)}"></label><label>Vencimento (vazio = sem prazo)<input name="expiration" type="datetime-local" value="${expiration}"></label><p>Suspender ou vencer bloqueia vídeo, novas câmeras e análise de IA. Histórico e imagens salvas continuam disponíveis. Alterações encerram as transmissões atuais deste local.</p>`,async value=>{
      const selected=plans.find(p=>p.id===value.planId);
      await api('/platform/licenses/'+encodeURIComponent(local.id),{method:'POST',body:{module:'patrimonial',plan:value.plan,enabled:value.enabled==='true',cameraLimit:Number(value.cameraLimit),expiresAt:value.expiration?new Date(value.expiration).toISOString():null,version:l.version,...(selected?{planId:selected.id,planVersion:selected.version}:{})}});toast('Licença atualizada.');
    });
    $('#licensePlan').onchange=e=>{
      const selected=plans.find(p=>p.id===e.target.value);
      const name=$('#fields input[name="plan"]'),limit=$('#fields input[name="cameraLimit"]');
      name.value=selected?selected.name:l.plan;limit.value=selected?selected.cameraLimit:(l.cameraLimit||Math.max(16,local.cameras));
      name.readOnly=limit.readOnly=!!selected;
    };
  });
}
async function openAlertPolicy() {
  modal('Prazos de atendimento','<p id="policyLoading">Consultando configuração.</p>',null);
  const generation=modalGeneration,epoch=authEpoch,loading=$('#policyLoading');
  try{
    const config=await api('/alert-policy');
    if(generation!==modalGeneration||epoch!==authEpoch||!loading.isConnected||!$('#dialog').open)return;
    modal('Prazos de atendimento',`<label>Alertas por prazo<select name="enabled"><option value="false" ${config.enabled?'':'selected'}>Desativados</option><option value="true" ${config.enabled?'selected':''}>Ativados</option></select></label><label>Prazo para assumir (minutos)<input name="waitingMinutes" type="number" min="1" max="1440" step="1" required value="${config.waitingMinutes}"></label><label>Prazo após assumir ou transferir (minutos)<input name="handlingMinutes" type="number" min="1" max="1440" step="1" required value="${config.handlingMinutes}"></label><p>Ocorrências sem responsável são contadas desde o registro. Depois de assumir ou transferir, o prazo conta desde essa atribuição. Salvar uma observação não reinicia a contagem.</p><p>Ao exceder o prazo, a faixa de alertas avisa o responsável e os administradores. O aviso exige a página aberta; não transfere nem finaliza automaticamente. Ao ativar, ocorrências antigas também serão avaliadas.</p>`,async data=>{
      await api('/alert-policy',{method:'POST',body:{enabled:data.enabled==='true',waitingMinutes:Number(data.waitingMinutes),handlingMinutes:Number(data.handlingMinutes),version:config.version}});
      toast('Prazos salvos. Os alertas serão atualizados na próxima consulta.');
    });
  }catch(error){if(generation===modalGeneration&&epoch===authEpoch&&loading.isConnected)loading.textContent=error.message}
}
function bind() {
  if($('#mosaicSize'))$('#mosaicSize').onchange=e=>{mosaicSize=Number(e.target.value);mosaicPage=1;render()};
  if($('#mosaicPrev'))$('#mosaicPrev').onclick=()=>{mosaicPage--;render()};
  if($('#mosaicNext'))$('#mosaicNext').onclick=()=>{mosaicPage++;render()};
  document.querySelectorAll('[data-rename-client]').forEach(button=>button.onclick=()=>{const item=state.clients.find(c=>c.id===button.dataset.renameClient);if(item)renameItem('clients',item)});

  if($('#alertPolicy'))$('#alertPolicy').onclick=openAlertPolicy;
  if($('#manageSessions'))$('#manageSessions').onclick=async()=>{
    modal('Meus acessos','<section id="sessionDetails" aria-live="polite">Consultando sessões.</section>',null);
    const container=$('#sessionDetails'),epoch=authEpoch;
    try{
      const data=await api('/sessions');if(epoch!==authEpoch||!container.isConnected)return;
      container.innerHTML=`<p>Sessões ativas: <strong>${data.active}</strong><br>Outras sessões: <strong>${data.other}</strong><br>Este acesso expira em ${date(data.currentExpiresAt)}.</p><p>A contagem representa logins ainda válidos; não identifica computadores nem confirma que estão em uso agora.</p><button type="button" id="revokeOthers" ${data.other?'':'disabled'}>Encerrar outros acessos</button><p id="sessionResult" role="status"></p><p>Este acesso permanece aberto. O monitoramento contínuo da empresa não será interrompido.</p>`;
      $('#revokeOthers').onclick=async()=>{
        const button=$('#revokeOthers'),status=$('#sessionResult');button.disabled=true;
        try{const result=await api('/sessions/revoke-others',{method:'POST'});if(container.isConnected)status.textContent=result.revoked+' sessão(ões) encerrada(s). Os outros acessos precisarão entrar novamente.'}
        catch(error){if(container.isConnected){status.textContent=error.message;button.disabled=false}}
      };
    }catch(error){if(container.isConnected)container.textContent=error.message}
  };

  document.querySelectorAll('[data-reset-password]').forEach(button=>button.onclick=()=>modal('Redefinir senha de '+button.dataset.resetName,'<p>As sessões deste usuário serão encerradas. No próximo acesso, ele deverá definir outra senha. Uma conta desativada continuará desativada.</p><label>Sua senha de administrador<input type="password" name="current" required maxlength="128" autocomplete="current-password"></label><label>Nova senha do usuário<input type="password" name="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Repita a nova senha<input type="password" name="confirmation" required minlength="12" maxlength="128" autocomplete="new-password"></label><p>Combine a entrega da nova senha com o usuário por um canal seguro. O sistema não envia mensagens automaticamente.</p>',async data=>{
    if(data.password!==data.confirmation)throw Error('As novas senhas não coincidem.');
    await api('/users/'+encodeURIComponent(button.dataset.resetPassword)+'/password',{method:'POST',body:{current:data.current,password:data.password}});
    toast('Senha redefinida. As sessões do usuário foram encerradas.');
  }));

  document.querySelectorAll('[data-report-page]').forEach(el=>el.onclick=()=>{reportPage=Number(el.dataset.reportPage);render();$('#content').scrollIntoView({block:'start'});$('#reportSize')?.focus()});
  if($('#reportSize'))$('#reportSize').onchange=e=>{reportSize=Number(e.target.value);reportPage=1;render()};
  if($('#openQueue'))$('#openQueue').onclick=()=>{eventStatus='Abertas';reportPage=1;render()};
  document.querySelectorAll('[data-report]').forEach(el=>el.onchange=()=>{reportFilters[el.dataset.report]=el.value;reportPage=1;render()});
  if($('#clearReport'))$('#clearReport').onclick=()=>{reportFilters={camera:'',priority:'',from:'',to:'',assignment:'',order:'newest'};eventStatus='Todos';filter='';reportPage=1;render()};
  document.querySelectorAll('[data-camera]').forEach(el=>el.onclick=()=>cameraModal(el.dataset.camera));
  document.querySelectorAll('[data-event]').forEach(el=>el.onclick=()=>eventModal(el.dataset.event));
  document.querySelectorAll('[data-export]').forEach(el=>el.onclick=exportCSV);
  if($('#search'))$('#search').oninput=e=>{const position=e.target.selectionStart;filter=e.target.value;mosaicPage=1;reportPage=1;render();$('#search').focus();$('#search').setSelectionRange(position,position)};
  if($('#eventStatus'))$('#eventStatus').onchange=e=>{eventStatus=e.target.value;reportPage=1;render()};
  if($('#addCustomer'))$('#addCustomer').onclick=()=>modal('Novo cliente','<label>Nome do cliente<input name="name" required maxlength="100"></label>',async data=>{await api('/customers',{method:'POST',body:data});toast('Cliente cadastrado.')});
  if($('#addClient'))$('#addClient').onclick=()=>modal('Novo local',`<label>Nome do local<input name="name" required maxlength="80"></label><label>Cliente<select name="customerId"><option value="">Vincular depois</option>${(state.customers||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>`,async data=>{await api('/clients',{method:'POST',body:data});toast('Local cadastrado.')});
  document.querySelectorAll('[data-link-customer]').forEach(button=>button.onclick=()=>{
    const local=state.clients.find(c=>c.id===button.dataset.linkCustomer);if(!local)return;
    modal('Vincular local ao cliente',`<label>Cliente<select name="customerId" required><option value="">Selecione</option>${(state.customers||[]).map(c=>`<option value="${esc(c.id)}" ${c.id===local.customerId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><p>Cadastre o cliente em Clientes e locais caso ele ainda não apareça.</p>`,async data=>{await api('/clients/'+encodeURIComponent(local.id)+'/customer',{method:'POST',body:{...data,previousCustomerId:local.customerId||null}});toast('Vínculo atualizado.')});
  });
  if($('#saveBrand'))$('#saveBrand').onclick=async()=>{const button=$('#saveBrand');button.disabled=true;try{await api('/brand',{method:'PATCH',body:{brand:$('#brandName').value}});await refresh();toast('Identidade atualizada.')}catch(error){toast(error.message)}finally{button.disabled=false}};
  if($('#changePassword'))$('#changePassword').onclick=()=>modal('Alterar senha','<label>Senha atual<input name="current" type="password" required autocomplete="current-password" maxlength="128"></label><label>Nova senha<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><p>Todas as sessões serão encerradas após a alteração.</p>',async data=>{await api('/password',{method:'POST',body:data});showLogin();toast('Senha alterada. Entre novamente.')});
  if($('#addUser'))$('#addUser').onclick=()=>{
    modal('Novo usuário',`<label>Nome<input name="name" required maxlength="100"></label><label>E-mail<input name="email" type="email" required maxlength="254" autocomplete="off"></label><label>Senha inicial<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Perfil<select name="role" id="newRole"><option value="client">Cliente</option><option value="operator">Operador</option><option value="admin">Administrador</option></select></label><label id="clientField">Local do cliente<select name="clientId" id="newClient" required><option value="">Selecione um local</option>${state.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><p>O cliente acessa somente seu local. Administradores e operadores acessam os locais da empresa. O envio das credenciais fica a cargo do administrador.</p>`,async data=>{await api('/users',{method:'POST',body:data});toast('Usuário cadastrado.')});
    $('#newRole').onchange=()=>{const isClient=$('#newRole').value==='client';$('#clientField').hidden=!isClient;$('#newClient').required=isClient};
  };
  document.querySelectorAll('[data-user]').forEach(el=>el.onclick=()=>modal(el.dataset.active==='1'?'Desativar acesso':'Reativar acesso','<p>A alteração será aplicada imediatamente. Ao desativar, todas as sessões desse usuário serão encerradas.</p>',async()=>{await api('/users/'+encodeURIComponent(el.dataset.user),{method:'PATCH',body:{active:el.dataset.active!=='1'}});toast('Acesso atualizado.')}));
}
$('#addCamera').onclick=()=>{
  if(!state.clients.length){toast('Cadastre um cliente ou solicite a vinculação de um local.');return}
  modal('Adicionar câmera',`<p>Após cadastrar, selecione a câmera para configurar a conexão.</p><label>Nome<input name="name" required maxlength="60"></label><label>Cliente / local<select name="client">${state.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label>`,async data=>{await api('/cameras',{method:'POST',body:data});toast('Câmera cadastrada. Selecione-a para configurar.')});
};
async function cameraModal(id) {
  const camera=state?.cameras.find(c=>c.id===id);if(!camera)return;
  const epoch=authEpoch;
  try {
    const config=await api('/cameras/'+encodeURIComponent(id)+'/connection');
    if(!state||epoch!==authEpoch)return;
    modal(camera.name,`<p>${esc(clientName(camera.client))}</p><div class="notice">${!config.available?'O serviço de vídeo precisa ser habilitado nesta instalação.':!config.configured?'Configure o endereço e as credenciais do equipamento.':!config.enabled?'A conexão desta câmera está desabilitada.':'Conexão cadastrada. Abra o vídeo para conferir a imagem.'}</div><div class="cameraactions"><button type="button" id="renameCamera">Editar nome</button>${config.configured&&config.enabled&&config.available?'<button type="button" id="testCamera">Testar conexão</button><button type="button" class="primary" id="watchCamera">Ver ao vivo</button>':''}${config.canConfigure?'<button type="button" id="configureCamera">Configurar conexão</button>':''}${config.configured&&config.canConfigure?`<button type="button" id="toggleCamera">${config.enabled?'Desabilitar':'Habilitar'}</button>`:''}</div><p id="cameraResult" role="status"></p><p>Vídeo sob demanda, sem gravação ou áudio nesta etapa.</p>`,null);
    if($('#configureCamera'))$('#configureCamera').onclick=()=>configureCamera(camera,config);
    if($('#toggleCamera'))$('#toggleCamera').onclick=async()=>{
      const button=$('#toggleCamera');button.disabled=true;
      try{await api('/cameras/'+id+'/connection',{method:'PATCH',body:{enabled:!config.enabled,version:config.version}});$('#dialog').close();await refresh();toast('Conexão atualizada.')}
      catch(error){if($('#cameraResult'))$('#cameraResult').textContent=error.message}finally{button.disabled=false}
    };
    if($('#testCamera'))$('#testCamera').onclick=async()=>{
      const button=$('#testCamera');button.disabled=true;$('#cameraResult').textContent='Verificando resposta do equipamento…';
      try{const result=await api('/cameras/'+id+'/test',{method:'POST'});if($('#cameraResult'))$('#cameraResult').textContent=result.message}
      catch(error){if($('#cameraResult'))$('#cameraResult').textContent=error.message}finally{button.disabled=false}
    };
    if($('#watchCamera'))$('#watchCamera').onclick=()=>{
      modal(camera.name,`<video id="liveVideo" controls autoplay muted playsinline aria-label="Vídeo da câmera ${esc(camera.name)}"></video><p id="liveStatus" role="status">Conectando…</p><button type="button" id="stopLive">Encerrar vídeo</button>`,null);
      $('#stopLive').onclick=()=>{window.InvictusLive.stop();$('#liveStatus').textContent='Transmissão encerrada.'};
      window.InvictusLive.start({video:$('#liveVideo'),status:$('#liveStatus'),url:'/api/cameras/'+id+'/live',csrf,onUnauthorized:showLogin});
    };
  }catch(error){toast(error.message)}
}
function configureCamera(camera,current) {
  modal('Configurar câmera ou canal do DVR',`<p>Informe os dados do equipamento acessível pela instalação. Ao salvar, todos os campos substituem a conexão anterior.</p><label>Equipamento<select name="profile" id="cameraProfile"><option value="intelbras-mhdx-1208">Intelbras MHDX 1208 · 8 canais</option><option value="manual">Outro equipamento · RTSP manual</option></select></label><div id="dvrFields"><label>Canal<select name="channel" id="dvrChannel">${Array.from({length:8},(_,i)=>`<option value="${i+1}">Canal ${i+1}</option>`).join('')}</select></label><label>Fluxo de vídeo<select name="stream" id="dvrStream"><option value="1">Extra · fluxo secundário</option><option value="0">Principal</option></select></label></div><label>Endereço IPv4 do DVR ou câmera<input name="host" required maxlength="15" placeholder="192.168.1.100" value="${esc(current.host)}"></label><label>Porta RTSP<input name="port" type="number" min="1" max="65535" required value="${current.port}"></label><label>Caminho do canal<input id="rtspPath" name="path" required maxlength="1000" placeholder="/caminho-do-canal" autocomplete="off"></label><label>Usuário do equipamento<input name="username" maxlength="256" autocomplete="off"></label><label>Senha do equipamento<input name="password" type="password" maxlength="256" autocomplete="new-password"></label><p>Use o acesso do DVR, não o login do aplicativo Cloud. As credenciais salvas não são exibidas novamente. Preencha os dados completos em cada alteração.</p>`,async data=>{
    await api('/cameras/'+camera.id+'/connection',{method:'POST',body:{...data,version:current.version}});toast('Conexão salva. Teste o equipamento antes de usar.')
  });
  $('#cameraProfile').value=current.configured?current.profile:'intelbras-mhdx-1208';
  $('#dvrChannel').value=String(current.channel||1);$('#dvrStream').value=String(current.stream??1);
  let manualPath='';
  function updatePath(){
    const isDvr=$('#cameraProfile').value==='intelbras-mhdx-1208';
    $('#dvrFields').hidden=!isDvr;$('#rtspPath').readOnly=isDvr;
    $('#rtspPath').value=isDvr?`/cam/realmonitor?channel=${$('#dvrChannel').value}&subtype=${$('#dvrStream').value}`:manualPath;
  }
  $('#rtspPath').oninput=e=>{if(!e.target.readOnly)manualPath=e.target.value};
  $('#cameraProfile').onchange=$('#dvrChannel').onchange=$('#dvrStream').onchange=updatePath;updatePath();
}
$('#dialog').addEventListener('close',()=>{stopPreview();window.InvictusLive.stop('modal');startGrid()});
$('#dialog').addEventListener('cancel',()=>window.InvictusLive.stop());
$('#close').onclick=$('#cancel').onclick=()=>$('#dialog').close();
$('#menu').onclick=()=>document.body.classList.toggle('menuopen');
$('#location').onchange=()=>{filter='';mosaicPage=1;reportFilters.camera='';reportPage=1;render()};
$('#refresh').onclick=async()=>{try{await refresh()}catch(error){toast(error.message)}};
$('#logout').onclick=async()=>{try{await api('/logout',{method:'POST'});showLogin()}catch(error){toast(error.message)}};
$('#loginForm').onsubmit=async event=>{
  event.preventDefault();const button=$('#loginSubmit');button.disabled=true;$('#loginError').textContent='';
  try{const data=await api('/login',{method:'POST',body:Object.fromEntries(new FormData(event.target))});csrf=data.csrf;event.target.elements.password.value='';filter='';if(data.user.passwordChangeRequired)showRequiredPassword();else await refresh();}
  catch(error){$('#loginError').textContent=error.message}finally{button.disabled=false}
};
window.addEventListener('hashchange',()=>{window.InvictusLive.stop();$('#dialog').close();filter='';reportPage=1;document.body.classList.remove('menuopen');refresh().catch(error=>toast(error.message))});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
(async()=>{try{const data=await api('/session');csrf=data.csrf;if(data.user.passwordChangeRequired)showRequiredPassword();else await refresh()}catch{showLogin()}})();

async function monitoringPage(current) {
  const data=await api('/monitoring');
  if(current!==revision||!state)return;
  const writable=state.user.role!=='operator';
  $('#content').innerHTML=`<div class="panel"><div class="panelhead"><h3>Monitoramento por IA</h3>${state.user.role==='admin'?'<div class="cameraactions"><button id="aiSettings">Configurar OpenAI</button><button id="serviceSettings">Configurar operação contínua</button></div>':''}</div><div class="notice">${data.ai?.enabled?'Análise habilitada':'Análise desabilitada'}. Cada análise envia à OpenAI uma imagem da área selecionada e consome a API. O serviço contínuo funciona no servidor, mesmo com o navegador fechado, enquanto o programa e o computador estiverem ligados. As análises são por amostragem: movimentos entre capturas podem passar despercebidos. Resultados exigem revisão humana. O serviço contínuo não termina após cinco minutos. O teste temporário fica separado abaixo. O intervalo de captura não é um prazo garantido de reconhecimento: fila, captura, IA e rede podem acrescentar espera.</div><div class="settings"><p><strong>Serviço contínuo: ${esc(({disabled:"Desativado",scheduled:"Agendado — respeita horários e regras",owner_unavailable:"Pausado — administrador responsável indisponível",ai_unavailable:"Pausado — IA ou câmera indisponível",daily_limit:"Pausado — limite diário atingido"})[data.service?.state]||"Indisponível")}</strong><br>Análises em andamento: ${data.service?.active||0}. Intervalo mínimo entre inícios de análise: ${data.service?.interval||60}s.<br>Bloqueio de repetição de alertas da mesma câmera: ${data.service?.cooldown||300}s (não interrompe as análises).<br>Uso: ${data.ai?.used||0} de ${data.ai?.dailyLimit||100} tentativas por dia (UTC). Use Atualizar para consultar o status recente.</p>${data.locations.filter(l=>!$('#location').value||l.id===$('#location').value).map(l=>`<div class="monitorlocation"><h3>${esc(l.name)}</h3><p>${l.enabled?'Local habilitado':'Local desabilitado'}</p>${writable?`<button data-monitor-location="${esc(l.id)}">${l.enabled?'Desabilitar':'Habilitar local'}</button>`:''}${state.cameras.filter(c=>c.client===l.id).map(c=>{const r=data.rules.find(r=>r.camera===c.id);const ready=data.detectorAvailable&&l.enabled&&r?.enabled&&(r.targets||[r.target||'person']).some(t=>!(r.pausedTargets||[]).includes(t));const job=data.jobs?.find(j=>j.camera===c.id);return `<div class="ruleitem"><strong>${esc(c.name)}</strong><p>${r?`${esc(r.name)} · ${esc((r.targets||[r.target||'person']).map(t=>({person:'Pessoas',vehicle:'Veículos',animal:'Animais'})[t]).join(', '))} · ${r.enabled?'Regra habilitada':'Regra desabilitada'}<br>${esc(r.start)} às ${esc(r.end)} · ${esc(r.timezone)}<br>${r.inSchedule?'Dentro do horário ao carregar esta tela':'Fora do horário ao carregar esta tela'} · ${esc(r.priority)}`:'Sem regra configurada'}</p>${r?.pausedTargets?.length?`<p class="notice"><strong>Alertas pausados: ${esc(r.pausedTargets.map(t=>({person:'Pessoas',vehicle:'Veículos',animal:'Animais'})[t]).join(', '))}</strong>. Até reativar; inclui novos alvos da categoria. Reative em Editar regra ou no atendimento de uma ocorrência.</p>`:''}${job?`<p>Última tentativa automática: ${date(job.attemptedAt)}<br>${esc(job.message)}<br>Próxima tentativa agendada: ${date(job.nextAt)}. Sujeita à disponibilidade, regras e limites.</p>`:""}<div class="cameraactions">${writable?`<button data-rule="${esc(c.id)}">${r?'Editar regra':'Criar regra'}</button><button data-rule-template="${esc(c.id)}">Usar outra regra como modelo</button>`:''}<button data-analyze="${esc(c.id)}" ${ready?'':'disabled'}>Analisar agora</button></div><details class="temporarytest"><summary>Teste temporário de diagnóstico (não é operação contínua)</summary><p>Este teste termina após cinco minutos ou dez análises. Não reinicia sozinho. Para manter a vigilância, habilite Configurar operação contínua.</p><button data-auto="${esc(c.id)}" ${ready?'':'disabled'}>Iniciar teste de até 5 minutos</button><button data-ai-stop="${esc(c.id)}">Parar teste</button></details><div></div><p role="status" id="ai-result-${esc(c.id)}">${ready?'Pronto para solicitar uma análise.':'Habilite a IA, o local e a regra para testar.'}</p></div>`}).join('')||'<p>Cadastre uma câmera para definir suas regras.</p>'}</div>`).join('')}</div></div>`;
  document.querySelectorAll('[data-monitor-location]').forEach(button=>button.onclick=async()=>{
    const l=data.locations.find(l=>l.id===button.dataset.monitorLocation);button.disabled=true;stopAnalysis();
    try{await api('/monitoring/locations/'+l.id,{method:'POST',body:{enabled:!l.enabled,version:l.version}});await render()}catch(e){toast(e.message);button.disabled=false}
  });
    document.querySelectorAll('[data-rule-template]').forEach(button=>button.onclick=()=>{
      const target=state.cameras.find(c=>c.id===button.dataset.ruleTemplate);
      const sources=data.rules.filter(r=>r.camera!==target.id&&state.cameras.some(c=>c.id===r.camera&&c.client===target.client));
      if(!sources.length){toast('Crie primeiro uma regra em outra câmera deste local.');return}
      modal('Modelo para '+target.name,`<p>Serão copiados nome, categorias, prioridade, dias, horários e fuso. A área será redefinida para a imagem inteira e a regra ficará desabilitada para revisão. Nada será gravado até você salvar no editor.</p><label>Regra de origem<select id="ruleSource">${sources.map(r=>`<option value="${esc(r.camera)}">${esc(state.cameras.find(c=>c.id===r.camera).name)} — ${esc(r.name)}</option>`).join('')}</select></label><button type="button" id="prepareRuleTemplate">Abrir no editor</button>`,null);
      $('#prepareRuleTemplate').onclick=()=>{
        const source=sources.find(r=>r.camera===$('#ruleSource').value),destination=data.rules.find(r=>r.camera===target.id);
        if(source)ruleModal(target.id,window.InvictusRuleTemplate(source,destination),true);
      };
    });
  document.querySelectorAll('[data-rule]').forEach(button=>button.onclick=()=>ruleModal(button.dataset.rule,data.rules.find(r=>r.camera===button.dataset.rule)));
  document.querySelectorAll('[data-analyze]').forEach(button=>button.onclick=()=>runAnalysis(button.dataset.analyze,false));
  document.querySelectorAll('[data-auto]').forEach(button=>button.onclick=()=>runAnalysis(button.dataset.auto,true));
  document.querySelectorAll('[data-ai-stop]').forEach(button=>button.onclick=()=>{if(analysisSession?.id===button.dataset.aiStop)stopAnalysis()});
  if($('#serviceSettings'))$('#serviceSettings').onclick=()=>{
    const cfg=data.service;
    modal('Monitoramento contínuo',`<p>Ao ativar e salvar, o servidor inicia análises nas câmeras com local e regra habilitados, dentro dos horários definidos. Continua após fechar o navegador ou sair da conta. Se o programa for reiniciado, retoma automaticamente. As imagens são enviadas à OpenAI e podem gerar cobrança.</p><label>Serviço<select name="enabled"><option value="false" ${!cfg.enabled?'selected':''}>Desativado</option><option value="true" ${cfg.enabled?'selected':''}>Ativado</option></select></label><label>Intervalo mínimo entre inícios das análises por câmera (segundos)<input name="interval" type="number" required min="10" max="3600" value="${cfg.interval}"></label><label>Bloqueio de alertas repetidos da mesma câmera (segundos)<input name="cooldown" type="number" required min="30" max="86400" value="${cfg.cooldown}"></label><label>Limite de tentativas por dia, para toda a empresa<input name="dailyLimit" type="number" required min="1" max="10000" value="${cfg.dailyLimit}"></label><p>O limite inclui análises manuais e automáticas e reinicia à meia-noite UTC. Não é um teto financeiro. Ao atingir o limite, as análises param até o próximo dia ou até o administrador elevar o limite. A cada 15 segundos, uma câmera pode solicitar até 5.760 análises por dia; a cada 10 segundos, até 8.640, antes do tempo de processamento e dos limites. O limite diário atual não aumenta ao diminuir o intervalo. A duração da IA pode ultrapassar o intervalo. Nunca há duas análises simultâneas da mesma câmera. Falhas do provedor podem causar uma pausa de até cinco minutos antes da nova tentativa. Mantenha o servidor ligado e sem suspensão.</p>`,async values=>{
      await api('/monitoring/service',{method:'POST',body:{enabled:values.enabled==='true',interval:Number(values.interval),cooldown:Number(values.cooldown),dailyLimit:Number(values.dailyLimit),version:cfg.version}});
      toast(values.enabled==='true'?'Serviço contínuo ativado.':'Serviço contínuo desativado.');
    });
  };
  if($('#aiSettings'))$('#aiSettings').onclick=()=>{
    modal('Configurar OpenAI',`<p>Informe sua chave diretamente aqui. Ela será salva criptografada no servidor desta instalação, usando a chave local de proteção. Não será exibida novamente. Se o serviço contínuo estiver ativado, habilitar a IA permite retomar as análises automaticamente.</p><label>Chave da API<input name="apiKey" type="password" autocomplete="new-password" maxlength="503" ${data.ai?.configured?'':'required'} placeholder="${data.ai?.configured?'Deixe vazio para manter a chave':'sk-…'}"></label><label>Análise<select name="enabled"><option value="true" ${data.ai?.enabled?'selected':''}>Habilitada</option><option value="false" ${!data.ai?.enabled?'selected':''}>Desabilitada</option></select></label><p>Ao solicitar análises, imagens recortadas serão enviadas à OpenAI. O limite diário configurado não representa um teto financeiro. Use somente câmeras autorizadas.</p>`,async values=>{
      $('#form').elements.apiKey.value='';
      await api('/ai/settings',{method:'POST',body:{apiKey:values.apiKey,enabled:values.enabled==='true',version:data.ai?.version||0}});
      toast('Configuração salva. Use Analisar agora para validar a chave e a câmera.');
    });
  };
}
let analysisSession=null;
function stopAnalysis(message='Teste encerrado. Nenhuma nova imagem será enviada.') {
  const task=analysisSession;if(!task)return;analysisSession=null;clearTimeout(task.timer);clearTimeout(task.expiry);task.controller.abort();if(task.status.isConnected)task.status.textContent=message;
}
function runAnalysis(id,automatic) {
  stopAnalysis();
  const status=document.getElementById('ai-result-'+id),task={id,status,controller:new AbortController(),timer:null,count:0,until:Date.now()+300000};analysisSession=task;
  task.expiry=setTimeout(()=>{if(analysisSession===task)stopAnalysis('Limite de cinco minutos atingido. Teste encerrado.');},300000);
  async function tick(){
    if(analysisSession!==task)return;
    if(Date.now()>=task.until||task.count>=10){stopAnalysis('Teste concluído. Consulte Ocorrências para revisar as detecções.');return}
    task.count++;status.textContent='Capturando e analisando a área configurada…';
    try{
      const result=await api('/cameras/'+id+'/analyze',{method:'POST',signal:task.controller.signal});
      if(analysisSession!==task)return;
      status.textContent=(['person','vehicle','animal'].includes(result.outcome)?(result.eventId?`${(result.detectedTargets||[result.outcome]).map(t=>({person:'Pessoa detectada',vehicle:'Veículo detectado',animal:'Animal detectado'})[t]).join(' + ')}. Ocorrência criada para revisão.`:'Alvo detectado. Ocorrência recente já registrada; repetição suprimida pelo intervalo configurado.'):result.outcome==='absent'?'Alvo configurado não identificado nesta captura.':'Imagem inconclusiva. Confira a câmera.')+' '+new Date(result.checkedAt).toLocaleTimeString('pt-BR');
      if(automatic){status.textContent+=' · Teste em execução ('+task.count+'/10).';task.timer=setTimeout(tick,30000)}else{clearTimeout(task.expiry);analysisSession=null}
    }catch(error){if(analysisSession!==task)return;status.textContent=error.message+' Teste interrompido.';clearTimeout(task.expiry);analysisSession=null}
  }
  tick();
}
window.addEventListener('pagehide',()=>{stopAnalysis();stopPreview()});

function ruleModal(id,existing,fromTemplate=false) {
  const r=existing||{name:'Presença de pessoa',enabled:true,priority:'Alta',days:[0,1,2,3,4,5,6],start:'00:00',end:'00:00',timezone:'America/Belem',area:{x:0,y:0,width:100,height:100},version:0};
  modal('Regra · '+state.cameras.find(c=>c.id===id).name,`<p>Detectar as categorias selecionadas na área definida. Use uma análise manual ou ative o serviço contínuo. Veículos parados também contam como presença; não há reconhecimento de movimento ou placas.</p><label>Nome<input name="name" maxlength="80" required value="${esc(r.name)}"></label><fieldset class="ruledays"><legend>O que detectar (selecione uma ou mais)</legend>${[['person','Pessoas'],['vehicle','Veículos'],['animal','Animais']].map(([value,label])=>`<label><input type="checkbox" data-target="${value}" ${(r.targets||[r.target||'person']).includes(value)?'checked':''}>${label}</label>`).join('')}</fieldset><fieldset class="ruledays"><legend>Pausar categorias até reativar</legend><p>Marque para interromper análises e novos alertas desta categoria nesta câmera. Desmarque para reativar. A pausa inclui novos alvos; não reconhece indivíduos.</p>${[['person','Pessoas'],['vehicle','Veículos'],['animal','Animais']].map(([value,label])=>`<label><input type="checkbox" data-paused-target="${value}" ${(r.pausedTargets||[]).includes(value)?'checked':''}>${label}</label>`).join('')}</fieldset><label>Regra<select name="enabled"><option value="true" ${r.enabled?'selected':''}>Habilitada</option><option value="false" ${!r.enabled?'selected':''}>Desabilitada</option></select></label><label>Prioridade<select name="priority">${['Alta','Média','Baixa'].map(p=>`<option ${r.priority===p?'selected':''}>${p}</option>`).join('')}</select></label><fieldset class="ruledays"><legend>Dias de início da vigilância</legend>${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i)=>`<label><input type="checkbox" data-day="${i}" ${r.days.includes(i)?'checked':''}>${d}</label>`).join('')}</fieldset><label>Início<input type="time" name="start" required value="${r.start}"></label><label>Fim<input type="time" name="end" required value="${r.end}"></label><p>Horários iguais: 24 horas nos dias selecionados. Das 22h às 6h termina no dia seguinte.</p><label>Fuso horário<select name="timezone">${[...new Set([r.timezone,'America/Belem','America/Fortaleza','America/Sao_Paulo','America/Manaus','America/Rio_Branco'])].map(t=>`<option ${r.timezone===t?'selected':''}>${esc(t)}</option>`).join('')}</select></label><h3>Área de vigilância</h3><p>Clique em Capturar imagem da câmera e arraste sobre a foto para definir a área. A prévia é uma fotografia, não vídeo ao vivo. A captura não usa a IA. Você também pode ajustar as porcentagens.</p><button type="button" id="captureArea">Capturar imagem da câmera</button><button type="button" id="fullArea">Usar imagem inteira</button><p id="areaPreviewStatus" role="status">Sem fotografia: quadro esquemático.</p><canvas id="ruleArea" width="640" height="360" aria-label="Prévia da área de vigilância"></canvas><div class="areafields">${[['x','Esquerda'],['y','Topo'],['width','Largura'],['height','Altura']].map(([k,label])=>`<label>${label} (%)<input type="number" name="${k}" min="${k==='width'||k==='height'?0.1:0}" max="100" step="0.1" required value="${r.area[k]}"></label>`).join('')}</div>`,async values=>{
    const days=[...document.querySelectorAll('[data-day]:checked')].map(x=>Number(x.dataset.day));
    const targets=[...document.querySelectorAll('[data-target]:checked')].map(x=>x.dataset.target);
    if(!targets.length)throw Error('Selecione pelo menos uma categoria.');
    const pausedTargets=[...document.querySelectorAll('[data-paused-target]:checked')].map(x=>x.dataset.pausedTarget).filter(t=>targets.includes(t));
    await api('/monitoring/cameras/'+id,{method:'POST',body:{...values,enabled:values.enabled==='true',days,targets,pausedTargets,version:r.version,area:Object.fromEntries(['x','y','width','height'].map(k=>[k,Number(values[k])]))}});
    toast('Regra salva. Inicie um teste no menu Monitoramento.');
  });
  if(fromTemplate){const notice=document.createElement('p');notice.className='notice';notice.textContent='Modelo carregado: revise horários, categorias e área desta câmera. A regra está desabilitada; só será aplicada ao salvar. Se já existe uma regra, salvar substituirá sua configuração.';$('#fields').prepend(notice)}
  const canvas=$('#ruleArea'),ctx=canvas.getContext('2d'),fields=Object.fromEntries(['x','y','width','height'].map(k=>[k,$('#form').elements[k]]));
  let background=null;
  function draw(){
    const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
    if(background)ctx.drawImage(background,0,0,w,h);
    else{ctx.fillStyle='#07111e';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#29425d';ctx.lineWidth=1;for(let i=0;i<=10;i++){ctx.beginPath();ctx.moveTo(w*i/10,0);ctx.lineTo(w*i/10,h);ctx.moveTo(0,h*i/10);ctx.lineTo(w,h*i/10);ctx.stroke()}}
    const a=Object.fromEntries(Object.entries(fields).map(([k,f])=>[k,Number(f.value)]));ctx.fillStyle='#1683ff44';ctx.fillRect(a.x*w/100,a.y*h/100,a.width*w/100,a.height*h/100);ctx.strokeStyle='#62b2ff';ctx.lineWidth=3;ctx.strokeRect(a.x*w/100,a.y*h/100,a.width*w/100,a.height*h/100);
  }
  $('#fullArea').onclick=()=>{fields.x.value=fields.y.value='0';fields.width.value=fields.height.value='100';draw()};
  const capture=$('#captureArea'),previewStatus=$('#areaPreviewStatus');
  capture.onclick=async()=>{
    stopPreview();const controller=new AbortController();previewController=controller;capture.disabled=true;previewStatus.textContent='Capturando a imagem…';
    let imageUrl;
    try{
      const response=await fetch('/api/cameras/'+encodeURIComponent(id)+'/preview',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'X-CSRF-Token':csrf},signal:controller.signal});
      if(!response.ok){if(response.status===401)showLogin();const data=await response.json();throw Error(data.error||'Não foi possível capturar a imagem.')}
      const blob=await response.blob();if(controller.signal.aborted||!canvas.isConnected)return;
      imageUrl=URL.createObjectURL(blob);const img=new Image();img.src=imageUrl;await img.decode();
      if(controller.signal.aborted||!canvas.isConnected)return;
      if(!img.naturalWidth||!img.naturalHeight)throw Error('Imagem inválida.');
      background=img;canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;draw();
      previewStatus.textContent='Foto capturada às '+new Date().toLocaleTimeString('pt-BR')+'. Arraste para selecionar; Salvar aplica a área.';
    }catch(error){if(!controller.signal.aborted&&canvas.isConnected)previewStatus.textContent=error.message+(background?' A foto anterior foi mantida.':' O quadro permanece esquemático.')}
    finally{if(imageUrl)URL.revokeObjectURL(imageUrl);capture.disabled=false;if(previewController===controller)previewController=null}
  };
  Object.values(fields).forEach(f=>f.oninput=draw);draw();
  let anchor=null;
  const point=e=>{const b=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(100,(e.clientX-b.left)/b.width*100)),y:Math.max(0,Math.min(100,(e.clientY-b.top)/b.height*100))}};
  canvas.onpointerdown=e=>{anchor=point(e);canvas.setPointerCapture(e.pointerId)};
  canvas.onpointermove=e=>{if(!anchor)return;const p=point(e),a={x:Math.min(anchor.x,p.x),y:Math.min(anchor.y,p.y),width:Math.abs(p.x-anchor.x),height:Math.abs(p.y-anchor.y)};for(const k in a)fields[k].value=(Math.floor(a[k]*10)/10).toFixed(1);draw()};
  canvas.onpointerup=canvas.onpointercancel=()=>{anchor=null};
}

async function healthPage(current){
  const data=await api('/diagnostics');if(current!==revision||!state)return;
  const list=data.cameras.filter(c=>!$('#location').value||c.client===$('#location').value);
  const storage=list.reduce((sum,c)=>{const e=c.evidence;sum.photos+=e.photos;sum.events+=e.events;sum.bytes+=e.bytes;if(e.oldest&&(!sum.oldest||e.oldest<sum.oldest))sum.oldest=e.oldest;return sum},{photos:0,events:0,bytes:0,oldest:null});
  const size=bytes=>bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toLocaleString('pt-BR',{maximumFractionDigits:2})+' KiB':(bytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:2})+' MiB';
  const results={person:'Pessoa detectada',vehicle:'Veículo detectado',animal:'Animal detectado',absent:'Sem alvo confirmado',uncertain:'Inconclusiva'};
  $('#content').innerHTML=`<div class="panel"><div class="panelhead"><h3>Saúde do sistema</h3><button id="refreshHealth">Atualizar diagnóstico</button></div><div class="notice">Situação calculada em ${date(data.checkedAt)} com base nas configurações e no histórico. Não é uma verificação ao vivo da conexão. Consultar esta tela não envia imagens à IA.</div><div class="status"><div>Serviço de vídeo<span>${data.videoReady?'Disponível na instalação':'Indisponível'}</span></div><div>Serviço contínuo<span>${data.service.enabled?'Habilitado':'Desativado'}</span></div><div>IA configurada<span>${data.ai.configured?'Sim':'Não'}</span></div><div>Uso diário da empresa (UTC)<span>${data.ai.used} / ${data.ai.dailyLimit}</span></div><div>Câmeras do filtro que exigem atenção<span>${list.filter(c=>c.health.attention).length} de ${list.length}</span></div></div></div><div class="panel"><div class="panelhead"><h3>Fotos armazenadas no local selecionado</h3>${state.user.role==='admin'?'<button id="retentionPreview">Simular retenção</button><button id="retentionCleanup">Limpar fotos antigas</button>':''}</div><div class="status"><div>Fotos salvas<span>${storage.photos}</span></div><div>Tamanho das imagens<span>${size(storage.bytes)}</span></div><div>Ocorrências sem foto<span>${storage.events-storage.photos}</span></div><div>Foto mais antiga<span>${storage.oldest?date(storage.oldest):'Nenhuma'}</span></div></div><div class="notice">Somente imagens dos locais autorizados neste filtro. Não inclui banco, índices, vídeos, backups ou espaço livre do disco. Nenhuma foto é apagada automaticamente. Use FAZER-BACKUP na pasta do programa para guardar uma cópia protegida.</div></div><div class="healthgrid">${list.map(c=>`<article class="panel"><div class="panelhead"><h3>${esc(c.name)}<small>${esc(c.location)}</small></h3><span class="badge ${c.health.attention?'medium':''}">${esc(c.health.label)}</span></div><div class="settings"><p>${esc(c.health.action)}</p><p>Fotos salvas: ${c.evidence.photos} · ${size(c.evidence.bytes)}<br>Ocorrências sem foto: ${c.evidence.events-c.evidence.photos}</p><p>Última análise concluída: ${c.lastAnalysis?date(c.lastAnalysis):'Nenhuma registrada'}<br>Resultado resumido: ${esc(results[c.lastOutcome]||'Não registrado')}<br>Última tentativa automática: ${c.lastAttempt?date(c.lastAttempt):'Nenhuma registrada'}</p>${c.lastMessage?`<p>Mensagem da última tentativa: ${esc(c.lastMessage)}</p>`:''}${c.retryAfter?`<p>Horário registrado para próxima tentativa: ${date(c.retryAfter)}. Depende de regras, limites e capacidade.</p>`:''}<div class="cameraactions"><button data-health-camera="${esc(c.id)}">Opções da câmera</button><a class="textbtn" href="#monitoramento">Revisar monitoramento</a></div></div></article>`).join('')||'<div class="empty">Nenhuma câmera neste local.</div>'}</div>`;
  $('#refreshHealth').onclick=()=>render();
  if($('#retentionPreview'))$('#retentionPreview').onclick=()=>retentionPreviewModal();
  if($('#retentionCleanup'))$('#retentionCleanup').onclick=()=>retentionCleanupModal();
  document.querySelectorAll('[data-health-camera]').forEach(b=>b.onclick=()=>cameraModal(b.dataset.healthCamera));
}

function installationPanel(){
  const info=state.installation;
  return `<div class="panel"><div class="panelhead"><h3>Sobre esta instalação</h3></div><div class="status"><div>Versão em execução<span>${esc(info?.version||'Não informada')}</span></div><div>Servidor iniciado em<span>${info?.startedAt?date(info.startedAt):'Não informado'}</span></div></div><div class="settings"><p>A versão acima vem do servidor em execução. Baixar um pacote não atualiza o programa automaticamente.</p>${state.user.role==='admin'?`<h4>Como atualizar no computador</h4><ol><li>Abra FAZER-BACKUP na pasta atual e aguarde a confirmação.</li><li>Feche a janela do servidor Invictus.</li><li>Extraia o novo pacote e substitua os arquivos do programa, preservando data, .tools e backups.</li><li>Execute INICIAR-INVICTUS, atualize o navegador com Ctrl+F5 e confira a versão nesta tela.</li></ol><p>Não apague a pasta data: ela contém os cadastros, fotos e a chave das conexões. Não abra duas instalações ao mesmo tempo.</p><h4>Conferência após atualizar</h4><ul><li>Abra uma câmera ao vivo.</li><li>Confira Monitoramento e os horários das regras.</li><li>Abra uma ocorrência com foto.</li><li>Confira Saúde do sistema e os limites de análise.</li></ul><p>Os backups contêm dados sensíveis e a chave das credenciais. Guarde uma cópia protegida em outro disco. O backup não é automático.</p>`:'<p>Para atualizar ou fazer backup da instalação, procure o administrador responsável.</p>'}</div></div>`;
}

function showRequiredPassword(){
  stopPreview();stopAnalysis();window.InvictusLive.stop();window.InvictusAlerts.stop();state=null;revision++;
  $('#appView').hidden=true;$('#loginView').hidden=true;if($('#requiredPassword'))return;
  const section=document.createElement('section');section.id='requiredPassword';section.className='loginview';
  section.innerHTML='<form class="loginbox"><h1>Defina sua própria senha</h1><p>Sua senha foi redefinida pelo administrador. Crie uma senha diferente antes de acessar o painel.</p><label>Senha inicial recebida<input name="current" type="password" required maxlength="128" autocomplete="current-password"></label><label>Nova senha<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><label>Repita a nova senha<input name="confirmation" type="password" required minlength="12" maxlength="128" autocomplete="new-password"></label><p role="alert"></p><button class="primary" type="submit">Salvar nova senha</button><button type="button" data-exit>Sair</button></form>';
  document.body.append(section);
  section.querySelector('[data-exit]').onclick=async()=>{try{await api('/logout',{method:'POST'});showLogin()}catch(error){section.querySelector('[role="alert"]').textContent=error.message}};
  section.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.target,button=form.querySelector('[type="submit"]'),status=form.querySelector('[role="alert"]');button.disabled=true;
    try{const data=Object.fromEntries(new FormData(form));if(data.password!==data.confirmation)throw Error('As novas senhas não coincidem.');await api('/password',{method:'POST',body:{current:data.current,password:data.password}});form.reset();showLogin();toast('Senha definida. Entre com a nova senha.')}catch(error){status.textContent=error.message}finally{button.disabled=false}
  };
}

function renameItem(kind,item){
  modal(kind==='clients'?'Editar nome do local':'Editar nome da câmera',`<label>Nome<input name="name" required maxlength="${kind==='clients'?80:60}" value="${esc(item.name)}"></label><p>Regras, conexões e ocorrências continuam vinculadas ao mesmo cadastro. As telas e relatórios passam a usar o novo nome.</p>`,async data=>{
    await api('/'+kind+'/'+encodeURIComponent(item.id)+'/name',{method:'PATCH',body:{name:data.name,previousName:item.name}});toast('Nome atualizado.');
  });
}

function retentionPreviewModal(){
  const client=$('#location').value;
  modal('Simulação de retenção',`<p>Local: ${esc(client?clientName(client):'Todos os locais da empresa')}</p><p>Somente fotos anteriores ao prazo e vinculadas a ocorrências finalizadas entram na seleção. Nenhuma imagem será apagada.</p><label>Prazo em dias<input id="retentionDays" type="number" min="1" max="3650" step="1" value="30"></label><button type="button" id="calculateRetention">Calcular simulação</button><section id="retentionResult" aria-live="polite"></section>`,null);
  const button=$('#calculateRetention'),input=$('#retentionDays'),result=$('#retentionResult'),epoch=authEpoch;
  button.onclick=async()=>{
    if(!input.reportValidity())return;const days=Number(input.value);if(!Number.isInteger(days)||days<1||days>3650){result.textContent='Informe um prazo de 1 a 3650 dias.';return}
    button.disabled=true;input.disabled=true;result.textContent='Calculando.';
    try{const data=await api('/evidence/retention-preview?days='+days+(client?'&client='+encodeURIComponent(client):''));if(epoch!==authEpoch||!result.isConnected)return;
      result.innerHTML=`<p><strong>${data.eligible} foto(s)</strong> de ocorrências finalizadas entram na simulação.<br>Tamanho das imagens: ${(data.eligibleBytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:3})} MiB.<br>Fotos antigas de ocorrências abertas preservadas: ${data.protectedOpen}.<br>Total de fotos neste local/filtro: ${data.total}.</p><p>Prazo: ${data.days} dias. Capturas anteriores a ${date(data.cutoff)}. Calculado em ${date(data.checkedAt)}.</p><p>Simulação apenas. Não ativa limpeza automática nem remove fotos. O tamanho das imagens não equivale necessariamente ao espaço que seria liberado no disco.</p>`;
    }catch(error){if(result.isConnected)result.textContent=error.message}finally{button.disabled=false;input.disabled=false}
  };
}

function retentionCleanupModal(){
  const client=$('#location').value;
  modal('Limpeza de fotos antigas',`<p>Local: ${esc(client?clientName(client):'Todos os locais da empresa')}</p><p>Somente fotos antigas de ocorrências finalizadas. O cálculo abaixo não exclui nada; haverá uma confirmação separada. Faça backup das imagens que deseja guardar.</p><label>Prazo em dias<input id="cleanupDays" type="number" min="1" max="3650" step="1" value="30"></label><button type="button" id="prepareCleanup">Conferir fotos elegíveis</button><section id="cleanupResult" aria-live="polite"></section>`,null);
  const generation=modalGeneration,epoch=authEpoch,button=$('#prepareCleanup'),input=$('#cleanupDays'),result=$('#cleanupResult');
  input.oninput=()=>result.replaceChildren();
  button.onclick=async()=>{
    if(!input.reportValidity())return;const days=Number(input.value);
    button.disabled=input.disabled=true;result.textContent='Preparando prévia…';
    try{
      const data=await api('/evidence/retention/prepare',{method:'POST',body:{days,client:client||null}});
      if(generation!==modalGeneration||epoch!==authEpoch||!result.isConnected)return;
      result.innerHTML=`<p>Elegíveis no filtro: ${data.eligible}.<br>Neste lote: <strong>${data.batchCount} foto(s)</strong> — ${(data.batchBytes/1048576).toLocaleString('pt-BR',{maximumFractionDigits:3})} MiB.<br>Fotos antigas de ocorrências abertas preservadas: ${data.protectedOpen}.</p><p>Capturas anteriores a ${date(data.cutoff)}. Limite de ${data.batchLimit} fotos por lote. Prévia válida até ${date(data.expiresAt)}.</p>${data.token?'<button type="button" id="reviewCleanup">Revisar e confirmar exclusão</button>':'<p>Nenhuma foto elegível. Nada será excluído.</p>'}`;
      if($('#reviewCleanup'))$('#reviewCleanup').onclick=()=>{
        modal('Confirmar exclusão das fotos',`<p><strong>Excluir definitivamente ${data.batchCount} foto(s)</strong> de ocorrências finalizadas em ${esc(client?clientName(client):'todos os locais da sua empresa')}?</p><p>Prazo: ${data.days} dias; capturas anteriores a ${date(data.cutoff)}. Os registros das ocorrências e o histórico serão preservados. Não há desfazer no painel; para recuperar imagens, será necessário um backup anterior.</p><p>O arquivo do banco pode manter o mesmo tamanho: o espaço interno fica disponível para novos dados. Não haverá limpeza automática posterior.</p><label>Digite EXCLUIR FOTOS<input name="confirmation" required pattern="EXCLUIR FOTOS" autocomplete="off"></label>`,async value=>{
          const response=await api('/evidence/retention/execute',{method:'POST',body:{token:data.token,confirmation:value.confirmation}});
          toast(response.deleted+' foto(s) excluída(s). Registros das ocorrências preservados.');
        });
      };
    }catch(error){if(generation===modalGeneration&&epoch===authEpoch&&result.isConnected)result.textContent=error.message}
    finally{button.disabled=input.disabled=false}
  };
}
