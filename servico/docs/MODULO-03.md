# Módulo 03 — configuração RTSP e vídeo sob demanda

## Entregue

- Configuração manual por IPv4, porta e caminho RTSP, com credenciais opcionais.
- Criptografia AES-256-GCM da configuração inteira, vinculada ao ID da câmera e da empresa; a chave fica fora do Git e do pacote de entrega.
- Endereços iniciais autorizados por local no servidor. Um cliente não pode selecionar um destino liberado apenas para outro local.
- Consulta retorna somente host/porta, versão e estados de configuração. Não devolve senha, usuário, caminho, URL RTSP ou texto de erro do conversor.
- Teste de resposta do equipamento; abertura de vídeo por requisição autenticada com CSRF.
- Processo FFmpeg sob demanda: RTSP sobre TCP → H.264/MP4 fragmentado → player MediaSource no navegador. Sem áudio, gravação ou IA nesta etapa.
- Limites iniciais: quatro processos por instalação, um por usuário, até cinco minutos por abertura, 15 segundos para início e 20 segundos sem dados. Conversão limitada a 720p/15 fps e uma thread de codificação.
- Encerramento ao fechar o player, sair da conta, desativar o usuário, alterar a senha ou modificar/desabilitar a conexão. A sessão também é revalidada a cada dois segundos.
- Configuração disponível ao administrador e ao cliente responsável por seu próprio local. Operador pode consultar, testar e assistir, mas não alterar a conexão.
- Migração aditiva preserva os cadastros anteriores.

## Preparar a instalação

1. Mantenha o servidor na mesma rede das câmeras ou conecte essa rede por VPN. Um IP privado do cliente não é acessível automaticamente por um VPS externo. Não abra portas das câmeras na internet para resolver isso.
2. Instale uma versão atual de FFmpeg com o codificador `libx264`, por meio de uma fonte confiável. O aplicativo não baixa nem executa instaladores. Informe o caminho absoluto do executável em `FFMPEG_PATH`.
3. Crie os clientes/locais no painel e execute `node scripts/list-locations.mjs` na instalação para consultar os respectivos IDs. Se usar `.env`, execute `node --env-file=.env scripts/list-locations.mjs`.
4. Copie `.env.example` para `.env`. Configure `CAMERA_ALLOWED_ENDPOINTS` como lista JSON de objetos com `clientId` e `address`, por exemplo `[{"clientId":"ID_REAL_DO_LOCAL","address":"192.168.1.100:554"}]`. Autorize apenas equipamentos conhecidos. A lista não é editável pelo navegador.
5. Inicie com `node --env-file=.env server/start.mjs`. Para uso externo, configure `NODE_ENV=production`, `APP_ORIGIN=https://seu-dominio` e proxy HTTPS, preservando o cabeçalho Origin. Desative o buffering do proxy para `/api/cameras/*/live` e permita requisições de pelo menos cinco minutos. Não exponha o banco ou a chave.
6. Selecione uma câmera no painel, clique em **Configurar conexão**, informe os dados e salve. Use **Testar conexão** e depois **Ver ao vivo**. O caminho do canal depende do fabricante e do modelo; o aplicativo não adivinha esse caminho.

`Configurada` indica cadastro, não disponibilidade. O teste confirma recebimento inicial de mídia, mas não comprova qualidade visual ou funcionamento contínuo. O player exibe mensagem se o formato não for suportado. Compatibilidade em modelos reais de celular e computador precisa ser homologada; não há garantia de funcionamento em todo navegador.

## Chave e dados

A primeira inicialização cria `camera.key` ao lado do banco, salvo se `CAMERA_KEY_PATH` indicar outro caminho. Se já existirem conexões e a chave estiver ausente, a inicialização falha para evitar substituir silenciosamente a chave. Uma chave incorreta impede decifrar as configurações. Mantenha backup da chave separado e protegido, e teste a restauração junto com o banco. No Windows, restrinja as ACLs do arquivo à conta do serviço; o modo de arquivo POSIX usado na criação não substitui ACLs.

Senhas são digitadas no formulário, enviadas ao servidor e não são reexibidas nas consultas. Ao reconfigurar, todos os campos são substituídos: preencha novamente os dados completos. Não registre o corpo das requisições no proxy.

FFmpeg recebe a URL RTSP como argumento de processo. Portanto administradores do sistema operacional e ferramentas com acesso à lista de comandos podem vê-la. Isole a conta do serviço e não registre argumentos. A saída de erro do processo é descartada para não vazar a URL nas respostas ou logs do aplicativo.

## Limite de segurança da rede

A lista por local valida o destino inicial; não é um firewall do processo FFmpeg. Equipamentos maliciosos podem fornecer redirecionamentos ou metadados que induzam conexões adicionais. Antes de operar com redes de terceiros, executar o conversor em isolamento de rede com saída restrita aos equipamentos daquele local, sem acesso a serviços internos/metadados. Esse isolamento por local e o agente remoto dedicado ainda não estão provisionados por este módulo. Não tratar a validação de endereço como proteção completa contra SSRF.

O servidor deve tratar os equipamentos configurados como fontes confiáveis nesta primeira instalação controlada. RTSP não oferece criptografia de transporte nesta implementação; use rede privada/VPN. Apenas RTSP/TCP e IPv4 são implementados. ONVIF, descoberta automática, IPv6, WebRTC e agent remoto ficam para expansão.

## Validação e limites desta entrega

Execute `node --test tests/access.test.mjs tests/video.test.mjs`.

Os testes de vídeo usam processo e bytes simulados para testar autorização, transporte HTTP, encerramento, limite de processos e tratamento de falhas. Não representam um vídeo decodificável nem comprovam funcionamento do FFmpeg. Nenhum equipamento real foi acessado. FFmpeg não está instalado neste ambiente; a conversão e a reprodução reais não foram homologadas. A revisão visual no navegador também permanece pendente, após recusa da navegação local no módulo anterior.

Não foi feita publicação online nem alteração no VPS. O módulo Node exige disco persistente e acesso de rede às câmeras; o protótipo estático em `dist/` continua independente.

## Referências de implementação

- [FFmpeg — RTSP e opções de protocolo](https://ffmpeg.org/ffmpeg-protocols.html)
- [FFmpeg — formatos e MP4 fragmentado](https://ffmpeg.org/ffmpeg-formats.html)
- [MDN — SourceBuffer.appendBuffer](https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer/appendBuffer)
- [MDN — MediaSource.addSourceBuffer e compatibilidade](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource/addSourceBuffer)
