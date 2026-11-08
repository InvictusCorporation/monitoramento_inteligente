# INVICTUS — integração operacional

## Entrega e arquitetura

Release **0.43.0**, baseada no motor original 0.42.0 preservado em Node: autenticação, cookies, CSRF, SQLite, licenças, IA e gateways existentes não foram reconstruídos. A nova entrada SPA usa React, a identidade, o Button e os tokens CSS aprovados, sem importar o motor no navegador ou no Worker. A prévia TanStack da Lovable permanece demonstrativa e inalterada nas suas telas.

- Fontes operacionais: `interface/operational/`, `interface/src/operational/` e `interface/vite.operational.config.ts` no GitHub; nesta árvore Lovable, `interface/` é a raiz atual.
- Distribuição pré-compilada: `servico/dist/interface/index.html` e `assets/`. Não é necessário recompilar a cada início.
- Node: `createApp({modernUiRoot})` habilita explicitamente a interface moderna em `/` e `/interface/`; sem opção, a raiz continua no modo original. `/legado/` mantém a interface original, com a mesma sessão e API. O player e os alertas originais continuam em rotas permitidas.
- Assets: allowlist de extensões/nomes no build, rejeição de symlinks, bytes carregados no início, nenhuma leitura arbitrária de dados ou fontes; APIs desconhecidas continuam JSON 404, sem fallback HTML. CSP não recebeu `unsafe-inline`, `unsafe-eval`, CORS ou alterações de Origin.

## Fluxos adaptados

- Login empresa/e-mail/senha, restauração por `/api/session`, CSRF em escritas, logout e troca inicial por `/api/password` (revoga sessão e exige novo login). Sem conta padrão ou credencial no frontend.
- `/api/state`: IDs string, clientes comerciais (`customers`) separados dos locais (`clients`), filtro de locais e busca, permissões/`platformAdmin` vindas do servidor. Falha remove dados carregados e mostra erro, nunca dados demo.
- Vídeo iniciado explicitamente por `POST /api/cameras/:id/live` com o MediaSource original; cleanup ao mudar/fechar/sair. Sem reinício artificial em cinco minutos, sem análise IA para mostrar imagens. Limites/429/502 permanecem do servidor. Foto de ocorrência autenticada por `/image`, convertida em data URL para cumprir a CSP de imagens, e descartada ao fechar.
- Claim pelo POST original preserva o rascunho e atualiza a versão confirmada. **Salvar observação** envia PATCH com status atual, nota explícita e versão, sem finalizar ou pausar. Finalização exige nota; recarga após sucesso e conflito visível. Histórico real. Finalização normal não pausa detecção.
- Categorias nas regras existentes: Não selecionado / Detectar / Pausado; demais campos, área, dias, fuso, nome e versão preservados. Operador não usa o POST de regra. Ação de atendimento `pause:*` explicitamente finaliza com nota e bloqueia novos alvos; `resume:*` reativa pelo contrato existente. Não cria regras ou pausas padrão.
- Intervalo **por empresa**: 10/15/30 segundos, mantendo enabled/cooldown/quota/version existentes. Não ativa IA ou monitoramento automaticamente. Configuração completa, conexão, locais/clientes, usuários, transferências, backup e diagnóstico continuam em **Configurações avançadas**, na UI original autenticada.
- Alertas reais `/api/alerts` com polling original sem sobreposição, som por ação do usuário e limpeza ao sair. Ajuste mínimo no `stop()` original permite desmontagem React sem nó DOM. Master é somente para `platformAdmin`, com empresas/locais/licenças/planos reais; alterações avançadas no legado, sem persistência simulada.

## Compilar

Requisitos para compilação: **Bun** com lockfile, dependências Vite/React já declaradas; versão instalada validada Vite **8.1.5**. Node **24 ou superior** para executar/testar o motor, SQLite nativo e FFmpeg com H.264/libx264 para vídeo real. Windows usa os iniciadores originais para preparar/verificar FFmpeg.

No GitHub:

```sh
cd interface
bun install --frozen-lockfile
bun run build:operational
```

A configuração detecta tanto a árvore Lovable (servico dentro da raiz) quanto a árvore GitHub (interface e servico irmãos). `COMPILAR-INTEGRADO.cmd` fornece a mesma preparação no Windows. A configuração Vite/TanStack padrão não foi substituída nem recebeu plugins duplicados.

## Iniciar

**Windows local:** no repositório completo, executar `INICIAR-INTEGRADO.cmd` na raiz. No ZIP de atualização (conteúdo do serviço na raiz), executar o `INICIAR-INTEGRADO.cmd` da própria pasta de instalação. Ambos conferem o build, definem `INVICTUS_UI=modern` e chamam o `INICIAR-INVICTUS.cmd` original, que continua útil sem modificações. A atualização reutiliza a conta e os cadastros existentes; não criar instalação vazia nem recadastrar câmeras. A pasta `data/` deve ser gravável pelo serviço.

**Node (Linux ou outra instalação configurada):**

```sh
cd servico
npm run start:modern
```

Usa as variáveis originais: `APP_ORIGIN`, `HOST`, `PORT`, `DB_PATH`, `CAMERA_KEY_PATH`, `CAMERA_ALLOWED_ENDPOINTS`, `FFMPEG_PATH`, `NODE_ENV`. Não colocar valores privados na interface ou no Git. Sem configuração de vídeo, a central informa indisponibilidade em vez de mostrar imagens demo.

Produção exige `NODE_ENV=production`, `APP_ORIGIN` HTTPS e **UI e /api na mesma origem**, com proxy reverso restrito à instalação, cookies e Origin coerentes. Node permanece fora da hospedagem Worker da Lovable. Nada foi publicado.

## Atualizar sem perder instalação

Encerrar o programa e o processo Node; fazer **backup completo da pasta de instalação atual** e usar também o procedimento original de backup. Extrair `invictus-integrado-0.43.0.zip` em uma pasta temporária e copiar seu conteúdo na **MESMA pasta da instalação existente**, substituindo somente os arquivos de programa. Preservar **data/, .tools/, backups/, restauracoes/, camera.key, .env privado e configurações existentes**; nunca substituir banco/chave com fixtures nem usar sincronização que apague arquivos ausentes no ZIP. Iniciar por `INICIAR-INTEGRADO.cmd` e conferir versão **0.43.0** e os mesmos locais/câmeras em Configurações avançadas (diagnóstico); a versão também consta de `GET /api/state` autenticado em `installation.version`. Se a conta ou os locais sumirem, parar e verificar se a pasta/banco configurado é o original; não recadastrar.

O ZIP inclui o build operacional pronto; **Bun não é necessário no computador do usuário** para iniciar. Requisitos de execução continuam Node >=24 e FFmpeg com libx264 (ou runtime original já preparado). Alterações nas fontes da interface exigem recompilar antes de distribuir; assets são carregados no início, por isso reiniciar depois de atualizá-los. O manifesto integrado contém fontes e assets, não dados de instalação. Veja também `servico/ATUALIZAR-INTEGRADO.md`, incluído na raiz do ZIP.

## Validação real realizada

- Revisão final 0.43.0: Node **24.22.2**, `node --test servico/tests/*.test.mjs`: **171/171 aprovados**, 0 falhas/cancelados/ignorados, aproximadamente 5,52 s. Inclui os **162 originais** e 9 adicionais; HTTP/SQLite temporário, segurança, persistência de observação sem finalização/pausa e leitura antiga sem migração silenciosa.
- `bunx vitest run`: **21/21 aprovados**, 4 arquivos, aproximadamente 0,90 s. Inclui os 8 anteriores, contratos operacionais e novas regressões de formatos antigos, leitura concorrente, dois salvamentos, rascunho, conflito real e chaves/cleanup de player.
- `bunx -p @typescript/native-preview tsgo -b --noEmit`: exit 0, sem erros. O primeiro teste de tipos identificou campos opcionais de fixtures com `undefined`; tipos corrigidos e verificação repetida com sucesso.
- `bun run build:operational`: sucesso; HTML, JS e CSS externos gerados. Avisos Vite sobre scripts clássicos `/live-player.js` e `/alerts.js` são esperados: são servidos separadamente pelo Node, não bundlados. Tipos e build padrão verificados pelo harness Lovable: última entrada `build OK`; não foi executado build manual do projeto padrão.
- Testes HTTP usam `createApp` real e SQLite temporário: login/CSRF, estado, claim/finalização/nota/409, ausência de pausa implícita, pausa/reativação e persistência lida em nova conexão, isolamento empresa/local, sessão expirada, traversal/404 e symlinks.
- Playwright Chromium: operacional **1280×1800** e **390×844**, login, navegação, fila mobile, expansão/reprodução, finalização com pausa → recarga → reativação, logout, foto autenticada, 409 real com nota antiga, 502 controlado sem fallback, 401 real limpando conteúdo, senha inicial → alteração → novo login e acesso legado com mesma sessão. Sem overflow horizontal, sem erros de página ou violações CSP na interface operacional nos percursos finais.
- Vídeo: gateway original com subprocesso substituído por fixture MP4 original; navegador decodificou **1280×720**, readyState **4**, tempo avançando. Foto usa fixture JPEG existente, não equipamento real. Som exige habilitação; não é prova de audibilidade na instalação do usuário.
- Primeiro percurso revelou erro de cleanup dos alertas ao desmontar; corrigido, com regressão unitária e repetição completa. Tentativas de automação posteriores tiveram esperas incorretas/estado de fixture, corrigidas no roteiro; os percursos finais passaram. Iniciadores Windows **não executados no Linux**.

## Limites e próxima implantação

### Distribuição 0.43.0

Pacote `invictus-integrado-0.43.0.zip`: conteúdo do serviço na raiz, incluindo `dist/interface`, iniciador integrado local e guia `ATUALIZAR-INTEGRADO.md`. Sem Bun/dependências de build para executar. `exports/release-descriptor.json` contém ZIP em base64, SHA256, bytes e número de entradas; o ZIP não entra no manifesto de fontes combinado.

Conferência final após correções de código: suítes completas acima repetidas. Build operacional executado duas vezes, com **três arquivos byte-idênticos** entre o build testado no navegador e a reprodução final: HTML, JS `index-Bepm-lSk.js` e CSS `index-OGBGfDNc.css`. Versão preservada **0.43.0**. ZIP: CRC, caminhos, ausência de links/dados privados e bytes comparados aos arquivos de programa; scan heurístico sem candidatos a segredos, não auditoria formal. Iniciadores Windows não executados no Linux.

### Regressões corrigidas antes da distribuição

- Normalização somente na leitura de `/api/monitoring`: `target:'person'` sem arrays, e `targets:['person','vehicle']` sem `pausedTargets`, são compatíveis. Sem escrita automática, sem pausas iniciais; demais campos/versões preservados. Editor e visualização do operador usam regras normalizadas.
- Editor conserva rascunho durante polling; salvamento usa a versão retornada pelo POST para o próximo salvamento. 409 permanece visível; **Recarregar regra e descartar rascunho** é ação explícita.
- Leituras serializadas: chamadas durante uma leitura compartilham uma leitura posterior, garantindo estado após mutação. Epoch e aborts descartam leituras de sessão anterior. Sucesso de escrita não é apresentado como falha de negócio por disputa de refresh; falha posterior informa que a ação foi gravada e a atualização falhou.
- `createdAt` rotulado **Ocorrência registrada**, não captura. Contrato do motor inalterado.
- Claim não fecha os detalhes nem perde observação; salvamento de nota permanece no detalhe e não aplica ação de detecção.
- Player possui chave por instância, não apenas por câmera; expansão encerra o tile e o substitui enquanto o modal estiver aberto. Cleanup não encerra outro player.
- Browser Chromium final **1280×1800** e **390×844**: login, leitura dos dois formatos antigos, dois POSTs consecutivos HTTP 200, alteração concorrente HTTP 409, polling preservando rascunho, recarga explícita, claim enquanto GET de polling estava retido, nota persistida com versão 3/status Em análise/sem pausas, finalização com pausa e reativação, fila mobile, navegação e logout. Vídeo fixture no tile e modal decodificou 1280×720; um player ativo na expansão e zero após fechamento. Sem overflow horizontal, pageerrors ou violações CSP no percurso final. Seletores/esperas e uso de string em `wait_for_function` da automação foram corrigidos antes da execução final; CSP não foi relaxada.

Código integrado e distribuição estática entregues; **não é uma demonstração de produção nem validação de instalação privada**. Não houve OpenAI paga, RTSP real, equipamentos, publicação ou novo backend provisionado. Conectividade DVR, chave local existente, FFmpeg instalado, licenças, conta/empresa, servidor, domínio, HTTPS, rede e desempenho dependem da instalação operacional.

Criação/edição completa de regras, conexões, usuários, transferências e master avançado permanecem no legado; não foram substituídas por ações fictícias. Vídeo contínuo além da duração da fixture é coberto pelos testes originais de continuidade/reconexão, não por ensaio prolongado em DVR. O manifesto não inclui o relatório cru de recuperação nem os antigos exports.