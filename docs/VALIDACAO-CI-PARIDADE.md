# Validacao CI da interface operacional

Commit testado: 158811b4b52c2fe6dd5320c165d96ec23575631b

Servico, interface, tipos e build passaram no runner isolado. Nenhum DVR, chave privada ou API paga foi configurado. O ZIP 0.43.0 e a suspensao de seguranca permanecem inalterados.

Execucao: https://github.com/InvictusCorporation/monitoramento_inteligente/actions/runs/42624954337

## Testes do servico

```text
▶ Autenticação, isolamento e fluxos da API HTTP
  ✔ recusa acesso anônimo e não expõe arquivos do servidor (105.94107ms)
  ✔ senhas são derivadas, login inválido é genérico e cookies não expõem o hash (261.952738ms)
  ✔ protege mutações contra origem externa e CSRF ausente (4.693917ms)
  ✔ cadastros pertencem à empresa da sessão mesmo com org_id forjado (9.960654ms)
  ✔ cria contas limitadas e recusa vínculo com cliente de outra empresa (132.759896ms)
  ✔ cliente só lê e cadastra câmeras no próprio local; não eleva privilégios (8.46267ms)
  ✔ operador gerencia câmeras da empresa sem administrar usuários (4.256247ms)
  ✔ eventos têm isolamento, finalização justificada e controle de concorrência (7.655563ms)
  ✔ auditoria não mistura empresas e mudanças são registradas (5.110284ms)
  ✔ Renomear preserva vínculos e impede conflito e acesso a outro local/empresa (7.308758ms)
  ✔ desativação revoga sessões e impede novo login (39.463167ms)
  ✔ troca de senha revoga sessões e logout invalida o cookie (208.080314ms)
  ✔ Redefinição administrativa exige senha atual, isola empresa e revoga sessões sem reativar conta (639.24693ms)
  ✔ Cada conta consulta e encerra somente suas outras sessões com CSRF (148.033472ms)
  ✔ sessão expira após oito horas (2.035371ms)
  ✔ limite de tentativas de login é aplicado (462.897263ms)
✔ Autenticação, isolamento e fluxos da API HTTP (2248.371982ms)
✔ Banco persiste entre reinícios e a migração é idempotente (174.279167ms)
✔ Pausa valida categorias, preserva outras e interrompe captura quando todas estão pausadas (37.470956ms)
✔ Pausa descarta resultado iniciado antes de finalizar atendimento (5.447165ms)
✔ Finalização e pausa HTTP são atômicas, auditadas e protegidas por CSRF, versão e empresa (148.588309ms)
✔ IA protege chave, cria ocorrência, suprime repetição e respeita local, regra, horário e orçamento (11.787655ms)
✔ IA descarta resultados após mudança de regra e não cria ocorrência para ausência ou incerteza (10.654033ms)
✔ Veículos e animais usam o alvo da regra e geram título e imagem correspondentes (12.184765ms)
✔ Contrato da API restringe respostas ao alvo solicitado (3.272387ms)
✔ Categorias simultâneas geram uma ocorrência, uma foto e uma consulta por captura (11.988724ms)
✔ API múltipla exige resposta de cada categoria e envia só uma imagem (4.108888ms)
✔ Contrato OpenAI usa imagem recortada, JSON estrito, sem armazenamento e sem vazamento de erros (2.209319ms)
✔ Captura respeita limite próprio do gateway, valida JPEG e encerra processo no cancelamento (6.069278ms)
✔ Rotas IA exigem administrador para chave, CSRF e câmera autorizada sem devolver segredo (117.226641ms)
✔ aviso dura seis segundos, permite ajuste e silencia imediatamente sem sobrepor sons (3.480766ms)
✔ consulta normal agenda dois segundos e falhas recuam para dez sem sobreposição (60.142836ms)
✔ Fila toca apenas para novos registros e encerra polling ao sair, permitindo novo login (22.212489ms)
✔ alertas liberam consulta e áudio mesmo depois de desmontar a UI (2.309197ms)
✔ Central isola alertas, exige CSRF, registra um responsável e preserva finalização separada (176.601888ms)
✔ Configuração exige intervalo válido e começa desativada (1.896075ms)
✔ Cópia externa é verificada, não sobrescreve anteriores e recusa pastas da instalação (355.864984ms)
✔ Banco e chave de caminhos personalizados são os efetivamente copiados (18.76701ms)
✔ Agendamento respeita intervalo, persiste conclusão e lê desativação sem reiniciar (7.824824ms)
✔ Execuções não se sobrepõem e fechar o servidor cancela a cópia em andamento (5.970517ms)
✔ Falha não é sucesso e nova tentativa aguarda quinze minutos; configuração inválida não executa (6.560337ms)
✔ Processo filho executa uma cópia real de banco fictício e registra somente conclusão verificada (120.901095ms)
✔ Backup inclui commits WAL e chave, preserva origem e detecta alteração (36.467827ms)
✔ Backup recusa instalação incompleta sem criar um banco vazio (0.69387ms)
✔ cor clara/escura mantém contraste e logout remove a logo da sessão anterior (2.160717ms)
✔ marca valida cores e PNG limitado, rejeitando URLs, SVG e imagens grandes (1.801164ms)
✔ master personaliza parceira sem afetar outras empresas e controla edição concorrente (165.891842ms)
✔ MHDX 1208 produz os oito canais e ambos os fluxos, ignorando caminho adulterado (1.350885ms)
✔ MHDX 1208 rejeita canais, fluxos e modelos fora do perfil (0.598919ms)
✔ Perfil Intelbras mantém autorização por local; configuração manual continua disponível (0.234138ms)
✔ Duas contas têm tetos próprios; parar uma não encerra a outra e só libera após fechar o processo (8.03105ms)
✔ Capacidade possui limites explícitos e padrão de 8 vídeos mais 2 capturas (1.191969ms)
✔ 16 vídeos ocupados não bloqueiam duas capturas e cada grupo mantém seu teto (31.397503ms)
✔ Assumir atendimento preserva observação digitada, atualiza versão e não salva o rascunho (2.857371ms)
✔ Clientes e locais oferece criação separada e vínculo, com dados escapados (4.159293ms)
✔ Página master mostra licença e envia limite, módulo e versão sem expor imagens (2.660349ms)
✔ Cadastro de parceira revalida autorização e reverte se o registro de auditoria falhar (120.923743ms)
✔ Master cria parceira isolada, agrupa locais e controla licença no servidor (527.413764ms)
✔ Preservar credenciais exige mesmo destino e mantém autorização, versão e redação (632.275447ms)
✔ Intervalos de 10 e 15 segundos respeitam agenda, não sobrepõem análise e mantêm quota (43.708185ms)
✔ Intervalo curto não abre duas análises da mesma câmera durante processamento lento (17.08576ms)
✔ cadência bem-sucedida conta desde início sem somar processamento ao intervalo (9.955397ms)
✔ análise mais longa que intervalo não agenda no passado e erro mantém pausa desde término (9.151503ms)
✔ Serviço sem sessão ou navegador respeita intervalo, limite diário e retomada no próximo dia (14.560722ms)
✔ Recriar worker preserva agenda e configuração; horários e administrador inativo suspendem (8.946779ms)
✔ Desativar cancela resposta em andamento e evita evento; configuração exige versão e admin (9.464618ms)
✔ Falhas na API aguardam cinco minutos e trabalhos não se sobrepõem (9.003414ms)
✔ HTTP permite configuração apenas para admin com CSRF e devolve estado por empresa (152.059177ms)
✔ Fila atende canais adicionais sem ultrapassar duas análises simultâneas (15.625984ms)
✔ Formulário de prazos preserva desativação e envia números com versão lida (2.919313ms)
✔ Carregamento antigo dos prazos não substitui outro modal (1.99427ms)
✔ Prazo muda com atribuição, não com versão ou observação, e exclui finalizadas (1.627456ms)
✔ Prazos isolados por empresa, configuração administrativa, aviso ao responsável e administrador (213.089527ms)
✔ Diagnóstico distingue pausas, falhas, atraso e atividade sem afirmar câmera online (21.93022ms)
✔ Diagnóstico só lê câmeras autorizadas e não retorna credenciais, caminho RTSP ou foto (7.241158ms)
✔ Paginação cobre todas as linhas, ajusta página após filtro e mantém exportação completa (4.321655ms)
✔ Relatório inclui todo o último dia local e combina filtros sem alterar os eventos (0.904022ms)
✔ Fila combina responsável, abertas e ordenação sem modificar a fonte (0.989559ms)
✔ CSV usa somente seleção, escapa texto e neutraliza fórmulas (2.704935ms)
✔ Nome da evidência não permite caminhos ou injeção de cabeçalhos (1.317015ms)
✔ Download preserva bytes, exige sessão, isola locais/empresas e audita solicitação (104.131519ms)
✔ Evidência persiste no reinício e imagem inválida reverte a ocorrência inteira (199.33419ms)
✔ Migração do intervalo preserva configurações antigas, aceita 10/15 e reabre sem duplicação (268.671556ms)
▶ Primeiro acesso cria o ambiente uma única vez e guarda a configuração protegida
  ✔ exige token local e origem correta (54.785742ms)
  ✔ falhas de validação não deixam cadastros parciais (105.472865ms)
  ✔ cria conta, local e canal com senha derivada e segredo criptografado (144.338792ms)
  ✔ bloqueia a repetição da instalação (10.527671ms)
✔ Primeiro acesso cria o ambiente uma única vez e guarda a configuração protegida (393.752069ms)
✔ Token de instalação expira e primeiro acesso não pode ser exposto em produção (25.19038ms)
✔ master lista clientes sem local e locais sem vínculo sem criar cadastros automaticamente (2.720788ms)
✔ master tem entrada própria, troca para operação e mantém rota comercial anterior (1.149416ms)
✔ contas sem master não ganham rotas comerciais por hash (1.691921ms)
✔ resumo distingue câmeras cadastradas, parceiras e licenças pendentes (0.964182ms)
✔ trocar para master interrompe alertas e voltar retoma operação (1.417965ms)
✔ Resposta de salvamento antigo não fecha, limpa ou habilita formulário mais recente (4.553428ms)
✔ Salvamento atual conclui e atualiza; erro atual permanece no formulário (0.978613ms)
▶ SPA operacional no servidor real: segurança, atendimento e persistência
  ✔ assets externes, CSP estrita e nenhuma API desconhecida vira HTML (34.424895ms)
  ✔ login, CSRF, state e isolamento por empresa/local (118.483061ms)
  ✔ leitura de JSON antigo não migra silenciosamente; observação persiste sem finalizar ou pausar (28.882619ms)
  ✔ claim, nota obrigatória, conflito e finalização sem pausa implícita (24.305124ms)
  ✔ pausa/reativação atômica preserva regra e persiste no SQLite (28.376683ms)
  ✔ sessão expirada é 401, nunca dados privados ou HTML (3.369834ms)
✔ SPA operacional no servidor real: segurança, atendimento e persistência (685.031061ms)
✔ static build recusa symlinks (6.488819ms)
✔ Regras antigas preservam pessoas e novos alvos são validados (18.311409ms)
✔ Seleção múltipla preserva combinações e rejeita seleção vazia, repetida ou desconhecida (3.393938ms)
✔ Horários noturnos, limites de intervalo, dias e fuso do local (2.877571ms)
✔ Regras HTTP isoladas por local, permissões, CSRF e concorrência (155.331053ms)
✔ Mosaico pagina câmeras, respeita capacidade e não renderiza vídeos fora da página (4.633867ms)
✔ catálogo descarta respostas antigas e envia versão ao editar sem alterar licenças (4.083592ms)
✔ seleção de catálogo envia identidade e versão, mantendo condições personalizadas disponíveis (1.741915ms)
✔ catálogo master isolado, versionado e aplicado como condições fixas da licença (170.803478ms)
✔ Players independentes são encerrados por chave ou ao sair da página (4.510305ms)
✔ Prévia usa imagem inteira sem IA, restringe acesso e descarta captura após alteração da conexão (134.74654ms)
✔ Falhas temporárias usam espera crescente e parar cancela a reconexão pendente (5.416047ms)
✔ Entrada tardia começa no trecho disponível mesmo quando a distância é menor que oito segundos (2.12442ms)
✔ Sem sessão, sem permissão ou sem capacidade não dispara reconexões automáticas (5.269607ms)
✔ Fluxo longo encerrado renova conexão sem esgotar tentativas de falha (2.231636ms)
✔ Recuperação conserva fotos e credenciais, pausa apenas a cópia e inclui capacidade (82.004694ms)
✔ Backup antigo de formato 1 continua recuperável sem inventar capacidade (59.884224ms)
✔ Alteração de arquivo ou formato desconhecido não gera recuperação concluída (41.077442ms)
✔ Chave incompatível é recusada mesmo quando o hash foi atualizado (76.779439ms)
✔ Banco futuro é recusado sem substituir instalação (86.872591ms)
✔ Backup recusa capacity.json inválido (155.990696ms)
✔ Recuperação recusa transações WAL externas e nomes inesperados no manifesto (86.498825ms)
✔ interface calcula prévia sem excluir e exige abrir confirmação separada (19.076999ms)
✔ limpeza preserva abertas/recentes/outra empresa, detecta alterações e registra exclusão uma única vez (9.132306ms)
✔ prévia expira, autorização é revalidada e falha de auditoria reverte todas as exclusões (4.320417ms)
✔ lote limitado a 500 fotos exige nova prévia para as restantes (30.007301ms)
✔ HTTP exige administrador e CSRF, mantém ocorrência e informa foto removida (127.925878ms)
✔ Simulação conta somente fotos antigas finalizadas, isola local e não modifica dados (5.315512ms)
✔ Modelo mantém versão de destino, desabilita análise e redefine área sem alterar origem (19.117935ms)
✔ Conexão padrão atravessa seis minutos sem renovação forçada e ainda encerra por revogação (9.934436ms)
✔ Vídeo sintético real do FFmpeg mantém quatro fragmentos íntegros com leitura fracionada (139.445603ms)
✔ Parser recompõe cabeçalhos divididos e entrega somente fragmentos completos (1.171693ms)
✔ Duas contas usam um processo; entrada tardia recebe inicialização e próximo fragmento (20.832235ms)
✔ Revogação individual não encerra outra conta; configuração encerra ambas (40.487198ms)
✔ Empresa, local, câmera, versão e configuração nunca compartilham produtor diferente (3.509232ms)
✔ Limites contam visualizações mesmo quando há um único processo (1.671339ms)
✔ Consumidor lento é encerrado sem travar a entrega para outro (11.364973ms)
✔ Vídeo inválido rejeita todos os interessados e libera o processo (13.112677ms)
✔ Cancelar antes do primeiro quadro e renovar por tempo encerram todos os recursos (121.896815ms)
✔ Transferir preserva rascunho e status, usa versão e não salva a verificação (4.797205ms)
✔ Resposta de transferência antiga não fecha nem altera um novo formulário (0.948819ms)
✔ Falha ao consultar estado após transferir mantém rascunho visível e evita reenviar (1.136166ms)
Falha interna na requisição: ERR_SQLITE_ERROR
✔ Transferência aplica escopo, responsável, destinatário, conflito, auditoria e alerta individual (145.807794ms)
✔ Criptografia vincula o segredo à câmera e à empresa (2.853241ms)
✔ Chave é persistida e não é recriada quando há conexões existentes (1.035031ms)
✔ Destinos são validados por local; protocolos e argumentos ficam limitados (5.952161ms)
✔ Gateway limita processos, interrompe por revogação e libera a capacidade (57.573491ms)
✔ Mosaico permite quatro canais, bloqueia duplicatas e libera todos ao sair (37.521273ms)
✔ Gateway falha de modo controlado sem mídia e sem expor mensagens do processo (31.0289ms)
▶ Integração HTTP com VideoGateway
  ✔ salva criptografado e devolve somente metadados redigidos (6.098851ms)
  ✔ não permite obter, alterar, testar ou assistir câmeras de outra empresa (7.698937ms)
  ✔ cliente configura o próprio local e operador apenas consulta (143.270706ms)
  ✔ controle de versão, desabilitação e validação de destino são aplicados (6.001607ms)
  ✔ teste de conexão finaliza o processo e registra auditoria (14.16892ms)
  ✔ vídeo exige CSRF e é encerrado quando o usuário sai (16.841547ms)
  ✔ desativar usuário encerra sua transmissão já aberta (51.080976ms)
  ✔ fechar o player encerra o processo; configuração também encerra transmissão (72.198809ms)
✔ Integração HTTP com VideoGateway (579.288517ms)
▶ Integração HTTP com SharedVideoGateway
  ✔ salva criptografado e devolve somente metadados redigidos (3.431233ms)
  ✔ não permite obter, alterar, testar ou assistir câmeras de outra empresa (4.620819ms)
  ✔ cliente configura o próprio local e operador apenas consulta (131.69168ms)
  ✔ controle de versão, desabilitação e validação de destino são aplicados (5.171756ms)
  ✔ teste de conexão finaliza o processo e registra auditoria (13.59649ms)
  ✔ vídeo exige CSRF e é encerrado quando o usuário sai (18.24549ms)
  ✔ desativar usuário encerra sua transmissão já aberta (53.034816ms)
  ✔ fechar o player encerra o processo; configuração também encerra transmissão (77.031422ms)
  ✔ sair de uma sessão preserva o HTTP do outro operador (83.132197ms)
✔ Integração HTTP com SharedVideoGateway (3529.594352ms)
✔ servidor entrega todos os scripts e estilos usados pela página inicial (102.806389ms)
ℹ tests 172
ℹ suites 0
ℹ pass 172
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8825.439711

```

## Testes da interface

```text

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.11 [39m[90m/home/runner/work/monitoramento_inteligente/monitoramento_inteligente/interface[39m

 [32m✓[39m src/operational/api.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/operational/OperationalApp.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 399[2mms[22m[39m
 [32m✓[39m src/operational/OperationalAppSession.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[33m 458[2mms[22m[39m
 [32m✓[39m src/operational/Health.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 162[2mms[22m[39m
 [32m✓[39m src/operational/reports.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/lib/detection-logic.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 6[2mms[22m[39m
 [32m✓[39m src/operational/Cameras.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 245[2mms[22m[39m
 [32m✓[39m src/test/app-routing.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m

[2m Test Files [22m [1m[32m8 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[32m39 passed[39m[22m[90m (39)[39m
[2m   Start at [22m 13:23:10
[2m   Duration [22m 3.01s[2m (transform 703ms, setup 877ms, import 1.59s, tests 1.31s, environment 2.83s)[22m


```
