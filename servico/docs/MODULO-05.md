# Piloto de detecção de pessoas — 0.5.0

## Usar a chave já criada

Atualize a instalação existente, feche o servidor antes de copiar os arquivos e faça backup da pasta. Preserve data e .tools. Reinicie INICIAR-INVICTUS e pressione Ctrl+F5 no navegador.

Entre como administrador e abra Monitoramento → Configurar OpenAI. Cole a chave somente no campo protegido do aplicativo local e salve. Ela será criptografada com AES-256-GCM no banco de dados, vinculada à empresa e protegida pela chave data/camera.key. Não envie a chave por chat. Preservar o banco e camera.key juntos é necessário para restaurar a instalação. O campo fica vazio ao reabrir; deixe-o vazio para manter a chave existente. Desabilitar a análise impede novas solicitações e cancela as em andamento.

Nenhuma imagem é enviada ao salvar a chave. Cada análise solicitada envia uma imagem JPEG recortada da área configurada à API OpenAI e pode gerar cobrança na conta da API. A autorização do administrador permite aos usuários autorizados da mesma empresa solicitar análises das câmeras a que têm acesso. Clientes nunca recebem a chave.

## Teste com o DVR

1. Habilite a análise, o local Casa e a regra do Canal 1. Verifique os dias, horários e o fuso.
2. Clique Analisar agora. O servidor captura uma imagem atual via RTSP, recorta a área e consulta o modelo gpt-4.1-mini.
3. Com a área vazia, confira o resultado. Depois, faça um teste com alguém autorizado passando dentro da área e solicite nova análise após 30 segundos.
4. Quando houver pessoa detectada, abra Ocorrências e confira no vídeo antes de agir. Não há evidência de imagem armazenada nesta versão.
5. Use Testar por 5 minutos para uma sequência curta, mantendo a página aberta. Parar teste, trocar de tela ou fechar a página cancela as próximas capturas. Cancelamento não desfaz uma solicitação já processada ou cobrada pelo provedor.

## Limites

- É um piloto por amostragem, não vigilância autônoma 24 horas. Movimentos entre capturas podem ser perdidos. O modelo pode produzir falsos positivos ou negativos, especialmente em cenas escuras, distantes ou ocluídas.
- Intervalo mínimo de 30 segundos após cada análise; no máximo dez tentativas e cinco minutos por teste no navegador. O limite diário persistente é 100 tentativas por empresa, reiniciando à meia-noite UTC. Não equivale a limite em reais ou dólares. Erros após o envio também consomem o contador local.
- No máximo duas análises simultâneas no servidor. Capturas compartilham o limite de quatro processos de vídeo.
- Fora do horário, com local/regra/câmera desabilitados, ou acesso revogado, não é iniciada nova análise. Mudança de regra durante a análise descarta o resultado e não cria ocorrência.
- Pessoa claramente visível gera ocorrência Pendente com a prioridade da regra. Ausência ou incerteza não geram ocorrência. Repetições por câmera são suprimidas durante cinco minutos, inclusive se a ocorrência anterior foi finalizada.
- Não identifica pessoas, não reconhece faces, não infere furto, intenção ou crime. Não aciona sirenes, mensagens ou autoridades.
- Imagens ficam na memória local apenas durante a requisição. Usa store:false na Responses API; isso não é promessa de retenção zero pelo provedor. As políticas de processamento e retenção da conta OpenAI continuam aplicáveis.
- O editor de área ainda é esquemático. Confira o enquadramento antes de usar. Não há gravação de clipes nem reprodução de evidências no histórico.

## Implementação e verificação

Migração aditiva 4: ai_settings, ai_usage, ai_checks. Rotas autenticadas POST /api/ai/settings (administrador) e POST /api/cameras/:id/analyze. Estado público não inclui o segredo. Origem e CSRF são exigidos. Contagem diária é reservada antes do envio. Credenciais e erros brutos da API não são registrados nem devolvidos.

Captura FFmpeg sem shell com JPEG limitado a 4 MiB e timeout de 15 segundos. Ciclo completo limitado a 45 segundos, com revalidação de sessão e versões. JSON estrito com resultados person/absent/uncertain. Testes usam processo e API simulados: autenticação real da chave, saldo, conectividade OpenAI e imagem do DVR devem ser validados no computador instalado.

Referências oficiais consultadas:
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-4.1-mini
