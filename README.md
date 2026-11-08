# Invictus Monitoramento Inteligente

## Código disponível

- [`servico/`](servico/): código original completo da versão 0.42.0, com servidor Node/SQLite, vídeo RTSP/FFmpeg, monitoramento, ocorrências, autenticação, gestão e testes. Foram recuperados 152 arquivos de programa, sem dados da instalação.
- [`interface/`](interface/): nova interface visual, com 108 arquivos e imagens demonstrativas.

**Os dois componentes estão disponíveis, mas a integração entre a nova interface e o serviço ainda está em andamento.** A interface mantém seus dados de demonstração até a conclusão dessa etapa. A cópia no GitHub não configura sincronização automática entre ferramentas.

## Serviço original

Requer Node >=24 e FFmpeg para vídeo. Consulte [`servico/README.md`](servico/README.md), [`servico/COMECE-AQUI.md`](servico/COMECE-AQUI.md) e [`servico/.env.example`](servico/.env.example). Credenciais e configurações locais devem ser definidas na instalação, nunca no repositório.

```sh
cd servico
node --test tests/*.test.mjs
```

A nova execução isolada aprovou os 162 testes originais. Consulte [`docs/VALIDACAO-SERVICO-ORIGINAL.md`](docs/VALIDACAO-SERVICO-ORIGINAL.md).

## Interface

Com Bun instalado e acesso às dependências:

```sh
cd interface
bun install --frozen-lockfile
bun run dev
bun run test
bun run build
```

A validação da interface registrou 8 testes, verificação de tipos, build e navegação desktop/mobile aprovados. Consulte [`interface/docs/VALIDACAO-PREVIA.md`](interface/docs/VALIDACAO-PREVIA.md).

## Integração

Os testes dos componentes separados não comprovam o funcionamento do conjunto. A próxima etapa conecta a interface aos contratos reais do serviço e valida os fluxos completos. Consulte [`docs/IMPORTACAO-E-INTEGRACAO.md`](docs/IMPORTACAO-E-INTEGRACAO.md).

Não versionar bancos de dados, fotografias de clientes, senhas, chaves, arquivos `.env` privados ou backups. O `.gitignore` orienta o Git local e não impede envios manuais desses arquivos.
