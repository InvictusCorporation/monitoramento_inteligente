# Executar a integração 0.43.0

> **Instalação 0.43.0 suspensa — 08/11/2026.** Foi relatada uma detecção Grave, categoria Cavalo de Troia, pelo Microsoft Defender no ZIP de distribuição. A causa ainda está em investigação; não há confirmação de falso positivo nem liberação de segurança. Não instalar, extrair ou executar o pacote, desativar a proteção ou criar exclusões para contornar o alerta. Os testes funcionais e de integridade anteriores não eram uma análise antivírus. As instruções abaixo ficam suspensas até a conclusão da investigação.

[Relatório da investigação antivírus](INVESTIGACAO-ANTIVIRUS-0.43.0.md).

## Instalação existente

Use o [ZIP de atualização](../distribuicao/invictus-integrado-0.43.0.zip) e o [guia incluído no pacote](../servico/ATUALIZAR-INTEGRADO.md). Atualize a mesma pasta, com o programa encerrado e backup completo. Preserve dados, chave, configurações privadas e ferramentas existentes.

O conteúdo do ZIP já corresponde à raiz do serviço: execute `INICIAR-INTEGRADO.cmd` na pasta atualizada. Não crie uma segunda instalação vazia nem recadastre câmeras.

## Repositório completo

Com Node >=24 e FFmpeg configurados, execute `INICIAR-INTEGRADO.cmd` na raiz. Em ambiente Node configurado:

```sh
cd servico
npm run start:modern
```

O build operacional já está em `servico/dist/interface/`. Para recompilar as fontes, use Bun no diretório `interface/`:

```sh
bun install --frozen-lockfile
bun run build:operational
```

UI e `/api` utilizam a mesma origem. Em produção, mantenha HTTPS, proxy e `APP_ORIGIN` coerentes com a instalação original. O motor Node/SQLite/FFmpeg executa fora da hospedagem de prévia Lovable.

## Conferência após atualizar

Entre com a conta existente. Confira versão 0.43.0 e os mesmos locais/câmeras em Configurações avançadas. Teste abertura e fechamento de vídeo, foto de ocorrência, atendimento com observação, alertas e permissões. Se os dados anteriores não aparecerem, confira pasta, banco e chave antes de continuar.

Veja [o relatório técnico](INTEGRACAO-OPERACIONAL.md) para os testes executados e limites. Os testes de integração não substituem a validação do DVR, rede e API de IA da instalação real. Nenhum serviço de produção é publicado apenas pelo envio dos arquivos ao GitHub.
