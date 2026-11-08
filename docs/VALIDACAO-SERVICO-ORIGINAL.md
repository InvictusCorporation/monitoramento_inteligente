# Validação do serviço original

- Versão recuperada: 0.42.0.
- Arquivos de programa: 152, preservados byte a byte e conferidos por SHA256 e tamanho.
- Requisito: Node >=24.0.0, devido ao SQLite nativo.
- Comando de teste: `node --test tests/*.test.mjs` no diretório do serviço.
- Resultado da nova execução isolada: 162 testes, 162 aprovados, nenhuma falha.
- Testes de HTTP, captura e análise usam dados temporários, fixtures e substitutos. Não foram usados equipamentos reais nem chamadas pagas à IA.
- A aprovação desses testes valida o serviço original; a integração com a interface e a implantação ainda precisam de validação própria.

## Contratos existentes e lacunas da interface

Fonte de referência: `servico/server/app.mjs`, `monitoring.mjs`, `monitoring-worker.mjs`, `ai-detector.mjs` e módulos chamados. Métodos e caminhos abaixo existem no código; nenhuma chamada de produção foi realizada.

| Área | Serviço existente | O que falta na interface aprovada |
| --- | --- | --- |
| Sessão/CSRF | `POST /api/login` com `company`, `email`, `password`; resposta `user`, `csrf`. `GET /api/session`; `POST /api/logout`; `GET /api/sessions`; `POST /api/sessions/revoke-others`; `POST /api/password`. Cookie HttpOnly de 8 horas: `invictus_session`, ou `__Host-invictus_session` na configuração segura. Métodos não-GET exigem Origin canônica; após login, também `X-CSRF-Token`. Senha inicial pendente bloqueia demais recursos. | Fluxos reais de login, troca inicial, sessão, saída e envio de CSRF. Hoje o operador é demonstrativo. |
| Leitura inicial | `GET /api/state`: `installation`, `organization`, `user`, `customers`, `clients`, `video`, `cameras`, `events`, com escopo de organização/local e licenças. | Substituir fixtures por resposta autenticada e adaptar tipos. `clients` no serviço são locais; `customers` são clientes comerciais, não equivalem diretamente ao filtro demonstrativo. |
| Câmeras/vídeo | `POST /api/cameras` com `name`, `client`; `GET/POST/PATCH /api/cameras/:id/connection`, com versão e configuração validada, segredo cifrado; `POST /api/cameras/:id/test`, `/live` (MP4) e `/preview` (JPEG). Operador não configura conexão. Licença, sessão e revogação limitam acesso/transmissão. | Cadastro/conexão, tratamento de disponibilidade e concorrência; ligar player/captura aos POST autenticados com CSRF, não a URLs GET de imagens. Hoje são fotos demonstrativas. |
| Monitoramento/análise | `GET /api/monitoring` retorna locais, regras, `ai`, `service`, `jobs`; `POST /api/monitoring/service`; `POST /api/ai/settings`; `POST /api/cameras/:id/analyze`; `POST /api/monitoring/locations/:id` (`enabled`, `version`); `POST /api/monitoring/cameras/:id` (regra e `version`); `GET /api/diagnostics`. Regra: `enabled`, `name`, `priority`, `days`, `start`, `end`, `timezone`, `area` (`x/y/width/height`), `targets`, `pausedTargets`. Categorias reais `person/vehicle/animal`. Operador não salva regras; serviço/IA exigem admin. | Mapear categorias e área, carregar/salvar versões e respeitar permissões. A pausa da demo por operador não equivale à edição de regra. Intervalo do serviço é por organização: `interval` 10–3600, `cooldown` 30–86400, `dailyLimit` 1–10000, `enabled`, `version`; não existe equivalência direta ao seletor 10/15/30 por câmera da demo. |
| Ocorrências | `POST /api/events/:id/claim` com `version` assume e muda para `Em análise`; `POST /api/events/:id/transfer` com `to`, `reason`, `version`; `GET /api/operators`. `PATCH /api/events/:id` com `status`, `note`, `version`, opcional `alertAction`; status `Pendente/Em análise/Finalizada`, nota obrigatória ao finalizar. Ações `pause:person`, `resume:person` e equivalentes para vehicle/animal; pausa via atendimento exige finalização e altera regra atomicamente. `GET /api/events/:id/history`; `GET /api/events/:id/image`, `?download=1`. | Atendimento persistente, nota obrigatória, versões/conflito 409, histórico/evidência e transferência. Adaptar `em_atendimento` para `Em análise` e ler atribuição `claimedBy/claimedAt/claimedName`. Não usar apenas PATCH para substituir o contrato real de assumir. |
| Master | Verificação adicional `platformAdmin`, empresa gerenciada e senha definida. `GET/POST /api/platform/companies`; `GET/POST /api/platform/plans`; `PATCH /api/platform/plans/:id`; `GET/PATCH /api/platform/branding/:org`; `POST /api/platform/licenses/:id` para local, com `plan`, `enabled`, `cameraLimit`, `expiresAt`, `version`, `module: patrimonial`, seleção opcional `planId/planVersion`. | Gestão atual é demonstrativa; carregar hierarquia empresa/cliente/local/licença, permissões master e versões. Não tratar admin operacional como master. |

## Próxima etapa

Integrar a interface aos contratos reais listados, preservando sessão, CSRF, isolamento por empresa/local e licenças. O serviço requer Node, SQLite e FFmpeg; não deve ser importado como se fosse código de um Worker de interface. Validar o conjunto integrado antes de operar com equipamentos e dados reais.
