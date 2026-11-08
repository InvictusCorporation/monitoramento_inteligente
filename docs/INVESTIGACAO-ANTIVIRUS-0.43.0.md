# Investigação antivírus — INVICTUS 0.43.0

Data: 08/11/2026 UTC. Investigação do commit público `399985212943f6bd7654175b91f7854d806471f9` de `InvictusCorporation/monitoramento_inteligente`.

## Conclusão e alerta do Windows

O relato disponível é **Cavalo de Troia / Grave / Correção incompleta ou Falha na quarentena**, envolvendo o arquivo do codeload e seu ZIP em `distribuicao/`. Não temos a assinatura exata nem o membro detectado. **Não foi estabelecida a causa, nem confirmado falso positivo.** A afirmação anterior de que iniciadores `.cmd` explicariam o alerta não tinha evidência suficiente e não deve orientar uma liberação.

O ClamAV com assinaturas oficiais verificadas não detectou ameaças nos dois ZIPs ou nos membros extraídos. A revisão estática não identificou implementação maliciosa, mas encontrou capacidades de execução e transferência de dados que merecem proteção. **ClamAV não substitui Microsoft Defender**, indisponível neste Linux. Não executar o pacote nem permitir a ameaça com base neste relatório.

## Artefatos exatos e comparação

| Artefato | HTTP | Bytes | Entradas | SHA256 |
|---|---:|---:|---:|---|
| ZIP distribuído | 200 | 1.305.463 | 163 arquivos | `f4707d65b9007444e7e88dff0e1de09a905894064555c36161a9d5556cf39572` |
| Archive do commit | 200 | 3.824.228 | 322 (290 arquivos, 32 diretórios) | `5e93dc9bbce7d8eac2a669f62e5ae76c9cef192759a277970f51de1878c45c8b` |

URLs utilizadas, sem redirecionamento; ambas responderam `application/zip`:

- https://raw.githubusercontent.com/InvictusCorporation/monitoramento_inteligente/399985212943f6bd7654175b91f7854d806471f9/distribuicao/invictus-integrado-0.43.0.zip
- https://codeload.github.com/InvictusCorporation/monitoramento_inteligente/zip/399985212943f6bd7654175b91f7854d806471f9

CRC de ambos: OK. **Todos os 163 membros** do ZIP foram comparados byte a byte com `servico/<path>` do mesmo commit: **zero divergências**. O ZIP embutido no archive também é byte a byte idêntico ao download direto. Não foi utilizado o descritor anterior local.

Antes da extração temporária foram recusados caminhos absolutos, `..`, barras invertidas, dois-pontos e symlinks; nenhum ocorreu. Não há nomes duplicados, membros criptografados, comentários de membros ou bytes depois do fim dos ZIPs. O archive externo tem comentário de 40 bytes contendo o commit e campos extras `0x5455` de timestamps; o interno não tem comentários ou campos extras.

- Conteúdo interno: 80 `.mjs`, 9 `.js`, 6 `.cmd`, 4 `.html`, 3 `.css`, 4 `.json`, 53 `.md`, 1 `.jpg`, 1 `.mp4`, `.env.example` e `.gitignore`.
- Únicos arquivos ocultos internos: `.env.example` e `.gitignore`. No externo: `.gitignore`, `interface/.gitignore`, `interface/.prettierignore`, `interface/.prettierrc` e os dois de `servico/`.
- Não foram encontrados cabeçalhos PE/ELF válidos, inclusive procurando dentro dos membros. Isso não exclui código interpretado ou payload comprimido.
- Único archive aninhado reconhecido: o ZIP distribuído dentro do archive do GitHub; nenhum dentro do ZIP distribuído.
- Tamanho descomprimido: 2.026.634 bytes interno e 4.963.787 externo.
- JPEG de teste contém metadados de proveniência JUMBF/C2PA, URLs de certificado/OCSP e identificador de mídia gerada; não há bytes após o EOI. MP4 de teste tem boxes cobrindo todo o arquivo e metadados de FFmpeg/x264. Nenhum foi decodificado; assinaturas de proveniência e segurança dos decodificadores não foram comprovadas.

## Revisão estática completa do código distribuído

Foram lidos os 10 scripts, 6 iniciadores Windows, manifesto do serviço, `.env.example`, todos os 24 arquivos de `server/`, 10 de `web/`, 6 de `dist/` e 49 de `tests/`/fixtures. O bundle operacional de 252.914 bytes foi inspecionado, não executado. Também foram revisados os iniciadores raiz e configurações/manifestações de build do archive. O JSON associado lista paths, hashes, resultados por arquivo e referências de URLs. A implementação integral das dependências e seu grafo de lock não foi auditada.

### Achados com referências

1. **Download e execução de FFmpeg:** `servico/INICIAR-INVICTUS.cmd:13–19` chama o instalador. `servico/scripts/install-local.mjs:31–54` baixa ZIP e checksum, verifica SHA256, invoca PowerShell para validar caminhos e extrair e executa `ffmpeg.exe -hide_banner -encoders`. Não há `ExecutionPolicy Bypass`, comando codificado ou alteração de Defender/AMSI. Porém archive e checksum vêm da mesma origem, a URL é móvel e executáveis previamente configurados são executados sem autenticação por hash (`:16,24–28`). A pasta de extração é reutilizada e a escolha recursiva não limpa conteúdo anterior (`:17–20,48–53`). São limitações reais de confiança na cadeia de instalação, **não causa comprovada do alerta**. O FFmpeg remoto não foi baixado nesta investigação.
2. **Confiança no Node local:** cinco iniciadores usam `where node.exe` e fallback para um cache preexistente de runtime no perfil do usuário (`servico/INICIAR-INVICTUS.cmd:4–6` e linhas equivalentes nos iniciadores de backup/master). Não verificam o binário. Nenhum caminho pessoal real é reproduzido aqui.
3. **Elevação administrativa local:** `servico/scripts/configure-master.mjs:8–15` altera privilégios no banco após confirmação `ATIVAR`, sem validar a senha da conta. Depende de acesso local de escrita ao banco; não foi demonstrada exploração remota. Remover master não remove a associação comercial correspondente. Não é mecanismo oculto de persistência Windows.
4. **Backup sensível:** `servico/scripts/backup-local.mjs:36–59` inclui banco e `camera.key`; `servico/scripts/external-backup.mjs:9–28` copia para destino configurado, que pode ser compartilhamento de rede. Destino precisa de proteção, pois possui dados e chave juntos. Não foi identificado destino fixo de atacante. `servico/server/backup-scheduler.mjs:23–62` usa processo Node fixo com `shell:false` e timer interno, não tarefa agendada Windows.
5. **Envio legítimo, porém sensível, à IA:** `servico/server/ai-detector.mjs:15–40,64–119` envia JPEG e chave fornecida para OpenAI após verificações do aplicativo. Monitoramento em segundo plano pode iniciar a análise (`servico/server/monitoring-worker.mjs:25–70`). `store:false` é parâmetro da requisição, não garantia independente de tratamento pelo fornecedor. Nenhuma chamada foi realizada.
6. **Vídeo:** `servico/server/video-gateway.mjs:10–68` e `servico/server/snapshot.mjs:2–13` executam FFmpeg com `shell:false`, destino RTSP configurado e allowlist. Credenciais aparecem nos argumentos do processo. Não foi identificada ponte socket→shell. Nenhum equipamento foi acessado.
7. **Código compilado e testes:** minificação React/Vite reconhecível, sem payload executável codificado, `eval` ou `new Function` identificado no bundle operacional. Chamadas do aplicativo usam `/api` na mesma origem (`servico/dist/interface/assets/index-Bepm-lSk.js:9`, trecho a partir da coluna 74050). Testes usam `vm` para avaliar fontes locais — por exemplo `servico/tests/event-report.test.mjs:5–6` e `servico/tests/rule-template.test.mjs:7` — e não foram executados. SQL `exec()` no banco não é avaliação JavaScript.

Não foram identificados comandos de exclusão/desativação do Defender, alterações AMSI, instalação de serviço/autostart, registro ou tarefas Windows, reverse shell, coleta de credenciais de navegador/SSH/wallet/cloud, endpoint de atacante ou ofuscação executável. Essa evidência negativa não prova ausência de malware e não autoriza ignorar o Defender. Não há correção focada de malware justificada pela evidência atual; nenhum programa foi modificado.

### Downloads externos e demais destinos

| Destino | Uso / referência |
|---|---|
| `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip` | Download executável futuro; `servico/scripts/install-local.mjs:31–54` |
| `https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip.sha256` | Checksum em memória; `servico/scripts/install-local.mjs:34–37` |
| `https://nodejs.org/` | Recomendação manual, não download automático; `servico/INICIAR-INVICTUS.cmd:8` |
| `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap` | CSS; `servico/dist/interface/index.html:12` |
| Mesma URL de fontes com pesos `400;500;600;700;800` | CSS; `servico/web/style.css:1`, `servico/dist/style.css:1` |
| `fonts.gstatic.com` | Fontes determinadas pelo CSS externo, permitido em `servico/server/app.mjs:100` |
| `images.unsplash.com/<photo-id>?auto=format&fit=crop&w=900&q=80` | Imagens de demonstração antiga em `servico/dist/app.js:4,8`; IDs `photo-1600596542815-ffad4c1539a9`, `photo-1503376780353-7e6692767b70`, `photo-1416879595882-3373a0480b5b`, `photo-1600607687920-4e2a09cf159d` |
| `https://api.openai.com/v1/responses` | POST de análise, não download de código; `servico/server/ai-detector.mjs:21–27` |
| IPv4/porta RTSP configurados | DVR/câmera via FFmpeg; `servico/server/video-gateway.mjs:15–48` |
| Diretório de backup externo configurado | Cópia de dados/chave; `servico/scripts/external-backup.mjs:9–28` |

O compilador raiz `COMPILAR-INTEGRADO.cmd:5` executaria `bun install --frozen-lockfile`: downloads de dependências definidos pelo lock/configuração de registro, não URLs explícitas no iniciador. Não foi executado. Manifestações revisadas não definem hooks preinstall/install/postinstall. URLs React/W3C/Tailwind são referências/namespace; URLs de certificados no JPEG são metadados não requisitados pelo loader. API/browser local usam a mesma origem; `servico/scripts/start-local.mjs:32` abre URL loopback com `cmd /d /c start`.

## Antivírus real disponível no ambiente

Descoberta inicial: nenhum `clamscan`, `clamdscan`, `freshclam` ou base nos diretórios padrão. Instalado **ClamAV 1.4.6** via pacote oficial NixOS/nixpkgs. Atualização oficial em `database.clamav.net`, configuração e base somente em área temporária, concluída dentro do limite operacional de cinco minutos. O diagnóstico inicial de `freshclam --version` reclamou da configuração padrão ausente; a atualização subsequente com configuração explícita teve exit 0. Não foi ocultado erro de download/base.

`sigtool --info` verificou as assinaturas digitais de todas as bases:

| Base | Versão | Assinaturas | Data UTC | Verificação |
|---|---:|---:|---|---|
| daily.cvd | 28177 | 355.854 | 08/11/2026 06:23 | OK |
| main.cvd | 63 | 3.287.027 | 16/12/2025 23:18 | OK |
| bytecode.cvd | 339 | 80 | 11/09/2025 12:29 | OK |

As bases main/bytecode têm datas anteriores, mas foram obtidas como versões correntes do mirror oficial, junto de daily do dia; não era base vazia ou atualização falha. O motor reportou 3.628.258 ameaças conhecidas após carregar as bases; esse contador não é a soma simples dos registros CVD.

Opções: recursivo, archives habilitados, `max-filesize=100M`, `max-scansize=500M`, `max-files=10000`, `max-recursion=30`, `alert-exceeds-max=yes`; sem remoção/quarentena. Nenhum limite acionado, warning ou erro nas quatro verificações.

| Alvo | Arquivos reportados | Infectados | Exit | Início→fim UTC |
|---|---:|---:|---:|---|
| ZIP interno (archives analisados pelo motor) | 1 | 0 | 0 | 15:50:17→15:50:32 |
| ZIP externo (inclui ZIP aninhado) | 1 | 0 | 0 | 15:50:32→15:50:47 |
| Membros internos individualmente | 163 | 0 | 0 | 15:50:47→15:50:58 |
| Membros externos individualmente | 290 | 0 | 0 | 15:50:58→15:51:11 |

O contador 1 para cada ZIP é o arquivo de entrada, não afirmação de que todos os membros seriam contados separadamente. A verificação adicional de membros foi feita para registrar resultados individuais. O JSON contém o resultado de cada arquivo, versões, limites, hashes das bases e dos logs e inventário completo dos membros.

## Limites e próximos passos

1. **Manter Defender ativo e não executar/restaurar/permitir o pacote.** Integridade SHA/CRC e resultado ClamAV não comprovam inocuidade.
2. Obter o **nome exato da assinatura**, recurso/membro afetado, versão do motor e versão/data da inteligência de segurança no Histórico de proteção ou eventos de `Microsoft-Windows-Windows Defender/Operational`. Compartilhar apenas campos técnicos redigidos, sem caminhos pessoais ou credenciais.
3. Atualizar a inteligência de segurança do Defender e realizar verificação suportada, sem adicionar exclusões ou permitir ameaça. Se a correção continuar falhando, seguir o procedimento de remediação da Microsoft, incluindo verificação completa/offline quando indicado e auxílio técnico qualificado. O estado de quarentena não foi reproduzido ou corrigido neste Linux.
4. Com assinatura/membro identificado, revisar o trecho preciso e decidir correção focada ou avaliação de possível falso positivo pela Microsoft, **somente com autorização separada para qualquer envio**. Nada foi enviado nesta investigação.

Não executamos conteúdo do pacote, testes do aplicativo, instaladores Windows, decodificadores de mídia, FFmpeg remoto ou serviços pagos. Não acessamos o computador do usuário/DVR, não publicamos, não alteramos ZIP/programa/versão, não enfraquecemos antivírus, não enviamos arquivos a VirusTotal/terceiros e não incluímos EICAR. Somente este relatório e o manifesto público foram adicionados ao projeto.