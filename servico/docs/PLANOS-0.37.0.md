# Catálogo de planos — 0.37.0

## Fluxo no master

1. Abra Gestão master → Planos → Novo plano.
2. Defina nome, limite de câmeras por local (1 a 256) e situação ativa. O módulo disponível é patrimonial.
3. Abra Empresas e licenças, escolha o local e clique em Configurar licença.
4. Em Selecionar do catálogo, escolha o plano. Nome e limite são preenchidos. Defina situação e vencimento do local e salve.

O catálogo é da sua empresa master e pode ser aplicado aos locais próprios e de parceiras diretas. Administradores sem master não podem editar ou selecionar planos pela API comercial. Dados operacionais das parceiras continuam isolados.

## Condições preservadas

Editar nome ou limite do plano não altera licenças existentes. Desativar um plano impede novas seleções e não suspende clientes existentes. Para aplicar novas condições, abra cada licença, selecione novamente o plano e salve. O servidor verifica a versão do plano, a versão da licença e a quantidade de câmeras já cadastradas. Uma seleção desatualizada exige atualizar a página.

Manter condições atuais / personalizadas conserva nome e limite exibidos para edição manual. Ao salvar sem seleção do catálogo, a licença passa a ser personalizada. O vínculo de origem com plano/versão é registrado quando há seleção. Mudanças de licença encerram as transmissões atuais do local, como nas versões anteriores.

Não há preço, cobrança automática, emissão de boleto, pagamento ou contrato neste catálogo. A personalização visual por parceira, implantação remota, ensaios reais de capacidade/recuperação e módulo de supermercado permanecem pendentes.

## Atualização e recuperação

Faça backup antes de atualizar. Esta versão acrescenta a migração 13 com tabelas de planos e seleção aplicada à licença; não cria planos de exemplo nem altera licenças atuais. A ferramenta RESTAURAR-BACKUP desta versão aceita bancos até a versão 13. Não use uma ferramenta antiga para recuperar o novo banco. Para voltar à versão antiga, use uma cópia íntegra anterior à atualização, sem sobrescrever o banco novo.

Siga ATUALIZAR-PAINEL.md e confira 0.37.0 no cabeçalho. Preserve data e .tools. Não é necessário reativar master nem cadastrar câmeras novamente.

## Validação

Testes HTTP cobrem permissões, CSRF, isolamento entre empresas, validação de campos, edição concorrente, aplicação a cliente direto/parceira, versão desatualizada, plano inativo, preservação das licenças e migração repetida. Testes de interface cobrem escape de nomes, respostas antigas, payload de edição e seleção de plano. A conferência visual no navegador e com o DVR real continua necessária após instalar.
