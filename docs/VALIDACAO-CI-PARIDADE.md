# Validacao CI da interface operacional

Commit testado: 36f406f12479f8599dfc61bdcd2582dc6eb39a74

Servico, interface, tipos e build passaram no runner isolado. Nenhum DVR, chave privada ou API paga foi configurado. O ZIP 0.43.0 e a suspensao de seguranca permanecem inalterados.

Execucao: https://github.com/InvictusCorporation/monitoramento_inteligente/actions/runs/42625735994

## Testes do servico

```text
▶ Autenticação, isolamento e fluxos da API HTTP
  ✔ recusa acesso anônimo e não expõe arquivos do servidor (187.039833ms)
  ✔ senhas são derivadas, login inválido é genérico e cookies não expõem o hash (246.638547ms)
  ✔ protege mutações contra origem externa e CSRF ausente (4.151762ms)
  ✔ cadastros pertencem à empresa da sessão mesmo com org_id forjado (10.116786ms)
  ✔ cria contas limitadas e recusa vínculo com cliente de outra empresa (137.386198ms)
  ✔ cliente só lê e cadastra câmeras no próprio local; não eleva privilégios (9.11192ms)
  ✔ operador gerencia câmeras da empresa sem administrar usuários (4.225663ms)
  ✔ eventos têm isolamento, finalização justificada e controle de concorrência (8.704523ms)
  ✔ auditoria não mistura empresas e mudanças são registradas (4.617447ms)
  ✔ Renomear preserva vínculos e impede conflito e acesso a outro local/empresa (6.95662ms)
  ✔ desativação revoga sessões e impede novo login (34.241143ms)
  ✔ troca de senha revoga sessões e logout invalida o cookie (156.916592ms)
  ✔ Redefinição administrativa exige senha atual, isola empresa e revoga sessões sem reativar conta (446.199776ms)
  ✔ Cada conta consulta e encerra somente suas outras sessões com CSRF (114.512915ms)
  ✔ sessão expira após oito horas (0.956735ms)
  ✔ limite de tentativas de login é aplicado (391.477514ms)
✔ Autenticação, isolamento e fluxos da API HTTP (2273.944077ms)
✔ Banco persiste entre reinícios e a migração é idempotente (1065.966241ms)
✔ Pausa valida categorias, preserva outras e interrompe captura quando todas estão pausadas (377.918441ms)
✔ Pausa descarta resultado iniciado antes de finalizar atendimento (8.752174ms)
✔ Finalização e pausa HTTP são atômicas, auditadas e protegidas por CSRF, versão e empresa (220.759658ms)
✔ IA protege chave, cria ocorrência, suprime repetição e respeita local, regra, horário e orçamento (9.049387ms)
✔ IA descarta resultados após mudança de regra e não cria ocorrência para ausência ou incerteza (6.939304ms)
✔ Veículos e animais usam o alvo da regra e geram título e imagem correspondentes (7.877251ms)
✔ Contrato da API restringe respostas ao alvo solicitado (1.252936ms)
✔ Categorias simultâneas geram uma ocorrência, uma foto e uma consulta por captura (9.231137ms)
✔ API múltipla exige resposta de cada categoria e envia só uma imagem (1.160448ms)
✔ Contrato OpenAI usa imagem recortada, JSON estrito, sem armazenamento e sem vazamento de erros (1.293877ms)
✔ Captura respeita limite próprio do gateway, valida JPEG e encerra processo no cancelamento (10.703139ms)
✔ Rotas IA exigem administrador para chave, CSRF e câmera autorizada sem devolver segredo (76.530451ms)
✔ aviso dura seis segundos, permite ajuste e silencia imediatamente sem sobrepor sons (3.474925ms)
✔ consulta normal agenda dois segundos e falhas recuam para dez sem sobreposição (350.704804ms)
✔ Fila toca apenas para novos registros e encerra polling ao sair, permitindo novo login (24.093641ms)
✔ alertas liberam consulta e áudio mesmo depois de desmontar a UI (1.742755ms)
✔ Central isola alertas, exige CSRF, registra um responsável e preserva finalização separada (128.781303ms)
✔ Configuração exige intervalo válido e começa desativada (1.525752ms)
✔ Cópia externa é verificada, não sobrescreve anteriores e recusa pastas da instalação (154.050704ms)
✔ Banco e chave de caminhos personalizados são os efetivamente copiados (11.077937ms)
✔ Agendamento respeita intervalo, persiste conclusão e lê desativação sem reiniciar (521.933992ms)
✔ Execuções não se sobrepõem e fechar o servidor cancela a cópia em andamento (4.843002ms)
✔ Falha não é sucesso e nova tentativa aguarda quinze minutos; configuração inválida não executa (6.602142ms)
✔ Processo filho executa uma cópia real de banco fictício e registra somente conclusão verificada (64.455809ms)
✔ Backup inclui commits WAL e chave, preserva origem e detecta alteração (153.005969ms)
✔ Backup recusa instalação incompleta sem criar um banco vazio (0.984166ms)
✔ cor clara/escura mantém contraste e logout remove a logo da sessão anterior (1.66516ms)
✔ marca valida cores e PNG limitado, rejeitando URLs, SVG e imagens grandes (1.451802ms)
✔ master personaliza parceira sem afetar outras empresas e controla edição concorrente (131.431088ms)
✔ MHDX 1208 produz os oito canais e ambos os fluxos, ignorando caminho adulterado (1.290471ms)
✔ MHDX 1208 rejeita canais, fluxos e modelos fora do perfil (0.551621ms)
✔ Perfil Intelbras mantém autorização por local; configuração manual continua disponível (0.22105ms)
✔ Duas contas têm tetos próprios; parar uma não encerra a outra e só libera após fechar o processo (6.026195ms)
✔ Capacidade possui limites explícitos e padrão de 8 vídeos mais 2 capturas (1.150573ms)
✔ 16 vídeos ocupados não bloqueiam duas capturas e cada grupo mantém seu teto (31.16407ms)
✔ Assumir atendimento preserva observação digitada, atualiza versão e não salva o rascunho (2.7727ms)
✔ Clientes e locais oferece criação separada e vínculo, com dados escapados (3.787781ms)
✔ Página master mostra licença e envia limite, módulo e versão sem expor imagens (2.070954ms)
✔ Cadastro de parceira revalida autorização e reverte se o registro de auditoria falhar (92.118424ms)
✔ Master cria parceira isolada, agrupa locais e controla licença no servidor (432.534816ms)
✔ Preservar credenciais exige mesmo destino e mantém autorização, versão e redação (525.409267ms)
✔ Intervalos de 10 e 15 segundos respeitam agenda, não sobrepõem análise e mantêm quota (30.917403ms)
✔ Intervalo curto não abre duas análises da mesma câmera durante processamento lento (9.676751ms)
✔ cadência bem-sucedida conta desde início sem somar processamento ao intervalo (6.859916ms)
✔ análise mais longa que intervalo não agenda no passado e erro mantém pausa desde término (6.102428ms)
✔ Serviço sem sessão ou navegador respeita intervalo, limite diário e retomada no próximo dia (8.683132ms)
✔ Recriar worker preserva agenda e configuração; horários e administrador inativo suspendem (6.460331ms)
✔ Desativar cancela resposta em andamento e evita evento; configuração exige versão e admin (6.400281ms)
✔ Falhas na API aguardam cinco minutos e trabalhos não se sobrepõem (6.297228ms)
✔ HTTP permite configuração apenas para admin com CSRF e devolve estado por empresa (89.164505ms)
✔ Fila atende canais adicionais sem ultrapassar duas análises simultâneas (11.708166ms)
✔ Formulário de prazos preserva desativação e envia números com versão lida (2.133257ms)
✔ Carregamento antigo dos prazos não substitui outro modal (1.360576ms)
✔ Prazo muda com atribuição, não com versão ou observação, e exclui finalizadas (1.359164ms)
✔ Prazos isolados por empresa, configuração administrativa, aviso ao responsável e administrador (141.319345ms)
✔ Diagnóstico distingue pausas, falhas, atraso e atividade sem afirmar câmera online (13.81956ms)
✔ Diagnóstico só lê câmeras autorizadas e não retorna credenciais, caminho RTSP ou foto (6.710614ms)
✔ Paginação cobre todas as linhas, ajusta página após filtro e mantém exportação completa (3.060147ms)
✔ Relatório inclui todo o último dia local e combina filtros sem alterar os eventos (0.535918ms)
✔ Fila combina responsável, abertas e ordenação sem modificar a fonte (0.573915ms)
✔ CSV usa somente seleção, escapa texto e neutraliza fórmulas (0.414427ms)
✔ Nome da evidência não permite caminhos ou injeção de cabeçalhos (1.303231ms)
✔ Download preserva bytes, exige sessão, isola locais/empresas e audita solicitação (89.434597ms)
✔ Evidência persiste no reinício e imagem inválida reverte a ocorrência inteira (369.714393ms)
✔ Migração do intervalo preserva configurações antigas, aceita 10/15 e reabre sem duplicação (248.275515ms)
▶ Primeiro acesso cria o ambiente uma única vez e guarda a configuração protegida
  ✔ exige token local e origem correta (30.33163ms)
  ✔ falhas de validação não deixam cadastros parciais (70.409926ms)
  ✔ cria conta, local e canal com senha derivada e segredo criptografado (99.052631ms)
  ✔ bloqueia a repetição da instalação (4.286434ms)
✔ Primeiro acesso cria o ambiente uma única vez e guarda a configuração protegida (259.407363ms)
✔ Token de instalação expira e primeiro acesso não pode ser exposto em produção (12.624861ms)
✔ master lista clientes sem local e locais sem vínculo sem criar cadastros automaticamente (2.613713ms)
✔ master tem entrada própria, troca para operação e mantém rota comercial anterior (1.110384ms)
✔ contas sem master não ganham rotas comerciais por hash (1.711548ms)
✔ resumo distingue câmeras cadastradas, parceiras e licenças pendentes (0.94053ms)
✔ trocar para master interrompe alertas e voltar retoma operação (1.454736ms)
✔ Resposta de salvamento antigo não fecha, limpa ou habilita formulário mais recente (3.75393ms)
✔ Salvamento atual conclui e atualiza; erro atual permanece no formulário (0.949484ms)
▶ SPA operacional no servidor real: segurança, atendimento e persistência
  ✔ assets externes, CSP estrita e nenhuma API desconhecida vira HTML (14.956854ms)
  ✔ login, CSRF, state e isolamento por empresa/local (153.466024ms)
  ✔ leitura de JSON antigo não migra silenciosamente; observação persiste sem finalizar ou pausar (251.406828ms)
  ✔ claim, nota obrigatória, conflito e finalização sem pausa implícita (14.257202ms)
  ✔ pausa/reativação atômica preserva regra e persiste no SQLite (10.452166ms)
  ✔ sessão expirada é 401, nunca dados privados ou HTML (1.911917ms)
✔ SPA operacional no servidor real: segurança, atendimento e persistência (1198.332903ms)
✔ static build recusa symlinks (5.231151ms)
✔ Regras antigas preservam pessoas e novos alvos são validados (16.482336ms)
✔ Seleção múltipla preserva combinações e rejeita seleção vazia, repetida ou desconhecida (1.325874ms)
✔ Horários noturnos, limites de intervalo, dias e fuso do local (2.029152ms)
✔ Regras HTTP isoladas por local, permissões, CSRF e concorrência (124.709018ms)
✔ Mosaico pagina câmeras, respeita capacidade e não renderiza vídeos fora da página (3.835191ms)
✔ catálogo descarta respostas antigas e envia versão ao editar sem alterar licenças (2.79368ms)
✔ seleção de catálogo envia identidade e versão, mantendo condições personalizadas disponíveis (1.47058ms)
✔ catálogo master isolado, versionado e aplicado como condições fixas da licença (193.163282ms)
✔ Players independentes são encerrados por chave ou ao sair da página (4.350529ms)
✔ Prévia usa imagem inteira sem IA, restringe acesso e descarta captura após alteração da conexão (134.026724ms)
✔ Falhas temporárias usam espera crescente e parar cancela a reconexão pendente (4.728632ms)
✔ Entrada tardia começa no trecho disponível mesmo quando a distância é menor que oito segundos (1.520294ms)
✔ Sem sessão, sem permissão ou sem capacidade não dispara reconexões automáticas (4.912095ms)
✔ Fluxo longo encerrado renova conexão sem esgotar tentativas de falha (2.610548ms)
✔ Recuperação conserva fotos e credenciais, pausa apenas a cópia e inclui capacidade (535.776326ms)
✔ Backup antigo de formato 1 continua recuperável sem inventar capacidade (36.961296ms)
✔ Alteração de arquivo ou formato desconhecido não gera recuperação concluída (39.07434ms)
✔ Chave incompatível é recusada mesmo quando o hash foi atualizado (228.724648ms)
✔ Banco futuro é recusado sem substituir instalação (198.970022ms)
✔ Backup recusa capacity.json inválido (31.898307ms)
✔ Recuperação recusa transações WAL externas e nomes inesperados no manifesto (134.778905ms)
✔ interface calcula prévia sem excluir e exige abrir confirmação separada (12.40287ms)
✔ limpeza preserva abertas/recentes/outra empresa, detecta alterações e registra exclusão uma única vez (11.149223ms)
✔ prévia expira, autorização é revalidada e falha de auditoria reverte todas as exclusões (3.222549ms)
✔ lote limitado a 500 fotos exige nova prévia para as restantes (21.361702ms)
✔ HTTP exige administrador e CSRF, mantém ocorrência e informa foto removida (96.819384ms)
✔ Simulação conta somente fotos antigas finalizadas, isola local e não modifica dados (4.149239ms)
✔ Modelo mantém versão de destino, desabilita análise e redefine área sem alterar origem (14.423269ms)
✔ Conexão padrão atravessa seis minutos sem renovação forçada e ainda encerra por revogação (6.005122ms)
✔ Vídeo sintético real do FFmpeg mantém quatro fragmentos íntegros com leitura fracionada (90.370461ms)
✔ Parser recompõe cabeçalhos divididos e entrega somente fragmentos completos (0.897108ms)
✔ Duas contas usam um processo; entrada tardia recebe inicialização e próximo fragmento (19.494459ms)
✔ Revogação individual não encerra outra conta; configuração encerra ambas (41.094419ms)
✔ Empresa, local, câmera, versão e configuração nunca compartilham produtor diferente (2.72221ms)
✔ Limites contam visualizações mesmo quando há um único processo (6.405276ms)
✔ Consumidor lento é encerrado sem travar a entrega para outro (10.923016ms)
✔ Vídeo inválido rejeita todos os interessados e libera o processo (11.24665ms)
✔ Cancelar antes do primeiro quadro e renovar por tempo encerram todos os recursos (121.228516ms)
✔ Transferir preserva rascunho e status, usa versão e não salva a verificação (3.404662ms)
✔ Resposta de transferência antiga não fecha nem altera um novo formulário (0.760422ms)
✔ Falha ao consultar estado após transferir mantém rascunho visível e evita reenviar (0.814636ms)
Falha interna na requisição: ERR_SQLITE_ERROR
✔ Transferência aplica escopo, responsável, destinatário, conflito, auditoria e alerta individual (135.901401ms)
✔ Criptografia vincula o segredo à câmera e à empresa (2.810117ms)
✔ Chave é persistida e não é recriada quando há conexões existentes (0.846155ms)
✔ Destinos são validados por local; protocolos e argumentos ficam limitados (5.732079ms)
✔ Gateway limita processos, interrompe por revogação e libera a capacidade (55.707682ms)
✔ Mosaico permite quatro canais, bloqueia duplicatas e libera todos ao sair (34.83444ms)
✔ Gateway falha de modo controlado sem mídia e sem expor mensagens do processo (31.158336ms)
▶ Integração HTTP com VideoGateway
  ✔ salva criptografado e devolve somente metadados redigidos (8.123304ms)
  ✔ não permite obter, alterar, testar ou assistir câmeras de outra empresa (9.434072ms)
  ✔ cliente configura o próprio local e operador apenas consulta (135.837188ms)
  ✔ controle de versão, desabilitação e validação de destino são aplicados (5.489562ms)
  ✔ teste de conexão finaliza o processo e registra auditoria (12.427054ms)
  ✔ vídeo exige CSRF e é encerrado quando o usuário sai (15.643282ms)
  ✔ desativar usuário encerra sua transmissão já aberta (48.21351ms)
  ✔ fechar o player encerra o processo; configuração também encerra transmissão (69.36369ms)
✔ Integração HTTP com VideoGateway (553.145399ms)
▶ Integração HTTP com SharedVideoGateway
  ✔ salva criptografado e devolve somente metadados redigidos (3.051475ms)
  ✔ não permite obter, alterar, testar ou assistir câmeras de outra empresa (4.609634ms)
  ✔ cliente configura o próprio local e operador apenas consulta (129.490399ms)
  ✔ controle de versão, desabilitação e validação de destino são aplicados (4.601092ms)
  ✔ teste de conexão finaliza o processo e registra auditoria (13.47646ms)
  ✔ vídeo exige CSRF e é encerrado quando o usuário sai (15.998616ms)
  ✔ desativar usuário encerra sua transmissão já aberta (47.761208ms)
  ✔ fechar o player encerra o processo; configuração também encerra transmissão (70.406732ms)
  ✔ sair de uma sessão preserva o HTTP do outro operador (78.286857ms)
✔ Integração HTTP com SharedVideoGateway (3496.265466ms)
✔ servidor entrega todos os scripts e estilos usados pela página inicial (85.417377ms)
ℹ tests 172
ℹ suites 0
ℹ pass 172
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9299.897396

```

## Testes da interface

```text

[1m[30m[46m RUN [49m[39m[22m [36mv4.1.11 [39m[90m/home/runner/work/monitoramento_inteligente/monitoramento_inteligente/interface[39m

 [32m✓[39m src/operational/api.test.ts [2m([22m[2m11 tests[22m[2m)[22m[32m 22[2mms[22m[39m
 [32m✓[39m src/operational/OperationalApp.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 441[2mms[22m[39m
 [32m✓[39m src/operational/FinalRegression.test.tsx [2m([22m[2m6 tests[22m[2m)[22m[33m 633[2mms[22m[39m
   [33m[2m✓[22m[39m 401 do player do diálogo encerra sessão e remove dados privados [33m 307[2mms[22m[39m
 [32m✓[39m src/operational/OperationalAppSession.test.tsx [2m([22m[2m2 tests[22m[2m)[22m[33m 428[2mms[22m[39m
 [32m✓[39m src/lib/detection-logic.test.ts [2m([22m[2m7 tests[22m[2m)[22m[32m 8[2mms[22m[39m
 [32m✓[39m src/operational/Health.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 146[2mms[22m[39m
 [32m✓[39m src/operational/reports.test.ts [2m([22m[2m10 tests[22m[2m)[22m[32m 10[2mms[22m[39m
 [32m✓[39m src/operational/Cameras.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 212[2mms[22m[39m
 [32m✓[39m src/test/app-routing.test.tsx [2m([22m[2m1 test[22m[2m)[22m[32m 6[2mms[22m[39m

[2m Test Files [22m [1m[32m9 passed[39m[22m[90m (9)[39m
[2m      Tests [22m [1m[32m45 passed[39m[22m[90m (45)[39m
[2m   Start at [22m 13:28:28
[2m   Duration [22m 3.36s[2m (transform 724ms, setup 986ms, import 1.89s, tests 1.91s, environment 3.20s)[22m


```
