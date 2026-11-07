# Invictus Monitoramento Inteligente

Repositório destinado ao código do sistema de monitoramento e à integração da nova interface criada na Lovable.

## Estado atual — 07/11/2026

**O código da aplicação ainda não foi importado neste repositório.** Os arquivos iniciais são documentação e exclusões para arquivos locais. Não constituem um sistema executável nem uma implantação em produção.

- Último pacote de código entregue nesta conversa: **0.42.0**. Seu registro de validação informa 162 testes automatizados aprovados. Esses testes pertencem à versão entregue e não foram executados neste repositório.
- Nova interface: [Invictus Visão ao Vivo na Lovable](https://lovable.dev/projects/64472665-4aa2-4c8d-a369-e9cdf4ddfd4d).
- A correção da prévia está no commit Lovable `b55961ed75a1a47d9097d3dd87b897ecd4da3619`. Seu documento `docs/VALIDACAO-PREVIA.md` registra build e verificação de tipos aprovados, 8 testes aprovados e validação desktop/mobile.
- A prévia usa dados e imagens demonstrativos. Ainda não possui integração com o DVR, análise de IA, autenticação, banco de dados ou licenças reais.

## Próximo passo

Importar o código do pacote existente, preservando o motor Node/SQLite/RTSP. Depois, adaptar a interface aprovada aos contratos reais desse código, validar o fluxo completo e preparar a implantação.

Consulte [o registro de importação e integração](docs/IMPORTACAO-E-INTEGRACAO.md).

Não adicionar dados de clientes, fotografias, senhas, chaves de API, banco de dados, pasta `data`, backups ou configurações privadas. O `.gitignore` ajuda no uso do Git local, mas não impede o envio manual desses arquivos pela interface do GitHub.
