# Revisões de atendimento — 0.19.0

Cada salvamento da situação/observação pelo editor da ocorrência registra o conteúdo anterior, o novo conteúdo e as versões, ligado ao usuário e horário da auditoria. Em Ver histórico do atendimento, expanda Ver alteração. Os textos são exibidos como texto, sem executar HTML.

A gravação da ocorrência, auditoria e revisão ocorre na mesma transação. Um conflito de edição não cria revisão nem sobrescreve a mudança de outro usuário. Assumir atendimento continua como ação própria no histórico; revisões detalhadas são dos salvamentos pelo editor.

As mudanças anteriores a esta atualização não têm conteúdo recuperável. A tela mantém essas ações identificadas. Até 100 ações recentes são consultadas, incluindo acessos às fotos; revisões antigas continuam no banco mesmo se saírem desse limite da tela. Apenas administradores e operadores da empresa podem consultar o histórico operacional.

A migração 8 cria event_revisions sem alterar as observações atuais. Faça backup antes de atualizar; os backups posteriores incluem as revisões. Não há remoção automática dessas revisões nem recurso para restaurar uma delas como atual.

Atualize com o servidor fechado preservando data, .tools e backups, reinicie e pressione Ctrl+F5. Salve uma observação, altere-a e confira antes/depois em Ver histórico. Testes cobrem conteúdo, ligação com auditoria, conflito e permissões. A conferência visual e persistência na instalação continuam necessárias.
