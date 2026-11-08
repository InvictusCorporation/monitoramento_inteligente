# Vídeo sintético de teste

shared-video.mp4 contém quatro segundos de testsrc2 gerado localmente por FFmpeg 9.0.2, sem imagem de câmera ou dados de usuário. Entrada: testsrc2=size=320x180:rate=15. Saída: os argumentos a partir de -map em ffmpegArgs (server/video-gateway.mjs), por quatro segundos, salvos como MP4 em vez de pipe:1.

O arquivo contém quatro fragmentos e serve para testar a recomposição e entrada tardia. A inicialização mais os últimos dois fragmentos foram decodificados por FFmpeg com -xerror, -map 0:v:0 e saída framemd5, totalizando 30 quadros. Os testes HTTP usam esse conteúdo com processos simulados; não acessam DVRs reais.
