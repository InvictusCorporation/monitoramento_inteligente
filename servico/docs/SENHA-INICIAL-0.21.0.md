# Troca obrigatória após redefinição — 0.21.0

Novas redefinições administrativas marcam a conta para trocar a senha no próximo login. O usuário informa a senha recebida e escolhe outra, com 12 a 128 caracteres e confirmação. Não pode reutilizar a senha inicial. Ao salvar, as sessões são encerradas e o usuário entra novamente com sua senha pessoal.

Enquanto a troca está pendente, o servidor permite somente consultar a sessão, sair e trocar a senha. Câmeras, fotos, ocorrências e demais APIs ficam bloqueadas; não se trata apenas de esconder a interface. O monitoramento contínuo permanece independente das sessões.

A migração 9 adiciona o indicador aos usuários existentes, inicialmente desligado. Contas que tiveram a senha redefinida antes desta atualização não são marcadas retroativamente. Novos usuários cadastrados também não são marcados automaticamente nesta versão: a regra vale para a redefinição administrativa.

Faça backup antes de atualizar. Feche o servidor, preserve data/.tools/backups e reinicie. Use Ctrl+F5. Em uma conta de teste, redefina a senha, faça login com ela, escolha uma senha diferente e entre novamente. Testes verificam o bloqueio das APIs, recusa de reutilização, revogação e liberação após a troca; validação visual na instalação continua necessária.
