# Continuidade do vídeo — 0.27.0

O player passa a reconectar após término do fluxo, falhas temporárias do servidor/rede, ausência de dados por 25 segundos ou falha de reprodução. Antes de uma nova tentativa, encerra leitor, requisição e MediaSource anteriores. As esperas são 2, 4, 8, 16, 30 e 30 segundos, limitadas a seis reconexões consecutivas. Após esgotar, o operador usa Reconectar ou reabre o vídeo.

Um fluxo que recebeu dados por uma sessão de pelo menos um minuto reinicia a contagem de tentativas. Assim, o encerramento periódico do servidor, ainda limitado a cinco minutos por requisição, pode abrir uma nova sessão automaticamente. Há intervalo de reconexão; não é vídeo ininterrupto sem perda de quadros nem gravação contínua. Aba suspensa pelo navegador ou computador suspenso não garante funcionamento.

Respostas 401 encerram o acesso e solicitam novo login. 403, 404, 409 e 429 não são repetidas automaticamente: revise permissão/configuração/capacidade e use Reconectar. Isso evita insistência de vários players quando o servidor já está cheio. Cada nova conexão passa pela autenticação e limites existentes. Sair da página, fechar player, substituir player ou sair da conta cancela a tentativa agendada. Não renova a sessão de login do usuário.

Não modifica DVR, horários, IA ou alertas. Os limites separados de vídeo e captura da versão 0.26.0 permanecem. A reconexão não substitui infraestrutura redundante, compartilhamento de streams ou reserva de capacidade por operador.

Testes com MediaSource, timers e respostas simuladas cobrem espera crescente, limite de tentativas, cancelamento, bloqueios de acesso/capacidade e renovação após fluxo longo. Ainda é necessário ensaio real superior a 15 minutos com DVR, além de interrupção e recuperação controlada de rede.

Faça backup, atualize com servidor fechado preservando data/.tools/backups, reinicie e use Ctrl+F5. Confira 0.27.0 e mantenha uma câmera aberta por mais de cinco minutos. Observe a mensagem de reconexão e o retorno da imagem. Depois repita com o mosaico e dois operadores, antes de ampliar a capacidade.
