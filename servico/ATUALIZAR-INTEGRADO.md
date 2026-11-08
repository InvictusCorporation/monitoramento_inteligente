# Atualização INVICTUS 0.43.0

Este pacote atualiza a instalação existente; não é uma instalação vazia. Seu conteúdo já é a raiz do serviço: não criar uma subpasta `servico` dentro da instalação.

1. Encerrar o programa, a janela do iniciador e o processo Node antes de copiar arquivos.
2. Fazer **backup completo de toda a pasta da instalação atual**, incluindo dados e configurações privadas. Usar também `FAZER-BACKUP.cmd` conforme o procedimento original.
3. Extrair `invictus-integrado-0.43.0.zip` em uma pasta temporária. Copiar os arquivos extraídos para a **MESMA pasta onde estão o programa e seus dados atuais**, substituindo arquivos de programa.
4. **Preservar** `data/`, `.tools/`, `backups/`, `restauracoes/`, `camera.key`, `.env` privado, configurações e quaisquer caminhos de banco/chave configurados fora dessa pasta. Não apagar arquivos só porque não constam do ZIP. Não usar espelhamento com exclusão. Não substituir a chave por outra.
5. Executar `INICIAR-INTEGRADO.cmd` nessa pasta. Ele usa o iniciador original e abre a interface operacional compilada. `INICIAR-INVICTUS.cmd` continua disponível para o modo original. Não é necessário instalar Bun ou recompilar para iniciar.
6. Entrar com a conta existente. Em **Configurações avançadas**, conferir o diagnóstico, versão **0.43.0**, locais e câmeras existentes. A API autenticada `GET /api/state` informa `installation.version`. Se a instalação pedir cadastro inicial ou não mostrar os locais, **parar** e conferir a pasta/banco original e variáveis existentes; não recadastrar câmeras.

## Pré-requisitos e outros ambientes

- Node.js **24 ou superior**, SQLite nativo do Node e FFmpeg com H.264/libx264. A preparação Windows original continua reconhecendo o FFmpeg já configurado e a pasta `.tools`; não substitui banco ou chave. Pode precisar de rede para preparar o vídeo quando FFmpeg estiver ausente.
- Em servidor Node já configurado: executar `npm run start:modern` na pasta da instalação. Manter as variáveis originais de banco, chave, FFmpeg, destinos permitidos, porta e origem. Se a instalação atual utiliza um gerenciador de serviço ou proxy HTTPS, manter esse procedimento e configurar `INVICTUS_UI=modern` no processo original; não trocar uma implantação externa pelo iniciador local Windows.
- UI e `/api` devem estar na **mesma origem**. Produção exige HTTPS e as proteções originais de sessão/CSRF/licença. `/legado/` abre todas as funções originais no mesmo servidor, por **Configurações avançadas**.
- A prévia Lovable continua demonstrativa; não executa o motor Node/SQLite/RTSP. Este ZIP executa a interface operacional no Node da instalação, com dados reais apenas após login válido e sem fallback demo.
- DVR, rede, equipamentos, domínio, HTTPS, permissões/licenças, chave local e desempenho dependem da instalação real. Nenhum equipamento ou API paga foi conectado na validação, e não houve publicação de serviço.

## Validação da distribuição

Revisão final 0.43.0: **171/171 testes do serviço e 21/21 da interface aprovados**, além de tipos, build operacional e navegação desktop/mobile com fixtures, sem violações CSP nos percursos finais. Inclui correções para regras antigas, versões após salvamento, leituras concorrentes, preservação de observações e limpeza de players. O build distribuído corresponde às fontes finais. ZIP validado por CRC, membros, bytes e SHA256, sem dados de instalação, chaves, dependências ou exports. Iniciadores Windows não foram executados no Linux; DVR e API real não foram conectados.
