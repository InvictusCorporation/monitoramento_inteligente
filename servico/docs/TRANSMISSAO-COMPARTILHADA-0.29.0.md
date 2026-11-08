# Transmissão compartilhada — 0.29.0

Quando contas autorizadas abrem a mesma câmera, o serviço compartilha um processo FFmpeg. Antes eram dois processos para dois operadores; agora pode ser um processo com duas visualizações. As duas continuam contando para o teto global de visualizações e cada uma conta no limite do respectivo usuário.

O compartilhamento é limitado à mesma empresa, local, câmera, versão e configuração de conexão. Câmeras diferentes não são agrupadas, mesmo que apontem para o mesmo DVR. O benefício depende de quantas câmeras os operadores estão vendo em comum. Não há promessa de redução proporcional de CPU, e o envio de vídeo a cada navegador continua consumindo rede.

## Comportamento

- Cada visualização mantém sua própria autorização, revalidada ao entregar fragmentos e a cada dois segundos. Revogar uma conta encerra apenas suas visualizações. Dados já enviados ao navegador não podem ser recolhidos.
- Alterar/desabilitar a câmera encerra seu produtor e todas as visualizações associadas.
- Ao entrar depois, o navegador recebe a inicialização e o próximo fragmento completo. Isso pode acrescentar aproximadamente um intervalo entre quadros-chave à abertura, além do tempo de conexão.
- Uma conexão lenta é encerrada ao ultrapassar seu limite de fila, sem pausar as demais. O player mantém a reconexão limitada da versão anterior.
- Ao sair o último espectador, o processo é encerrado. A vaga de processo só é liberada após sua saída efetiva.
- Permanece a renovação de cinco minutos, com possível breve interrupção. Como o processo é compartilhado, a renovação do produtor pode afetar simultaneamente seus espectadores.
- Fotos e análises continuam usando o limite separado de capturas. Não compartilham o vídeo desta versão.

O limite padrão segue em oito visualizações. A referência de 32 visualizações e 16 por conta continua sendo uma configuração para validar no hardware real. Este recurso funciona em uma instância do servidor; não é uma plataforma distribuída entre máquinas.

## Verificação realizada

108 testes automatizados aprovados: recomposição de fragmentos, entrada tardia, separação de empresas/locais/versões/configurações, autorização individual, cotas, encerramento, consumidor lento, HTTP e regressões do sistema.

Foi gerado um vídeo sintético com os mesmos parâmetros de saída FFmpeg do sistema. Quatro fragmentos foram reconstruídos com leituras parciais. Um arquivo com a inicialização e os dois últimos fragmentos foi decodificado por FFmpeg sem erro, produzindo 30 quadros. Esse teste não utiliza imagens de clientes e não substitui a reprodução no navegador com o DVR real.

## Teste na central

1. Instale a atualização, reinicie o servidor e atualize a página dos dois navegadores.
2. Entre com duas contas autorizadas diferentes. Abra a mesma câmera na primeira e, depois de alguns segundos, na segunda.
3. Confira a imagem em ambas. Feche o vídeo ou saia da primeira conta: a segunda deve continuar.
4. Abra novamente na primeira conta. Confira que as duas voltam a funcionar.
5. Mantenha ambas por mais de 15 minutos para observar as renovações. Verifique atraso, falhas e consumo de CPU/memória/rede antes de aumentar a quantidade de vídeos.

Não foi feita validação visual nesta entrega nem teste de carga com 32 vídeos. A configuração de referência não é ativada automaticamente.

## Atualização e retorno

Feche o servidor antes de substituir a aplicação e preserve data, .tools e backups. Faça uma cópia da versão anterior. Não há migração de banco nesta versão; para retornar, encerre o servidor e restaure os arquivos da aplicação 0.28.0 preservando os dados. Não execute as duas versões ao mesmo tempo na mesma base.

## Pendências antes do supermercado

O compartilhamento local está implementado e testado automaticamente. Permanecem: validação prolongada no DVR/navegador real; teste com dois operadores e carga progressiva; conectividade remota por cliente; infraestrutura distribuída e hospedagem; empresas/parceiros, licenças, planos e marca própria; integração Invictus Systems; transferência/escalonamento de ocorrências; clipes antes/depois; retenção efetiva; backup externo e restauração; piloto móvel e com clientes reais.

A meta de planejamento é 10–50 clientes com 8–16 câmeras cada (80–800 cadastradas). Isso não equivale à capacidade de análise ou visualização simultânea já validada. O módulo de supermercado permanece posterior a essas etapas.

Referência técnica: [documentação oficial do formato MP4 do FFmpeg](https://ffmpeg.org/ffmpeg-formats.html#mov_002c-mp4_002c-ismv), opções frag_keyframe, empty_moov e default_base_moof.
