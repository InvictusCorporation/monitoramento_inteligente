# Alertas da central — 0.8.0

Administradores e operadores recebem uma faixa de alertas em todas as telas autenticadas. Consulta a fila a cada dez segundos sem reiniciar vídeos nem substituir formulários abertos. Mostra quantidade de ocorrências não finalizadas e ainda não assumidas, abrangendo todos os locais autorizados da empresa independentemente do filtro de câmera. A lista mostra as vinte mais recentes; todas permanecem disponíveis em Ocorrências.

Clique Ativar som para habilitar e ouvir um sinal curto de teste. Depois há um sinal por atualização que contenha novas ocorrências. As ocorrências já existentes ao entrar não disparam som. Silenciar som não assume nem finaliza ocorrências. A preferência é da sessão da página e volta a desligada após sair ou recarregar. O navegador e a aba precisam permanecer abertos; suspensão, restrições de áudio e economia de energia podem atrasar ou bloquear avisos. Não é notificação push nem serviço de sirene.

Na ocorrência, Assumir atendimento registra usuário e horário e muda o status para Em análise. Dois operadores não podem assumir simultaneamente: o primeiro registro vence e o segundo recebe aviso de conflito. O nome fica visível no detalhe e a ação é auditada. Finalizar continua exigindo registro da verificação. Assumir não bloqueia os demais usuários autorizados de revisar ou atualizar a ocorrência; transferência de responsável não foi implementada.

Clientes mantêm acesso às suas ocorrências, mas não recebem a faixa de alertas da central nem podem assumir atendimentos. Notificações diretas ao cliente permanecem pendentes e opcionais. Falha de conexão aparece na faixa, sem afirmar que a fila está atualizada.

## Atualizar e validar

Feche o programa, faça backup e substitua os arquivos preservando data e .tools. Reinicie e use Ctrl+F5. Não precisa reinserir a chave. O serviço contínuo previamente ativado retoma ao iniciar o servidor.

1. Entre como administrador e clique Ativar som: confira o sinal de teste.
2. Gere uma nova ocorrência, respeitando o intervalo entre alertas da câmera. Em até uma consulta da fila, deve aparecer o aviso e o sinal.
3. Abra a fila, escolha a ocorrência e clique Assumir atendimento. Confira nome, horário e Em análise.
4. Finalize após registrar a verificação. Teste Silenciar e confira que o aviso visual continua.

Migração aditiva 7, tabela event_claims. Rotas /api/alerts (GET) e /api/events/:id/claim (POST com versão e CSRF). Testes automatizados cobrem isolamento, autorização e disputa entre operadores. Som e comportamento visual precisam ser conferidos no navegador instalado. Nenhuma chamada real à IA foi necessária nesta atualização.
