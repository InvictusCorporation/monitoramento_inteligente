# Invictus Monitoramento Inteligente

## Código disponível

A pasta [`interface/`](interface/) contém o código da interface demonstrativa: telas, componentes, imagens ilustrativas, configurações de compilação e testes. São 108 arquivos importados da versão validada da prévia, preservando seu conteúdo.

A interface oferece Visão ao vivo, Ocorrências, Câmeras e Gestão Master com dados simulados. Atendimento, finalização e pausas nesta prévia alteram somente o estado demonstrativo. A cópia neste repositório não configura sincronização automática com a ferramenta de origem.

**O código original do serviço de monitoramento ainda não foi importado. A conexão com DVR, IA, autenticação, banco de dados e licenças reais permanece pendente.** O repositório não representa uma implantação operacional concluída.

## Executar a interface

Com Bun instalado e acesso às dependências:

```sh
cd interface
bun install --frozen-lockfile
bun run dev
```

Verificações disponíveis:

```sh
bun run test
bun run build
```

A validação na origem registrou 8 testes, verificação de tipos, build e navegação desktop/mobile aprovados. Consulte [`interface/docs/VALIDACAO-PREVIA.md`](interface/docs/VALIDACAO-PREVIA.md). Esses comandos não foram executados novamente no GitHub durante a importação. Os arquivos transferidos foram conferidos por hash.

## Integração

Próximo passo: importar a fonte do serviço existente, mapear seus contratos reais e integrar a interface preservando a autorização e o isolamento entre clientes. Consulte [`docs/IMPORTACAO-E-INTEGRACAO.md`](docs/IMPORTACAO-E-INTEGRACAO.md).

Não versionar bancos de dados, fotografias de clientes, senhas, chaves, arquivos `.env` privados ou backups. O `.gitignore` orienta o Git local e não impede envios manuais desses arquivos.
