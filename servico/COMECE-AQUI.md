# Testar o DVR no Invictus

1. Extraia todo o ZIP para uma pasta no computador conectado à mesma rede do DVR. Não execute os arquivos de dentro do ZIP.
2. Dê dois cliques em **INICIAR-INVICTUS.cmd**. Na primeira execução, aguarde o download do componente de vídeo (aproximadamente 109 MB). Mantenha a janela aberta.
3. A página de primeiro acesso será aberta. Informe seu nome/e-mail, crie uma senha para o Invictus e digite o usuário e a senha do DVR nos campos próprios.
4. Após o cadastro, o painel será aberto. Selecione **DVR Casa · Canal 1**, clique em **Testar conexão** e depois em **Ver ao vivo**.
5. Se aparecer um erro, copie apenas a mensagem ou envie uma imagem sem senhas. Não altere as configurações do DVR para tentar resolver sem identificar a causa.

O iniciador usa Node.js 24 instalado ou o runtime já presente neste computador. Se não encontrar, exibe orientação para instalar pelo site oficial https://nodejs.org/. Nenhuma senha padrão é criada.

Se o navegador não abrir, entre na pasta `data` e abra `ABRIR-INVICTUS.html`. Esse arquivo contém acesso temporário de instalação; não compartilhe. Depois da instalação, entre em http://127.0.0.1:8087 com empresa **invictus**, seu e-mail e a senha criada. O iniciador não apaga cadastros em execuções posteriores.

Dados pré-preenchidos: Intelbras MHDX 1208, IPv4 192.168.1.64, RTSP 554, canal 1, fluxo extra. O programa não se conecta pelo Intelbras Cloud e não altera o DVR. O usuário do DVR precisa ter permissão de visualização desse canal.

## O que o iniciador faz

- Instala FFmpeg de forma portátil dentro de `.tools`, sem mexer no PATH, no firewall, nas políticas do Windows ou em outros projetos.
- Obtém o ZIP e o SHA-256 publicado em https://www.gyan.dev/ffmpeg/builds/, fornecedor listado em https://ffmpeg.org/download.html. Confere o arquivo antes de extrair e executar. A comparação verifica a integridade em relação ao checksum obtido da mesma fonte HTTPS; não equivale a uma assinatura independente.
- Verifica se o executável oferece libx264. Usa versão já instalada quando válida e configurada.
- Inicia o serviço somente em 127.0.0.1:8087. Não publica o sistema na internet.
- Oferece primeiro acesso com código aleatório válido por uma hora e somente enquanto o banco está vazio.
- Cria o administrador, o local Casa, o canal 1 e a autorização do endereço. Guarda a senha do Invictus como hash e as credenciais do DVR com criptografia.

Para encerrar, feche o player e pressione Ctrl+C na janela do iniciador. Para retomar, execute o mesmo arquivo novamente.

## Situação da validação

A geração dos arquivos e os testes automatizados foram executados. O download e o acesso ao DVR foram bloqueados no ambiente do assistente. Portanto a instalação completa, a abertura automática do navegador e a transmissão real precisam ser confirmadas na execução pelo usuário. Os testes de vídeo existentes utilizam processo simulado. As limitações de isolamento de rede descritas em `docs/MODULO-03.md` continuam válidas.
