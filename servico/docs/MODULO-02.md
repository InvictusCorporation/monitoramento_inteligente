# Módulo 02 — acesso e persistência

## Entregue

- Aplicação Node.js 24 com API HTTP e SQLite persistente, sem dependências externas.
- Login por código de empresa, e-mail e senha; hash scrypt com salt aleatório.
- Sessões de 8 horas, tokens aleatórios armazenados somente como hash no banco, cookies HttpOnly / SameSite=Strict, Secure no modo produção.
- Origem exata e token CSRF nas operações de escrita. Limite de tentativas de login.
- Cadastros de clientes, câmeras e usuários; edição da identidade da empresa.
- Desativação e reativação de usuários; encerramento das sessões ao desativar ou trocar senha.
- Ocorrências filtradas por autorização, finalização com justificativa, controle de versão contra sobrescrita concorrente.
- Histórico de ações por empresa, sem registrar senhas, tokens ou conteúdo das requisições.
- Interface usa API e não guarda dados de contas em localStorage.

## Permissões

| Ação | Administrador | Operador | Cliente |
|---|---|---|---|
| Ver locais, câmeras e ocorrências | Sua empresa | Sua empresa | Seu local |
| Cadastrar câmeras | Sua empresa | Sua empresa | Seu local |
| Analisar e finalizar ocorrências | Sua empresa | Sua empresa | Seu local |
| Cadastrar clientes | Sim | Não | Não |
| Gerenciar usuários e identidade | Sim | Não | Não |
| Consultar histórico de ações | Sua empresa | Não | Não |
| Alterar própria senha | Sim | Sim | Sim |

Cliente neste módulo representa a modalidade de autogestão. Restrições comerciais para clientes atendidos exclusivamente pela central deverão ser adicionadas com o módulo de licenças. Não existe cadastro público de empresa ou usuário. Uma nova empresa é provisionada pelo script local; seus demais acessos são criados pelo administrador.

A organização vem da sessão validada no servidor. Parâmetros de organização enviados pelo navegador não definem o escopo. Vínculos compostos no banco impedem associar câmera/usuário a cliente de outra empresa. O servidor nunca devolve hashes de senha ou tokens de sessão nos endpoints de dados.

## Testes

Execute `node --test tests/access.test.mjs` na raiz do projeto. A suíte usa banco em memória e banco temporário próprio, sem alterar dados de uso.

15 testes aprovados: acesso anônimo, arquivos privados, login, hash de senhas, cookies, CSRF/origem, manipulação do identificador da empresa, vínculos entre empresas, permissões de cliente e operador, isolamento de eventos, justificativa, concorrência, auditoria, revogação, troca de senha, logout, expiração, limite de tentativas e persistência. Algumas verificações estão agrupadas no mesmo teste.

Validação visual no navegador pendente: o controle de permissões recusou a navegação local durante esta execução. A suíte HTTP validou o retorno da página e os fluxos de API, não o layout renderizado.

## Limites e próxima etapa

Não foram integrados vídeo, RTSP/ONVIF, análise por IA, notificações, gravação ou sirenes. O ambiente autenticado começa vazio: não copia os eventos fictícios do módulo 01. O endpoint de ingestão de eventos será implementado com o gateway; não existe criação pública de eventos nesta etapa.

A autenticação ainda não inclui 2FA, recuperação de senha por e-mail, convites, SSO ou política de senhas expiradas. Histórico registra ator, ação, alvo e data; versionamento completo de conteúdo e exportação de auditoria ficam para expansão.

O banco SQLite é adequado à primeira instalação com uma instância do servidor. Alta disponibilidade e vários processos distribuídos exigem evolução da persistência. Limitação de tentativas nesta etapa fica em memória do processo e reinicia com ele; um proxy em produção deve aplicar limite adicional por IP.

## Hospedagem

`web/` é servido pelo backend em `server/`. Essa aplicação exige processo Node e disco persistente. O manifesto existente `.openai/hosting.json` continua apontando exclusivamente para a demonstração estática em `dist/`.

Não publicar `web/` como arquivos estáticos esperando que login e banco funcionem. A publicação anterior não ocorreu por bloqueio de conexão. Esta etapa não altera o VPS nem outros projetos. Para hospedagem Sites com servidor, será necessário adaptar o backend para o runtime suportado e D1; o servidor Node/SQLite deste módulo não é executável diretamente naquele runtime.
