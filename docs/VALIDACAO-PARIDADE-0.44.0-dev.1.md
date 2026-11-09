# Validação da paridade — 0.44.0-dev.1

## Ambiente e limites

Validação em desenvolvimento, sem publicação. O serviço real foi executado com Node **24.21.0**, banco SQLite e diretórios temporários em `/tmp`, subprocesso de vídeo substituído por fixtures JPEG/MP4 e detector de IA injetado. Nenhum DVR, RTSP, equipamento, OpenAI ou serviço pago foi acessado. Nenhum iniciador Windows foi executado no Linux.

A fixture `servico/tests/fixtures/parity-server.mjs` cria contas temporárias admin, operator, client e platformAdmin, seis câmeras em dois locais, ocorrências e evidências. Suas credenciais são exclusivamente locais e descartáveis; não são credenciais de instalação. O servidor de fixture foi encerrado após os testes.

## Resultados reproduzíveis

- `nix run nixpkgs#nodejs_24 -- --test servico/tests/*.test.mjs`: Node **24.21.0**, **172 testes aprovados**, 0 falhas, 0 cancelados, 0 ignorados; 5,68 s na revisão de destino.
- `bunx vitest run src/operational`: **31 testes aprovados em 6 arquivos**, 0 falhas; 1,11 s.
- `oj typecheck -b --noEmit`: aprovado, sem erros.
- `bun run build:operational`: aprovado com Vite **8.1.5**, 1.732 módulos; três arquivos em `servico/dist/interface`.
- `git diff --check`: aprovado após remoção de espaços finais.
- Build operacional executado novamente sem alterações intermediárias: os mesmos três caminhos e SHA256, comprovando reprodutibilidade dos bytes.

Hashes do build final:

| Arquivo | SHA256 |
|---|---|
| `servico/dist/interface/index.html` | `2a681067a449a6630a8a80c0fe715bf4bf2b4bbe6a22be890deebfb6ec52884a` |
| `servico/dist/interface/assets/index-DZV-toga.css` | `d4936ee931b1ed4c0dec8a4adf58ae864948845d1be1da2c536d77f4f4820e3e` |
| `servico/dist/interface/assets/index-Cu8CSS58.js` | `57890961f697cde62aa3cc933cb42068f89aae607b6506211cb808390a8115e1` |

Os avisos do Vite sobre `/live-player.js` e `/alerts.js` são esperados: são scripts clássicos originais servidos separadamente pelo Node, não módulos a empacotar. Nenhum `unsafe-inline`, `unsafe-eval`, CORS permissivo ou fallback demo foi adicionado.

## Regressões automatizadas adicionadas

- Login com `/state` e `/monitoring` pendentes: o formulário sai, uma guarda explícita informa carregamento e nenhum acesso a `state.organization` ocorre antes dos dados.
- Falha de refresh depois de um estado válido: dados e rascunho do editor permanecem; erro é visível; recuperação posterior atualiza a versão sem substituir indevidamente a edição.
- Refresh serializado/coalescido, proteção de epoch e regras antigas normalizadas apenas em leitura.
- Salvamentos consecutivos de regra usam a versão confirmada; conflito 409 preserva rascunho e exige recarga explícita.
- Análise manual usa timeout de 60 s: o teste confirma que **45 s ainda não aborta** no frontend e **60 s aborta**; o limite de 45 s do backend não foi alterado.
- Preservação de credencial de câmera: mesmo host/porta após normalização, alteração de caminho/canal/stream permitida, nenhum usuário/senha no POST/GET/state, versão antiga 409, operador 403, cliente de outro local e outra empresa 404, configuração inexistente/credenciais ausentes 400 e CSRF inválido rejeitado. Host ou porta alterados com preservação são rejeitados mesmo quando o novo destino está autorizado; novas credenciais válidas continuam permitindo a troca.
- Player com chave única por instância e cleanup; nota salva sem finalizar ou pausar; CSV/filtros/paginação.

As APIs originais são JSON. Não foi acrescentado multipart: logo usa data URL JSON no contrato existente; fotografias e vídeos permanecem respostas autenticadas de mídia.

## Revisão focada posterior à exportação inicial

Sem repetir a suíte Node já aprovada, foram executados somente os testes afetados e as verificações de build:

- `bunx vitest run src/operational/OperationalApp.test.tsx src/operational/Health.test.tsx`: **7/7 testes aprovados em 2 arquivos**, 1,05 s.
- 409 ao salvar nota → recarregar ocorrência: versão/status/responsável avançam, a observação em edição permanece e o PATCH seguinte usa a nova versão.
- Claim, transferência e nota com escrita HTTP bem-sucedida e refresh 502: versão local avança uma vez pelo contrato original, a interface informa **“ação gravada; atualização pendente”** e não oferece repetir claim/transferência indevidamente.
- Salvamento geral de situação com PATCH gravado e GET falho também é distinguido; não é apresentado como mutação malsucedida.
- Troca de local durante preview e de dias durante prepare: abort por geração/escopo, `busy` liberado, resposta antiga ignorada, recibo/token antigo removido; execução posterior comprovou uso somente de `TOKEN-NOVO`.
- Tipagem aprovada e build operacional repetido byte a byte. Os hashes da tabela acima já correspondem a esta revisão; `index-rNh29Zb-.js` entrou no manifesto de remoção segura por ter sido substituído.

## Playwright da paridade anterior à revisão focada

Os percursos abaixo foram executados sobre o build anterior à revisão focada. A revisão posterior foi validada pelos testes de componente acima e por tipos/build; não se afirma repetição desses percursos no novo bundle.

### Admin e platformAdmin — 1280×1800

Percurso final aprovado, com banco novo:

1. Login admin sem concessão master; estado inicial e seis câmeras paginadas sem iniciar stream automaticamente.
2. Cadastro e renomeação de câmera; alteração de conexão preservando segredo; teste de conexão e JPEG de prévia pelo gateway fixture.
3. MediaSource reproduziu MP4 e foi encerrado; nenhum equipamento real foi usado.
4. Cliente comercial, local e usuário cliente criados sem senha padrão.
5. Regra completa salva duas vezes com versões confirmadas 2 e 3; área editada pelos campos; análise manual retornou pelo detector injetado.
6. Claim, transferência com motivo, nota sem finalizar, foto autenticada, download `.jpg`, histórico e CSV.
7. Diagnóstico e retenção preview/prepare/execute; uma foto antiga de ocorrência finalizada excluída somente no banco temporário; auditoria conferida.
8. Marca e prazos salvos; logout admin.
9. Login master; visão geral, criação de plano e parceira, branding versionado e licença por local; logout master.

Não houve pageerror ou violação de CSP. Os dois erros de console restantes foram respostas **401 esperadas** ao consultar sessão depois dos logouts. O 404 de favicon das execuções intermediárias foi removido por um ícone vazio declarativo; o percurso final não o apresentou.

### Operator e client — desktop e 390×844

Percurso final aprovado com outra fixture limpa:

- Operador não vê usuários/clientes administrativos; conta e sessões próprias continuam acessíveis, sem marca administrativa.
- Duas páginas na mesma sessão produziram **409 real** ao assumir a mesma ocorrência; a versão antiga não sobrescreveu a nova e a recarga explícita confirmou o responsável.
- Menu móvel abriu/fechou; tabelas mantiveram rolagem interna e o documento ficou com `scrollWidth = clientWidth = 390`.
- Cliente viu somente as três câmeras do próprio local; `GET /api/users` retornou **403**; não recebeu claim/transferência, mas manteve verificação permitida.
- Configurações de conta/sessões funcionaram no mobile; nenhuma página solicitou `/legado/` e nenhuma violação de CSP/pageerror ocorreu.

As capturas finais após a transição do menu confirmam sidebar fechada, conteúdo legível e ausência de overflow. As capturas intermediárias durante a animação não foram usadas como evidência visual final.

## O que as suítes cobrem além do navegador

A suíte Node cobre autenticação, primeira senha, cookies HttpOnly, CSRF/Origin, papéis, escopo empresa/local, versões, licenças, planos, master, retenção, stream e encerramento por logout/desativação. Também cobre limites **429** e respostas **502** controladas do gateway sem vazar mensagens do processo. Esses resultados não são apresentados como chamadas a equipamentos ou serviços externos.

## Limites declarados

- Não houve ensaio de cinco minutos do teste temporário, arraste por ponteiro da área ou upload de logo no Playwright; implementação e contratos foram revisados, mas esses gestos específicos não são reivindicados como validados visualmente.
- Ativação do serviço contínuo e salvamento de uma chave de IA não foram executados no browser, deliberadamente, para não iniciar trabalho externo; contratos existentes seguem cobertos no serviço.
- Windows, FFmpeg real, codecs/equipamentos específicos, HTTPS/proxy da instalação, desempenho prolongado, redes e credenciais privadas não foram validados.
- Não se conclui compatibilidade com Microsoft Defender a partir de ClamAV ou testes funcionais. O alerta `Trojan:Script/Ulthar.A!ml` da distribuição 0.43.0 permanece documentado e o ZIP suspenso.
- Nenhum ZIP/release foi criado ou modificado nesta tarefa; **0.44.0-dev.1** é identificação de fonte em desenvolvimento, não release comercial.


## Continuação da validação pelo GitHub

As últimas correções de player, sessão, foco, mosaico e salvamento foram concluídas em uma branch de desenvolvimento com CI, após o esgotamento dos créditos da Lovable. A primeira execução dessa revisão passou em 172 testes do serviço e 45 da interface; a tipagem identificou a opção de teste `exact` incompatível com consultas por papel, que foi removida sem alterar o comportamento testado. A execução subsequente é a referência para aprovação final, tipos e build em [VALIDACAO-CI-PARIDADE.md](VALIDACAO-CI-PARIDADE.md). Os assets compilados e seus hashes são registrados em [PARIDADE-ASSETS-CI.json](PARIDADE-ASSETS-CI.json); estes passam a ser o manifesto final, substituindo os hashes intermediários do desenvolvimento.

Os testes adicionais de componentes não são apresentados como repetição dos percursos Playwright ou ensaio de DVR real. O ZIP antigo, relatórios antivírus e suspensão de instalação permanecem preservados.
