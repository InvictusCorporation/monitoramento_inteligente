# Invictus Monitoramento Inteligente

> **Instalação 0.43.0 suspensa — 08/11/2026.** Foi relatada uma detecção Grave, categoria Cavalo de Troia, pelo Microsoft Defender no ZIP de distribuição. A causa ainda está em investigação; não há confirmação de falso positivo nem liberação de segurança. Não instalar, extrair ou executar o pacote, desativar a proteção ou criar exclusões para contornar o alerta. Os testes funcionais e de integridade anteriores não eram uma análise antivírus. As instruções abaixo ficam suspensas até a conclusão da investigação.

Integração 0.43.0: interface operacional React e serviço original Node/SQLite/FFmpeg, com autenticação, câmeras, ocorrências, fotos, alertas, regras e gestão master pelas APIs existentes.

[Relatório da investigação antivírus](docs/INVESTIGACAO-ANTIVIRUS-0.43.0.md).

## Atualizar a instalação existente

Baixe [invictus-integrado-0.43.0.zip](distribuicao/invictus-integrado-0.43.0.zip) e siga [ATUALIZAR-INTEGRADO.md](servico/ATUALIZAR-INTEGRADO.md).

1. Encerre o programa e faça backup completo da pasta atual.
2. Extraia o ZIP em uma pasta temporária e copie seu conteúdo na **mesma pasta da instalação existente**, substituindo somente arquivos de programa.
3. Preserve `data/`, `.tools/`, `backups/`, `restauracoes/`, `camera.key`, configurações e `.env` privado.
4. Execute `INICIAR-INTEGRADO.cmd` e entre com a conta existente. Confira versão 0.43.0, locais e câmeras. Se aparecer cadastro inicial, confira a pasta e o banco original antes de prosseguir.

O ZIP inclui a interface compilada; não exige Bun para iniciar. A execução continua exigindo Node 24 ou superior e FFmpeg, conforme a instalação original.

## Organização

- `interface/`: fontes da interface, prévia demonstrativa e entrada operacional separada.
- `servico/`: motor original e interface operacional compilada em `dist/interface/`.
- `INICIAR-INTEGRADO.cmd`: inicia a versão integrada no repositório completo.
- `COMPILAR-INTEGRADO.cmd`: recompila a interface, exigindo Bun e dependências de desenvolvimento.
- [Integração, testes e limites](docs/INTEGRACAO-OPERACIONAL.md).
- [Orientações de execução](docs/IMPORTACAO-E-INTEGRACAO.md).

A prévia Lovable permanece demonstrativa. A versão operacional utiliza o Node da instalação, com UI e API na mesma origem. As configurações avançadas e funções originais continuam acessíveis em `/legado/`.

## Implantação

O envio ao GitHub não publica um servidor de produção. HTTPS, domínio, rede, acesso ao DVR, configuração local da IA e testes com equipamentos reais pertencem à implantação. As validações automatizadas usam banco temporário e imagens/vídeo de teste.

O módulo de supermercado, cobrança automática e dimensionamento de uma central com vários clientes ainda exigem desenvolvimento e validação próprios. Não estão incluídos nesta integração.
