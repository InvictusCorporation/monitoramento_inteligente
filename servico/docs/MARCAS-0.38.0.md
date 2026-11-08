# Marcas das empresas — 0.38.0

## Configurar

Entre como master e abra Marcas das empresas. Clique em Personalizar na sua empresa ou parceira direta. Defina o nome exibido (até 24 caracteres), a cor principal e, opcionalmente, a logo. Salve e atualize as sessões da empresa para visualizar.

A logo aceita PNG, JPEG ou WebP de até 2 MB e 4096 × 4096 pixels na seleção. O navegador reduz para até 256 pixels e converte para PNG; o arquivo final deve ter até 96 KB. Imagens muito complexas podem exceder esse limite. Use Remover logo e Salvar para voltar ao símbolo padrão. O nome jurídico e o código de login não são alterados.

A cor é aplicada aos botões principais e itens selecionados da navegação. O texto desses elementos usa preto ou branco conforme o contraste. Alertas e prioridades mantêm suas cores. Ao sair, a marca da sessão é removida. A entrada compartilhada permanece Invictus; não há domínio ou tela pública de login por parceira nesta versão.

## Permissões e preservação

Somente master gerencia essa identidade visual pela nova área. O escopo é a própria empresa e suas parceiras diretas. A operação continua permitindo ao administrador editar o nome exibido pelo ajuste anterior, preservando logo e cor. Edições simultâneas são detectadas pela versão do cadastro.

Não há mudança de licenças, câmeras, usuários ou concessão de acesso às imagens das parceiras. A alteração aparece no próximo carregamento do painel; não força encerramento de sessões.

## Instalar

Faça backup da pasta completa antes da atualização. A migração 14 acrescenta a identidade visual no banco e não cria logos ou cores personalizadas automaticamente. Preserve data, .tools e configurações locais. Siga ATUALIZAR-PAINEL.md e confira 0.38.0 no cabeçalho.

O backup do banco inclui as marcas. A ferramenta de recuperação desta versão aceita bancos até a versão 14. Ferramentas antigas não devem restaurar o banco novo; para retornar a uma versão anterior, utilize backup anterior compatível em pasta separada.

## Validação e pendências

146 testes automatizados passaram. Os novos testes verificam validação de cor/PNG/tamanho, escopo entre empresas, CSRF, edição concorrente, preservação da logo ao alterar o nome e remoção da marca ao sair. A conferência visual e seleção de uma logo real no navegador ficam para validação após instalar.

Ainda pendentes: cobrança e preços, domínios próprios e implantação remota, testes reais de capacidade e recuperação, procedimentos externos de atendimento e módulo de supermercado. Esta entrega é a personalização do painel autenticado, não uma implantação white-label completa.
