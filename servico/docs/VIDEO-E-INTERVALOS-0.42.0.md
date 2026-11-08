# Vídeo contínuo e intervalos menores — 0.42.0

## Mudanças

- O vídeo ao vivo não é mais encerrado obrigatoriamente após cinco minutos. O produtor e os espectadores não recebem um temporizador de duração por padrão. Continua sujeito à conexão, autorização e disponibilidade do computador.
- Sair, perder autorização, fechar o player ou alterar a conexão ainda encerra o acesso. A ausência de dados e falhas continuam causando encerramento/reconexão. Não há promessa de transmissão sem interrupções.
- Monitoramento → Configurar operação contínua aceita intervalo de 10 a 3600 segundos, incluindo 10 e 15. Configurações já salvas permanecem iguais até o administrador escolher outro intervalo.
- O limite mínimo interno entre análises passa de 30 para 10 segundos. A agenda do serviço respeita o intervalo selecionado e a capacidade; não abre duas análises simultâneas da mesma câmera.
- 10/15 segundos não são prazo garantido de alerta: captura, processamento, fila e rede podem acrescentar tempo. Se a análise demorar mais, o sistema aguarda terminar.
- A quota diária, o bloqueio de repetição (30 a 86400 segundos) e as pausas por categoria permanecem. Com quota 50, a IA poderá parar ao esgotá-la; isso não encerra o vídeo.
- Uma câmera a cada 15 segundos pode solicitar até 5760 análises/dia; a cada 10, até 8640, antes do processamento e dos limites. Nada aumenta a quota automaticamente.
- O teste temporário de diagnóstico continua com duração de cinco minutos, separado da operação contínua e do vídeo ao vivo. Erros da IA continuam com espera protetora antes da tentativa seguinte.

## Banco e validação

Migração 16 reconstrói apenas a tabela monitoring_service com limite mínimo de 10 segundos, preservando todos os valores existentes. A ferramenta de restauração foi atualizada para aceitar o esquema 16. Faça backup antes de atualizar; não volte a executar uma versão antiga sobre o banco atualizado.

Testes com dados isolados validam migração de configuração antiga, reabertura, 10/15 segundos, quota, ausência de sobreposição e vídeo ativo após seis minutos simulados, seguido de revogação de acesso. Não houve teste real no DVR nem chamadas pagas à API.

## Testar na instalação

Após atualizar, selecione 15 (ou 10) em Configurar operação contínua e salve. Confira o horário das tentativas e a quota diária. Deixe o vídeo ao vivo aberto por mais de seis minutos: não deve reiniciar apenas por completar cinco minutos. Se ocorrer queda, registre a mensagem para investigar rede, DVR ou processamento.
