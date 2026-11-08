# Edição de nomes — 0.23.0

Em Câmeras > Opções > Editar nome, altere a identificação da câmera. Administradores e operadores podem editar câmeras da empresa; clientes, somente as do próprio local. O administrador também pode usar Clientes > Editar nome para renomear um local.

As alterações preservam identificadores e vínculos: conexões, regras, usuários e ocorrências permanecem associados aos mesmos cadastros. Telas, relatórios e nomes dos próximos downloads passam a mostrar o nome atual. Nomes antigos não são reconstruídos no histórico; a auditoria registra quem renomeou e quando, sem cópia dos textos.

O servidor valida tamanho, origem/CSRF e escopo. Se o nome foi alterado desde que o formulário abriu, devolve conflito e pede atualização. A comparação usa o nome anterior; não é um versionamento completo de cadastro. Não há mudança de local da câmera nem exclusão nesta versão.

Faça backup, feche o servidor e atualize preservando data, .tools e backups. Reinicie e pressione Ctrl+F5. Renomeie uma câmera de teste e confira regra, ocorrência e conexão. Testes cobrem permissões, conflito, validações e preservação dos vínculos; conferência visual na instalação permanece necessária.
