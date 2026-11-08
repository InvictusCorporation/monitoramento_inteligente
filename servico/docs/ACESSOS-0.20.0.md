# Redefinição de senha — 0.20.0

Em Usuários, o administrador pode clicar em Redefinir senha de outra conta da própria empresa. É necessário informar a senha atual do administrador, uma nova senha de 12 a 128 caracteres e repeti-la. Para a própria conta, use Alterar senha em Configurações.

Ao salvar, o servidor deriva a nova senha, encerra as sessões do usuário e solicita o encerramento dos seus players. As verificações de autorização também revogam trabalhos vinculados à sessão. A conta permanece com o mesmo perfil e estado ativo/desativado. O monitoramento contínuo da empresa é independente da sessão e não é desligado por uma troca de senha.

O Histórico registra a ação sem senha ou hash. A API exige administrador, empresa correta, origem/CSRF e senha atual, com limite de tentativas; revalida a sessão antes de gravar. A senha nova não é enviada automaticamente ao usuário, não há senha temporária com expiração nem troca obrigatória no próximo login nesta versão. Combine a entrega por canal seguro.

Faça backup e atualize com o servidor fechado preservando data, .tools e backups. Reinicie e use Ctrl+F5. Confira a versão 0.20.0. Para validar, use uma conta de teste, mantenha uma sessão dela aberta, redefina a senha pelo administrador e confirme que o próximo acesso exige a senha nova. Testes automatizados cobrem permissões, isolamento, validações, revogação e manutenção de conta desativada. Conferência visual na instalação ainda necessária.
