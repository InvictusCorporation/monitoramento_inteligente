# Meus acessos — 0.22.0

Em Configurações > Meus acessos, qualquer usuário autenticado com a troca de senha concluída pode consultar quantas sessões da própria conta ainda são válidas e quando expira a sessão atual. Encerrar outros acessos revoga todas as outras sessões válidas da conta, preservando a atual. Para atualizar a contagem, feche e abra a janela novamente.

A contagem representa logins com validade não expirada. Não identifica aparelhos e não afirma que os acessos estão em uso. Uma sessão encerrada exige novo login na próxima requisição; streams verificam a autorização periodicamente e podem levar alguns segundos para parar. Conteúdo já exibido em outra tela não é apagado remotamente. O monitoramento contínuo não depende dessas sessões e permanece funcionando.

A ação exige origem/CSRF e registra auditoria, sem expor cookies, hashes ou tokens. O servidor usa a identidade da sessão; não aceita escolher outra conta no pedido. Não há gerenciamento de sessões de terceiros nem troca de senha automática.

Faça backup, feche o servidor e atualize preservando data, .tools e backups. Reinicie e pressione Ctrl+F5. Teste com uma conta aberta em dois navegadores: encerre os outros acessos em um e tente atualizar o painel no outro. Testes verificam isolamento, CSRF, revogação e preservação da sessão atual. Validação visual na instalação permanece necessária.
