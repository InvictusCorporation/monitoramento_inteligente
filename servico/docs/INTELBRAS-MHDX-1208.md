# Perfil Intelbras MHDX 1208

Equipamento informado pelo usuário: DVR Stand Alone Intelbras MHDX 1208, oito canais. Perfil preparado para os canais BNC 1 a 8. Canais IP adicionais/modo NVR e variações MHDX 1208-C não fazem parte deste perfil.

O formulário agora permite selecionar o modelo, canal de 1 a 8 e fluxo principal ou extra. O servidor monta e valida `/cam/realmonitor?channel=N&subtype=T`, com T=0 para principal e T=1 para extra. O fluxo extra é a seleção inicial do formulário; sua disponibilidade e parâmetros dependem da configuração do DVR. Porta inicial 554, editável conforme o equipamento.

Cada canal é um cadastro de câmera no mesmo cliente/local; use o mesmo IPv4 e porta do DVR e selecione o canal correspondente. A autorização de endereço continua vinculada ao local no servidor. Não foram criados oito cadastros fictícios nem iniciadas conexões ao DVR do usuário.

O aplicativo não se conecta pelo número de série/QR Code do Intelbras Cloud. O servidor precisa alcançar o endereço RTSP do equipamento pela rede local/VPN. O usuário e a senha a informar no formulário são do DVR. Não é necessário enviar senhas no chat.

## Primeiro teste pendente

1. Confirmar se o computador/servidor está na mesma rede do DVR ou se existe VPN.
2. Conferir IPv4, porta RTSP e conta com permissão de visualização no equipamento.
3. Configurar FFmpeg e autorização por local conforme `MODULO-03.md`.
4. Cadastrar o canal 1 e verificar fluxo extra; conferir principal se necessário.
5. Validar imagem real, desconexão, permissões e compatibilidade dos navegadores antes de expandir.

O limite inicial de uma transmissão por usuário e quatro por instalação permanece. Selecionar oito canais não significa assistir aos oito simultaneamente. A compatibilidade física ainda não foi homologada e a descoberta ONVIF permanece pendente.

## Evidências consultadas em 01/11/2026

- [Ficha oficial do MHDX 1208](https://backend.intelbras.com/sites/default/files/2022-04/Datasheet%20-%20MHDX%201208.pdf): oito entradas BNC e opções adicionais IP, fora do escopo deste perfil.
- [Manual oficial da família MHDX 1200](https://backend.intelbras.com/sites/default/files/2022-11/manual-usuario-mhdx-1204-1208-1216-1232.pdf): porta RTSP padrão 554, conforme trecho indexado. O documento completo excedeu o limite da ferramenta de leitura.
- [Orientação do suporte técnico Intelbras para gravadores MHDX](https://forum.intelbras.com.br/viewtopic.php?t=80246): acesso por IP do gravador, caminho realmonitor, canal e fluxos principal/extra. Esse padrão fundamenta o perfil; não substitui o teste do firmware específico.
- [Especificação HTTP/API Intelbras V3.59](https://botminio.apps.intelbras.com.br/dvr/HTTP_API_V3_59_Intelbras.pdf).

Testes automatizados cobrem todos os oito canais e os dois fluxos, rejeição de valores fora do perfil, caminho adulterado, manutenção do modo manual e da autorização por local. Não são testes de equipamento real.
