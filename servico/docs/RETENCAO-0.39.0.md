# Limpeza controlada de fotos — 0.39.0

## Onde usar

Na Central de monitoramento, abra Saúde do sistema. Selecione o local desejado no filtro (ou todos os locais da própria empresa) e clique em Limpar fotos antigas. A função está disponível somente para administradores. A simulação anterior continua disponível e não exclui dados.

Informe o prazo em dias e clique em Conferir fotos elegíveis. O prazo inicial de 30 dias é apenas um preenchimento do formulário, não uma política automaticamente ativada. São elegíveis somente capturas anteriores ao corte, vinculadas a ocorrências finalizadas. Fotos de ocorrências abertas e recentes são preservadas.

A prévia mostra totais, tamanho das imagens e quantidade do lote. Cada execução remove no máximo 500 fotos. Clique em Revisar e confirmar exclusão e digite EXCLUIR FOTOS para executar. A prévia expira em cinco minutos, pertence ao administrador que a calculou e deixa de valer se o servidor reiniciar ou se os registros selecionados mudarem. Havendo mais fotos, é necessário calcular e confirmar outro lote.

## Efeito e cuidados

A exclusão das fotos é definitiva no painel. Guarde um backup anterior se precisar recuperar as imagens. Não há lixeira ou restauração individual nesta entrega. Os registros das ocorrências, observações e atendimentos permanecem. A tela informa quando a foto foi removida pela retenção; o Histórico da empresa registra a ação por ocorrência e administrador.

O tamanho do arquivo SQLite pode permanecer igual após a exclusão: o espaço interno fica disponível para reutilização. O tamanho exibido na prévia não é promessa de espaço físico liberado. Esta função não compacta o banco, não apaga backups e não executa limpeza automática. Backups anteriores podem continuar contendo as fotos.

O master não usa esta função para apagar fotos das parceiras: cada administrador opera somente os locais da própria empresa. Mudança de status/versão de ocorrência exige nova prévia. A execução e os registros de auditoria são atômicos; falha no lote reverte as exclusões. Uma confirmação consumida não pode ser repetida. Se a resposta da rede se perder, consulte o histórico e calcule nova prévia antes de continuar.

## Atualização e validação

Faça backup da instalação completa antes de substituir os arquivos. A migração 15 cria um índice de consulta do histórico; não exclui fotos ou ativa agendamento. A ferramenta de recuperação desta versão aceita bancos até a versão 15. Preserve data, .tools e configurações locais.

Foram aprovados 150 testes na suíte completa e 1 teste adicional da confirmação em tela. Cobertura: escopo entre empresas, administrador/CSRF, prazo, proteção de abertas, limite de lote, expiração, repetição, mudanças após prévia, falha de auditoria e preservação das ocorrências. Nenhum dado real foi excluído no desenvolvimento. A conferência visual fica para depois da instalação; para conhecer a tela, é suficiente calcular a prévia sem confirmar a exclusão.

Ainda pendentes: compactação/monitoramento físico de disco, preços/cobrança, domínios e implantação remota, ensaios reais de capacidade e recuperação, clipes de ocorrências, procedimentos externos de atendimento e módulo de supermercado.
