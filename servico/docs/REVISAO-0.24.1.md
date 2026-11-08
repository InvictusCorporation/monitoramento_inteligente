# Revisão integrada — 0.24.1

Corrigido descarte de observações ainda não salvas ao clicar em Assumir atendimento. O formulário preserva o rascunho e a situação escolhida pelo operador; se a situação ainda era a original, acompanha Em análise após assumir. A ocorrência usa a versão atualizada para o próximo salvamento. A mensagem informa que o rascunho precisa ser salvo.

Assumir não grava automaticamente o texto. Se o usuário fechar o formulário ou sair da conta durante o pedido, a resposta não reabre aquela edição. Não há recuperação de rascunhos após fechar/recarregar o navegador.

Teste automatizado executa o manipulador do formulário com DOM simulado, verificando preservação de texto e situação sem gravação indevida. A suíte de servidor e regras foi executada. Não foi feita validação visual ou teste com DVR real nesta revisão.

Para conferir na instalação: abra uma ocorrência pendente, digite uma observação, clique em Assumir atendimento e confira o texto. Clique em Salvar, reabra e confirme o conteúdo. Faça backup e atualize preservando data, .tools e backups; reinicie e use Ctrl+F5.
