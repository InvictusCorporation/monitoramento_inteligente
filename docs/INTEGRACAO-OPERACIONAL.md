# INVICTUS — integração operacional

## Estado atual

Fonte em desenvolvimento **0.44.0-dev.1**. O motor original em Node foi preservado: autenticação, cookies HttpOnly, CSRF/Origin, SQLite, licenças, regras, IA e gateways continuam no serviço. A SPA React operacional agora cobre nativamente as funções web do legado, organizadas por papel, sem iframe ou injeção do HTML antigo.

A prévia TanStack da Lovable permanece uma demonstração separada e identificada; ela não se apresenta como conectada ao motor. Nada foi publicado.

- Fontes operacionais no GitHub: `interface/operational/`, `interface/src/operational/` e `interface/vite.operational.config.ts`; nesta árvore, `interface/` é a raiz atual.
- Build pré-compilado: `servico/dist/interface/index.html` e `assets/`.
- `createApp({modernUiRoot})` habilita a interface moderna em `/` e `/interface/`; sem essa opção, o modo original permanece. `/legado/` é compatibilidade opcional, não dependência funcional.
- Player e alertas originais são servidos como scripts clássicos. A CSP estrita e a allowlist de assets foram preservadas.
- Inventário completo, perfis, APIs e evidências: `docs/PARIDADE-INTERFACE-OPERACIONAL.md`.
- Resultados e limites desta validação: `docs/VALIDACAO-PARIDADE-0.44.0-dev.1.md`.

## Funções nativas

- Sessão, primeira/própria senha, sessões e revogação das demais; guardas de carregamento/erro sem estado nulo ou fallback demonstrativo.
- Painel, mosaico paginado, fila/timeline, alertas e player MediaSource sob demanda com cleanup por instância.
- Câmeras: cadastro, nome, conexão DVR/RTSP/canal/stream, habilitação, teste, prévia e vídeo. `preserveCredentials:true` mantém o segredo somente no servidor e apenas quando host/porta validados permanecem os mesmos; canal/stream/path podem mudar. Trocar host/porta exige novas credenciais, e nenhum usuário/senha retorna ao navegador.
- Clientes comerciais e locais; usuários, papéis, ativação/desativação e redefinição administrativa de senha.
- Ocorrências: filtros, paginação, claim, notas, status, finalização, pausas/reativação, transferência com motivo, histórico, foto e download auditado; relatório/CSV reproduz o algoritmo local original.
- Monitoramento: locais, serviço contínuo, IA sem revelar chave, regras completas, área visual, modelos, análise manual e jobs. Navegar não ativa análise ou serviço.
- Saúde/diagnóstico e retenção preview/prepare/execute com confirmação, token e escopo; auditoria, marca e prazos.
- Gestão master para `platformAdmin`: própria operação e parceiras diretas, empresas, planos, branding e licenças. Não concede imagens ou eventos de parceiras.

Backup, restauração, instalação, atualização e concessão master continuam procedimentos locais de arquivos/CLI. Não existem botões web fictícios para essas ações.

## Compilar a SPA operacional

Requisitos de compilação: Bun com lockfile e dependências Vite/React declaradas. Execução/teste do motor exige Node **24 ou superior**; vídeo real depende do FFmpeg original com H.264/libx264.

No GitHub:

```sh
cd interface
bun install --frozen-lockfile
bun run build:operational
```

A configuração detecta a árvore Lovable (`servico/` dentro da raiz) e a árvore GitHub (`interface/` e `servico/` irmãos). O build final validado contém somente HTML, JS e CSS externos e foi reproduzido byte a byte. Reiniciar o Node depois de substituir assets, pois eles são carregados no início.

## Iniciar em uma instalação configurada

**Windows local:** no repositório completo, usar `INICIAR-INTEGRADO.cmd`; em uma instalação que já contenha os arquivos integrados, usar o iniciador da própria pasta. Esses arquivos não foram executados nesta validação Linux.

**Node/Linux ou instalação existente:**

```sh
cd servico
npm run start:modern
```

São preservadas as variáveis originais `APP_ORIGIN`, `HOST`, `PORT`, `DB_PATH`, `CAMERA_KEY_PATH`, `CAMERA_ALLOWED_ENDPOINTS`, `FFMPEG_PATH` e `NODE_ENV`. Não colocar valores privados no frontend ou no Git.

Produção exige `NODE_ENV=production`, `APP_ORIGIN` HTTPS e UI/API na mesma origem, com proxy restrito, cookies e Origin coerentes. O serviço Node não pertence ao Worker da prévia Lovable.

## Atualizar uma instalação existente — orientação, não nova release

Não foi gerado pacote 0.44.0-dev.1. Para uma futura atualização devidamente revisada e distribuída, encerrar o serviço, fazer backup completo e copiar somente os arquivos de programa na **mesma instalação**, preservando `data/`, `.tools/`, `backups/`, `restauracoes/`, `camera.key`, `.env` privado e configurações. Não usar fixtures nem sincronização que apague dados ausentes no pacote. Conferir versão, locais, câmeras e contas antes de operar.

Estas instruções não autorizam retomar o ZIP 0.43.0 suspenso nem substituem a remediação do alerta Microsoft Defender.

## Validação resumida

- Node 24.21.0: **172/172** testes do serviço.
- Frontend: suíte completa atual **31/31** em seis arquivos, incluindo rascunho/conflitos, refresh falho, retenção e destino das credenciais; tipagem sem erros.
- Build operacional Vite 8.1.5 aprovado e repetido com três hashes idênticos.
- Playwright final sobre o build: admin/master em 1280×1800; operator/client em desktop e 390×844; conflito 409, 403 de escopo, logout/401, câmeras, MediaSource fixture, regras, análise injetada, evidências, CSV, retenção temporária, marca, master e mobile.
- Sem pageerror ou violação de CSP nos percursos finais. Somente 401 esperados após logout no console admin/master.
- Nenhum teste acessou DVR, RTSP, OpenAI pago ou equipamento real. Windows e integração física permanecem não verificados.

Consulte o relatório de validação para gestos não exercitados e demais limites. Não se declara que o alerta de antivírus foi resolvido nem que esta fonte de desenvolvimento é uma release comercial.

## Alerta da distribuição 0.43.0

O ZIP 0.43.0 continua **suspenso** após o alerta Microsoft Defender `Trojan:Script/Ulthar.A!ml`. A investigação isolada e suas limitações permanecem em `docs/INVESTIGACAO-ANTIVIRUS-0.43.0.md` e `.json`. ClamAV negativo não comprova falso positivo. Esta tarefa não alterou o ZIP antigo, não tentou contornar o Defender e não gerou nova distribuição.
