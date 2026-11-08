# Transferência de atendimentos — 0.30.0

O responsável pode transferir uma ocorrência em aberto para outro operador ou administrador da mesma empresa. Administradores podem redistribuir qualquer atendimento da empresa, inclusive quando seu responsável foi desativado. Clientes finais não podem transferir nem consultar a lista de operadores.

O destinatário deve estar ativo e ter definido a própria senha. A lista não confirma presença online. A transferência é imediata, sem etapa de aceite. Não são permitidas transferências de ocorrências finalizadas, sem responsável, para o responsável atual ou para usuários de outra empresa.

## Como usar

1. Abra Ocorrências e escolha Analisar em um atendimento assumido.
2. Clique em Transferir atendimento, escolha o destinatário e informe o motivo (até 1.000 caracteres).
3. Confirme a transferência. O novo responsável aparecerá no atendimento e no filtro Assumidas por mim da conta destinatária após atualizar a lista.
4. Consulte Ver histórico do atendimento para conferir autor, data, responsável anterior, novo responsável e motivo.

O motivo é salvo ao transferir. A observação da verificação e seu status permanecem inalterados no banco. Se houver texto ainda não salvo no formulário, ele é mantido como rascunho local; clique em Salvar para registrá-lo. O destinatário não recebe esse rascunho enquanto ele não for salvo.

Se outro usuário alterar a ocorrência durante a operação, a versão desatualizada é recusada. Copie qualquer texto não salvo antes de atualizar a página. A gravação de responsável, versão e histórico é atômica: uma falha de banco desfaz toda a transferência.

## Alerta ao destinatário

A faixa de alertas passa a incluir ocorrências transferidas para a própria conta, identificadas como Transferida para você. Ela consulta o servidor aproximadamente a cada dez segundos enquanto a página está aberta. Cada transferência tem uma identidade própria; transferir novamente uma ocorrência conhecida pode gerar um novo aviso.

O som depende de ativação pelo usuário e das permissões do navegador. O primeiro carregamento não toca para o histórico já existente. O alerta permanece até a finalização ou transferência para outra conta; abrir a ocorrência não é um aceite nem remove o alerta. São exibidos até vinte itens, priorizando transferências para a própria conta, com o total informado.

Não há WhatsApp, e-mail, push em segundo plano ou mensagem direta ao cliente final nesta entrega. Escalonamento automático por prazo, aceite e procedimentos completos de plantão continuam pendentes.

## Validação e atualização

112 testes automatizados aprovados, incluindo isolamento entre empresas, papéis, destinatários inválidos, concorrência, reversão por falha de gravação, histórico, alerta individual e preservação do formulário. Não houve teste visual no navegador da instalação real nesta entrega.

Antes de atualizar, faça o backup e encerre o servidor. Preserve data, .tools e backups. A versão cria a tabela de histórico de transferências ao iniciar (migração 10), sem apagar registros existentes. Não rode duas versões simultaneamente na mesma base.

Teste com duas contas: a primeira assume uma ocorrência, transfere para a segunda com motivo e a segunda confere o alerta e o histórico. Valide também que uma ocorrência finalizada não oferece transferência.

## Continuidade antes do supermercado

Transferência manual e aviso ao destinatário estão implementados. Permanecem: escalonamento por prazo e procedimentos dos operadores; validação prolongada das câmeras e da carga; conectividade remota e processamento distribuído; hierarquia comercial de empresas e clientes, licenças, planos, marca própria e integração Invictus Systems; clipes antes/depois; retenção efetiva; backup externo agendado e restauração validada; piloto móvel e com clientes reais.
