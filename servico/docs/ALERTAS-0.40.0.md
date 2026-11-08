# Alertas sonoros e intervalos — 0.40.0

## Mudanças

O aviso curto foi substituído por um som alternado com duração padrão de 6 segundos. Na faixa de alertas, escolha 3, 6 ou 10 segundos e ajuste o volume. Testar som permite conferir sem gerar uma ocorrência. Silenciar interrompe o som atual; novos sons não se sobrepõem. É necessário ativar o som por clique no navegador. As escolhas valem na página aberta e voltam ao padrão após recarregar. Volume audível depende também do dispositivo e do volume do sistema.

O painel consulta novos alertas 2 segundos após a resposta anterior, em vez de 10. Em erro, aguarda 10 segundos para tentar novamente. Não mantém requisições simultâneas, não recarrega câmeras e não toca para o histórico que já estava presente na primeira consulta. Abas em segundo plano e políticas do navegador podem atrasar execução e som.

Nas análises contínuas bem-sucedidas, o próximo intervalo conta desde o início da tentativa, sem acrescentar novamente todo o intervalo ao tempo de processamento. Se a análise durar mais que o intervalo, a próxima fica elegível após concluir, respeitando fila, limites e regras. Nunca há duas análises simultâneas da mesma câmera. Falhas mantêm espera após o término. A frequência efetiva de chamadas pode aumentar em relação à versão anterior; os intervalos configurados e limites diários permanecem.

## Entender os tempos

- 30 segundos é o intervalo do teste temporário e o menor intervalo configurável do serviço contínuo. Não é um prazo garantido de reconhecimento. A análise usa capturas por amostragem, não todos os quadros do vídeo.
- O tempo até um alerta inclui esperar a próxima captura, disponibilidade da fila, captura, processamento da IA, rede e atualização do painel. Movimentos entre capturas podem passar despercebidos.
- O bloqueio de repetição da mesma câmera é independente. Por padrão ele pode ser de 300 segundos; ele suprime novas ocorrências repetidas, não desliga a análise.
- O teste temporário termina após cinco minutos ou dez análises e não reinicia sozinho. Agora fica dentro de uma seção de diagnóstico recolhida.
- O serviço contínuo não tem duração de cinco minutos. Depende do servidor ligado, local/regra/horário/licença, IA e limite diário. A tela mostra última tentativa e próxima tentativa agendada.
- Erros do provedor podem impor espera de cinco minutos antes da nova tentativa. Essa proteção permanece.
- O vídeo ao vivo também usa uma sessão de cinco minutos com reconexão automática. A renovação da transmissão é independente da análise de IA e não foi removida nesta versão.

Não foi possível identificar pelo relato qual desses estados está ativo na instalação do usuário. A atualização não altera automaticamente suas configurações de serviço, intervalo, bloqueio de repetição ou quota.

## Validar após instalar

1. Confira Versão 0.40.0 após reiniciar o servidor e atualizar o navegador com Ctrl+F5.
2. Na Central de monitoramento, use Ativar som ou Testar som. Ajuste duração e volume.
3. Em Monitoramento → Configurar operação contínua, confira se o serviço está Ativado e revise intervalo, bloqueio de repetição e quota diária. O botão de teste não ativa operação permanente.
4. Observe a última tentativa e o próximo horário agendado. Se houver falha, registre a mensagem e se a oscilação ocorre na imagem ao vivo ou no registro da ocorrência.
5. Para medir atraso real, compare o momento de uma movimentação controlada com o horário do registro e com o aviso no painel. Os testes de código não medem a conexão real com o DVR/OpenAI.

155 testes automatizados aprovados: duração/cancelamento/sobreposição de som, frequência da consulta, cadência da análise, ausência de sobreposição por câmera e preservação da espera em falhas, além das funcionalidades anteriores. Não foram feitas chamadas reais à IA ou alterações na instalação do usuário.
