# Saúde do sistema — 0.10.0

A nova tela mostra o estado do monitoramento por câmera, usando as configurações e os registros existentes. Não faz uma conexão nova ao DVR, não captura fotos, não chama a OpenAI e não aumenta o uso da API. Para testar a câmera naquele momento, use Opções da câmera e o teste de conexão já existente.

Estados apresentados: conexão não configurada ou desabilitada, serviço de vídeo indisponível, regra ausente/inválida/desabilitada, local desabilitado, fora do horário, serviço contínuo desativado, responsável indisponível, IA indisponível, limite diário atingido, análise em andamento, última tentativa automática com falha/interrompida, primeira análise pendente, análise atrasada e próxima análise aguardada.

Pausas de configuração têm prioridade sobre falhas antigas. Histórico permanece visível: última análise concluída, resultado resumido, última tentativa automática, mensagem e horário registrado para nova tentativa. Esses registros não confirmam que a câmera está online agora. A análise concluída pode ter sido manual ou automática; mensagens de falha são as últimas tentativas automáticas. O resumo pode mostrar apenas a primeira categoria confirmada; o título da ocorrência reúne as categorias detectadas.

Considera atraso quando a câmera está elegível, sem trabalho em andamento, a próxima tentativa já venceu e o registro de atividade está mais antigo que o intervalo configurado mais 90 segundos. Isso é um sinal operacional, não confirmação de defeito. Todas as conexões de vídeo ocupadas podem atrasar a fila.

A tela respeita empresa e local do usuário; o filtro Local reduz os cartões mostrados. O contador diário continua por empresa, compartilhado entre câmeras. Atualizar diagnóstico consulta novamente os registros; não há atualização automática desta tela.

## Atualização e conferência

Feche o programa, faça backup, substitua os arquivos preservando data e .tools, reinicie e pressione Ctrl+F5. Abra Saúde do sistema. Confira as câmeras do local e o motivo indicado. Habilite/desabilite uma regra ou selecione um horário diferente, depois atualize o diagnóstico para verificar a mudança. Os ajustes de regra permanecem no menu Monitoramento.

Testes automatizados cobrem os estados, autenticação e isolamento. Nenhuma chamada real à IA ou ao DVR foi feita durante esta atualização. Retenção de fotos, backups automatizados e verificação de disco ainda estão pendentes.
