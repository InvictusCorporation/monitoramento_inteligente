# Paridade da interface operacional — 0.44.0-dev.1

## Escopo e leitura

Inventário e comparação entre `servico/web/app.js`, `servico/web/master.js`, `servico/web/event-report.js`, `servico/web/rule-template.js`, `servico/server/app.mjs` e a SPA em `src/operational/`. A fonte de verdade é o serviço Node; a prévia TanStack continua sendo uma demonstração separada.

Perfis: **A** = admin; **O** = operator; **C** = client limitado ao próprio local; **M** = admin com a concessão `platformAdmin`. `platformAdmin` não é um quarto papel operacional nem concede imagens, streams ou ocorrências de parceiras.

Evidências citadas:

- **S**: suíte Node 24, 172 testes aprovados.
- **F**: suíte frontend atual, 31 testes aprovados em seis arquivos.
- **BA**: Playwright final, admin/master, 1280×1800, API e SQLite temporários.
- **BP**: Playwright final, operator/client, desktop e 390×844, API e SQLite temporários.
- **Código**: ação implementada e conferida estaticamente, sem alegar um percurso de navegador específico.

“Antes” descreve a 0.43.0. “Nativa” significa React na nova SPA, sem iframe, HTML legado injetado ou redirecionamento para executar a ação.

## Sessão, navegação e operação diária

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Login por empresa, e-mail e senha; restauração e logout | A/O/C/M | `POST /api/login`, `GET /api/session`, `POST /api/logout` | Nativo | Nativo; guarda de carregamento/erro antes de acessar estado e recuperação sem demo | S, F, BA, BP |
| Troca obrigatória/própria de senha | A/O/C/M | `POST /api/password` | Nativo | Nativo; sessões são encerradas e novo login é exigido | S, F; fluxo final de troca não repetido no Playwright |
| Estado autorizado, marca, locais e versão | A/O/C/M | `GET /api/state` | Nativo | Nativo; estado anterior só é mantido após um carregamento bem-sucedido quando uma atualização transitória falha | S, F, BA, BP |
| Sidebar responsiva por papel | A/O/C/M | Estado de sessão e `platformAdmin` | Quatro áreas principais | Painel, Câmeras, Ocorrências, Monitoramento, Relatórios, Saúde, Configurações e áreas administrativas/master conforme papel | BA, BP |
| Mosaico, busca, local, paginação e acesso a todas as câmeras | A/O/C/M | `GET /api/state`; limites em `state.video` | Parcial | Nativo, sem corte fixo em 3/4/9; 1/4/8/9/16/25 conforme limites | BA, BP |
| Vídeo sob demanda, reconexão, expansão e tela cheia | A/O/C/M, licença válida | `POST /api/cameras/:id/live`; player MediaSource original | Nativo | Nativo; chave por instância, parada do tile ao expandir e cleanup ao fechar/sair | S, F, BA |
| Fila, timeline, alertas e som por gesto | A/O/C/M | `GET /api/alerts` | Nativo | Nativo, mantendo helper original e polling sem sobreposição | BA, BP |
| Abrir ocorrência pela fila/alerta | A/O/C/M | `GET /api/state`, detalhes do evento autorizado | Nativo | Nativo | BA, BP |

## Câmeras e conexão

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Cadastrar câmera em local autorizado | A/O/C | `POST /api/cameras` | Básico nativo | Nativo, com licença e escopo verificados no servidor | S, BA |
| Listar/buscar/paginar e abrir opções | A/O/C | `GET /api/state` | Parcial | Nativo, todas as câmeras autorizadas | BA, BP |
| Renomear com nome anterior | A/O/C | `PATCH /api/cameras/:id/name` | Legado | Nativo | S, BA |
| Ler metadados redigidos da conexão | A/O/C | `GET /api/cameras/:id/connection` | Legado | Nativo; senha e usuário protegidos não retornam | S, BA |
| Configurar DVR Intelbras/canal/stream ou RTSP manual | A/C | `POST /api/cameras/:id/connection` | Legado | Nativo; operador não recebe o editor | S, BA; C validado na suíte |
| Alterar conexão mantendo credencial existente | A/C | Mesma rota, `preserveCredentials:true` | Exigia reenvio | Reutilização somente no servidor e somente no mesmo host/porta validados; canal/stream/path podem mudar. Trocar host/porta exige novas credenciais; versão, CSRF, tenant e local permanecem | S, F, BA (mesmo destino) |
| Habilitar/desabilitar conexão com versão | A/C | `PATCH /api/cameras/:id/connection` | Legado | Nativo | S, Código |
| Testar conexão | A/C, conforme gateway | `POST /api/cameras/:id/test` | Legado | Nativo, apenas por comando explícito | S, BA com subprocesso fixture |
| Capturar prévia JPEG | A/C | `POST /api/cameras/:id/preview` | Legado | Nativo, sem IA ou vídeo automático | S, BA com JPEG fixture |
| Limites, 401/403/409/429/502 e isolamento | A/O/C | Gateway e controles HTTP existentes | Motor | Preservados; nenhuma rota foi liberada para contornar 403 | S, F, BA/BP para 401/403/409 |

## Clientes comerciais, locais e usuários

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Criar cliente comercial | A/M na própria operação | `POST /api/customers` | Legado | Nativo | S, BA |
| Criar local e opcionalmente vincular cliente | A/M na própria operação | `POST /api/clients` | Legado | Nativo | S, BA |
| Editar nome do local com nome anterior | A | `PATCH /api/clients/:id/name` | Legado | Nativo | S, Código |
| Vincular local a cliente com valor anterior | A/M na própria operação | `POST /api/clients/:id/customer` | Legado | Nativo | S, Código |
| Listar usuários sem hashes | A | `GET /api/users` | Legado | Nativo | S, BA |
| Criar admin/operador/cliente com papel e local | A | `POST /api/users` | Legado | Nativo, senha inicial manual e troca obrigatória | S, BA |
| Ativar/desativar usuário | A | `PATCH /api/users/:id` | Legado | Nativo; desativação revoga sessões no motor | S, Código |
| Redefinir senha de outro usuário | A | `POST /api/users/:id/password` | Legado | Nativo, exigindo senha do administrador | S, Código |
| Consultar sessões e revogar as demais | A/O/C/M | `GET /api/sessions`, `POST /api/sessions/revoke-others` | Legado | Nativo para todos os papéis | S, BP |
| Isolamento de cliente ao próprio local | C | Escopo de `/state` e demais rotas | Motor | Preservado; interface e API não expõem outros locais | S, BP (`GET /api/users` = 403) |

## Ocorrências, evidências e relatórios

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Filtros por texto/status/câmera/prioridade/responsável/data, ordenação e paginação | A/O/C | `GET /api/state`; seletor `event-report.js` | Parcial | Nativo, incluindo todas as páginas do conjunto autorizado | F, BA |
| Assumir atendimento sem perder nota | A/O | `POST /api/events/:id/claim` | Nativo | Nativo; cliente não recebe a ação; após escrita, versão local +1 impede claim duplicado mesmo se o GET falhar | S, F, BA, BP |
| Salvar observação sem finalizar/pausar | A/O/C | `PATCH /api/events/:id` | Nativo | Nativo; 409 → recarregar mantém rascunho e permite salvar com a versão nova; PATCH gravado com GET falho é sinalizado sem regredir versão | S, F, BA |
| Alterar status/finalizar e pausar/reativar categoria | A/O/C para status; ações de categoria da central | `PATCH /api/events/:id`, `action` e versão | Nativo | Nativo; finalização normal não pausa | S, F; pausa/reativação coberta no motor |
| Transferir com destinatário e motivo | A ou O responsável | `GET /api/operators`, `POST /api/events/:id/transfer` | Legado | Nativo; cliente e operador não responsável não podem transferir; escrita gravada com GET falho avança versão/responsável e impede duplicação | S, F, BA |
| Histórico, revisões e transferências | A/O | `GET /api/events/:id/history` | Legado | Nativo, até o limite original de 100 ações | S, BA |
| Ver foto autenticada | A/O/C autorizado | `GET /api/events/:id/image` | Nativo | Nativo, Blob/data URL compatível com CSP e descarte ao fechar | S, BA |
| Download auditado da foto | A/O/C autorizado | `GET /api/events/:id/image?download=1` | Legado | Nativo, nome de arquivo do servidor | S, BA |
| Relatório e CSV de todas as linhas filtradas | A/O/C | `GET /api/state`; algoritmo local de `event-report.js` | Legado | Nativo, mesmo seletor/CSV local; não existe API de relatório separada | F, BA |
| Rótulo temporal | Todos | `createdAt` | Corrigido | “Ocorrência registrada”; não é apresentado como horário de captura | F, BA |

## Monitoramento e análise

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Habilitar/desabilitar local com versão | A/C | `POST /api/monitoring/locations/:id` | Legado | Nativo; navegação não altera o local | S, Código |
| Serviço contínuo enabled/interval/cooldown/quota/version | A | `POST /api/monitoring/service` | Legado | Nativo, com aviso de envio à OpenAI e ausência de teto financeiro | S, Código; não ativado no browser |
| Configurar IA sem revelar chave existente | A | `POST /api/ai/settings` | Legado | Nativo; campo vazio preserva chave pelo contrato do motor | S, Código; nenhuma API externa chamada |
| Regra completa e versões consecutivas | A/C | `POST /api/monitoring/cameras/:id` | Parcial | Nativo: enabled, nome, prioridade, targets/pausas, dias, início/fim, fuso e área | S, F, BA |
| Área visual e coordenadas percentuais | A/C | `area:{x,y,width,height}` e preview JPEG | Legado | Nativo, canvas com arraste, campos numéricos e imagem inteira | F, BA nos campos; arraste com ponteiro não exercitado |
| Modelo de regra no mesmo local | A/C | `rule-template.js` + POST da regra | Legado | Nativo, desabilitada e com área inteira até salvar | F, Código |
| Normalização de regras antigas | A/O/C | `GET /api/monitoring` | Nativo | Somente leitura; nenhuma migração ou escrita silenciosa | S, F |
| Análise manual e estado da ocorrência/jobs | A/O/C conforme prontidão do motor | `POST /api/cameras/:id/analyze`, `GET /api/monitoring` | Legado | Nativo; timeout frontend 60 s, abort e epoch; backend mantém 45 s | S, F, BA com detector injetado |
| Teste temporário de até 5 min/10 análises | A/O/C conforme prontidão | Mesma análise manual | Legado | Nativo, somente por comando e com parada/cleanup | Código; não executado por 5 min no browser |

## Saúde, retenção, conta e marca

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Diagnóstico segmentado, câmeras, jobs, IA e fotos | A/O/C | `GET /api/diagnostics` | Legado | Nativo; não é teste ao vivo nem envia imagem à IA | S, BA |
| Retenção preview | A | `GET /api/evidence/retention-preview` | Legado | Nativo; nenhuma exclusão ao navegar/simular | S, BA |
| Retenção prepare/execute | A | `POST /api/evidence/retention/prepare` e `/execute` | Legado | Nativo, escopo/local, token de uso único, versão do lote e texto `EXCLUIR FOTOS`; mudança de local/dias aborta por geração, libera busy e invalida resposta/token antigos | S, F, BA somente em SQLite temporário |
| Auditoria das últimas 100 ações | A | `GET /api/audit` | Legado | Nativo | S, BA |
| Marca da própria operação | A | `PATCH /api/brand` | Legado | Nativo; aplica retorno do servidor à própria empresa | S, BA |
| Prazos de atendimento com versão | A | `GET/POST /api/alert-policy` | Legado | Nativo | S, BA |
| Backup/restauração/atualização | Administrador local do computador | Scripts e arquivos/CLI originais | Orientação/legado | Somente instrução fiel; nenhum botão web ou sucesso simulado | Código |

## Gestão master

| Recurso | Perfil | API/contrato original | Antes | Depois | Evidência |
|---|---|---|---|---|---|
| Visão geral da própria empresa e parceiras diretas | M | `GET /api/platform/companies`, `/plans` | Parcial | Nativa; sem alegar acesso a imagens/eventos das parceiras | S, BA |
| Clientes e locais da própria operação | M/A | Rotas comuns de customers/clients | Legado | Nativos, separados das parceiras | S, BA |
| Criar empresa parceira e primeiro admin | M | `POST /api/platform/companies` | Legado | Nativo, senha inicial manual e escopo direto | S, BA |
| Criar/editar/ativar/desativar plano patrimonial | M | `POST /api/platform/plans`, `PATCH /api/platform/plans/:id` | Legado | Nativo; alterações não reescrevem licenças existentes | S, BA para criação |
| Branding herdado/override, cor e logo | M | `GET/PATCH /api/platform/branding/:company` | Legado | Nativo, versão e recarga explícita em conflito; logo normalizado a PNG ≤256 px | S, BA sem upload de arquivo |
| Licença por local: plano/status/limite/vencimento | M | `POST /api/platform/licenses/:location` | Legado | Nativo, planId/planVersion quando selecionado e conflito preservando rascunho | S, BA |
| Conceder/revogar `platformAdmin` | Procedimento administrativo original | Comando local original | Fora da SPA | Não foi inventado endpoint web | Inventário |

## O que permanece fora da SPA por não ser comando web

Instalação, iniciadores Windows, preparação de FFmpeg/Node, backup, restauração, atualização de arquivos e concessão local de master são procedimentos de CLI/arquivos. `/api/local-setup` é apenas a exceção original de primeira configuração em loopback com token; não foi transformada em ferramenta geral de administração.

A interface original continua em `/legado/` como compatibilidade opcional. Nenhum fluxo web acima depende desse endereço. O ZIP 0.43.0 continua suspenso pelo alerta Microsoft Defender documentado; esta tarefa não gerou ZIP, release nem declaração de falso positivo.


## Revisão final de uso diário

As correções finais acrescentam regressões automatizadas para: foco mantido no modal durante atualizações, Escape com callback atual, player contínuo ao rerender/polling, encerramento completo da sessão quando o player recebe 401, mosaico válido com limite de dois vídeos e acesso paginado a seis câmeras, cadastro concluído mesmo se a leitura seguinte falhar e preservação do formulário quando o próprio POST falha. Também foram preservadas as regressões anteriores de rascunho/versionamento, retenção por escopo e credenciais restritas ao mesmo host/porta.

O relatório [VALIDACAO-CI-PARIDADE.md](VALIDACAO-CI-PARIDADE.md) identifica o commit testado, execução e resultados finais de serviço/interface/tipos/build no GitHub Actions. Os percursos Playwright da validação anterior continuam documentados; não se afirma nova validação com DVR, OpenAI paga ou Windows após essas correções. A falta de créditos da Lovable foi contornada somente para desenvolvimento por CI no GitHub; não houve alteração da proteção do usuário, submissão antivírus ou geração de pacote alternativo.
