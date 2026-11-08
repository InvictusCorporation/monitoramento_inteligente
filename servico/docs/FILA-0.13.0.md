# Fila de atendimento — 0.13.0

Em Ocorrências ou Relatórios, administradores e operadores podem filtrar por Sem responsável, Assumidas por mim e Assumidas por outros. A coluna Atendimento identifica quem assumiu e quando. A conta de cliente pode consultar o responsável, como já ocorria no detalhe, mas não recebe os filtros da central.

Somente abertas seleciona situações diferentes de Finalizada, preservando os demais filtros. A seleção Todos inclui também ocorrências finalizadas. Sem responsável por si só não significa aberta: combine os dois filtros para ver a fila pendente de atendimento. Para voltar, escolha Todos em Situação ou Limpar filtros.

Ordenações disponíveis: mais recentes, mais antigas ou prioridade (Alta, Média, Baixa) seguida das mais antigas. A lista, resumo e CSV usam a mesma seleção e ordem. Dados são os da última carga do painel; Atualizar busca novas alterações da equipe.

Assumir atendimento continua no detalhe da ocorrência, com proteção de concorrência no servidor. Esta versão não transfere responsáveis nem bloqueia outros usuários autorizados de registrar ou finalizar o atendimento. A fila não substitui a faixa de alertas existente.

Atualização: feche o servidor, faça backup, substitua arquivos preservando data e .tools, execute INICIAR-INVICTUS e pressione Ctrl+F5. Confira Sem responsável + Somente abertas; assuma uma ocorrência pelo detalhe e confira Assumidas por mim. Exporte CSV e compare a ordem. Nenhuma nova consulta à IA é feita.

Testes automatizados cobrem combinação de filtros, identidade por ID, inclusão de finalizadas quando solicitada, ordenação e exportação. Conferência visual na instalação permanece necessária.
