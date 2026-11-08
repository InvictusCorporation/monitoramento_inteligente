# Respostas de formulários — 0.24.2

O controlador compartilhado dos formulários agora associa cada salvamento à janela e à sessão que o iniciaram. Se outro formulário for aberto antes da resposta, o resultado antigo não fecha a nova janela, não limpa seus campos, não troca sua mensagem de erro e não habilita seu botão Salvar. Uma mudança de sessão também invalida a resposta na interface.

A operação já enviada pode ser concluída no servidor. Fechar a janela não cancela nem desfaz o salvamento. Use Atualizar para conferir o resultado. Erros do formulário atual continuam visíveis, com o texto preservado. Campos são limpos após sucesso apenas se ainda pertencem ao formulário atual.

Testes de DOM simulado cobrem sucesso e falha atrasados, preservação da janela nova e funcionamento do formulário atual. A suíte completa foi executada. Esta correção não representa validação visual ou teste de DVR real.

Faça backup, atualize com servidor fechado preservando data/.tools/backups, reinicie e use Ctrl+F5. Confira a versão 0.24.2.
