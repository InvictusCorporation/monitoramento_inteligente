# Monitoramento contínuo no servidor — 0.6.0

O servidor agora executa análises periódicas independentemente da página, da sessão de login ou dos testes de cinco minutos. Não é vídeo analisado quadro a quadro: continua sendo amostragem de imagens. Pessoas que passam entre as capturas podem não ser detectadas.

## Ativar

1. Feche o servidor, faça backup e copie o novo pacote sobre a instalação atual, preservando data e .tools. Reinicie INICIAR-INVICTUS e pressione Ctrl+F5.
2. Como administrador, abra Monitoramento → Monitoramento contínuo.
3. Escolha Ativado, intervalo entre análises, intervalo entre alertas e limite diário; salve. A ativação autoriza o servidor a enviar à OpenAI os recortes das câmeras com local e regra habilitados, nos horários configurados.
4. Feche apenas o navegador. Mantenha a janela INICIAR-INVICTUS aberta, computador ligado e sem suspensão, DVR e internet disponíveis.
5. Depois, abra novamente o painel. Confira a última tentativa por câmera e as ocorrências com imagens. Use Atualizar para consultar o estado recente.
6. Para parar, volte a Monitoramento contínuo, escolha Desativado e salve. Parar teste interrompe somente o teste do navegador, não o serviço contínuo.

Na atualização, o serviço começa desativado. Depois da primeira ativação, a opção é persistida: reiniciar o programa retoma o monitoramento automaticamente. Ainda não há serviço do Windows instalado nem início automático ao ligar o computador.

## Intervalos e consumo

- Intervalo entre análises: 30 a 3.600 segundos por câmera, padrão 60. Conta a partir da conclusão da tentativa; processamento e fila acrescentam tempo.
- Intervalo entre ocorrências da mesma câmera: 30 a 86.400 segundos, padrão 300. Aplica-se a análises manuais e automáticas. Suprime alertas repetidos, mas não impede novas consultas à API.
- Limite diário por empresa: 1 a 10.000 tentativas, padrão 100. Inclui análises manuais, testes e serviço. É persistente entre reinícios e reinicia à meia-noite UTC (21h em UTC−3). Ao atingi-lo, o serviço pausa e retoma no dia seguinte; também pode ser elevado pelo administrador.
- O limite é por quantidade, não por custo monetário. A cada 60 segundos, uma câmera poderia solicitar até 1.440 imagens em 24h antes de considerar processamento; o padrão de 100 não cobre um dia inteiro nessa frequência. Escolha o limite e os horários de acordo com o consumo autorizado.
- API com erro: aguarda pelo menos cinco minutos antes da próxima tentativa dessa câmera. Problemas de saldo ou credencial continuam exigindo correção.
- Até duas análises simultâneas e quatro processos de câmera compartilhados com vídeo ao vivo. A fila prioriza câmeras com tentativas mais antigas. Com todos os processos ocupados, o monitoramento aguarda capacidade.

## Controle de acesso e persistência

Somente administrador configura o serviço e seus limites. O último administrador que salva é o responsável registrado nas auditorias automáticas. Sua conta precisa permanecer ativa e com perfil de administrador; sair da conta não interrompe o serviço. Desativar a conta pausa novas análises e cancela a análise em andamento. Outro administrador pode salvar a configuração e assumir a responsabilidade.

Cada captura continua respeitando empresa, local, câmera, regra, horário e versão. Mudanças durante a análise invalidam seu resultado. Alterar a política do serviço cancela tarefas em andamento. As fotos continuam sendo gravadas junto das ocorrências e exigindo acesso autorizado. Ainda não há retenção automática por prazo; acompanhe o espaço do banco e backups.

Migração aditiva 6 cria monitoring_service e monitoring_jobs. A agenda e as últimas tentativas ficam no banco; reiniciar não zera o consumo nem antecipa a próxima captura. O encerramento pelo launcher aguarda cancelamento das tarefas antes de fechar o banco. O processamento deve rodar em uma única instância do servidor por instalação.

## Validação

Testes automatizados com câmera e API simuladas verificam execução sem sessões, limites compartilhados, passagem de dia, reinício do worker, horários, conta desativada, cancelamento, concorrência, fila e autorização da rota. A execução prolongada com o DVR e a API reais ainda deve ser conferida no computador instalado.
