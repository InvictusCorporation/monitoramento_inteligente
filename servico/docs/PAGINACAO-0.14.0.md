# Navegação do histórico — 0.14.0

Ocorrências e Relatórios exibem 25 registros por página, com opções de 50 e 100. Os botões Primeira, Anterior, Próxima e Última indicam o intervalo e o total. Alterar filtros, local, ordenação, tamanho ou navegar pelo menu volta à primeira página. Após atualização dos dados, uma página que deixou de existir é ajustada para a última disponível.

O resumo usa todos os resultados filtrados. Exportar resultados CSV inclui todas as páginas do filtro, na ordem escolhida. Não há truncamento do relatório para o tamanho da página. Os detalhes e fotos continuam acessíveis pelo botão Analisar.

A paginação desta versão limita os elementos renderizados na tela. A API ainda entrega todo o histórico autorizado; não reduz o volume transferido nem resolve a escala de bases muito grandes. Paginação e agregação no servidor permanecem pendentes.

Atualização: feche o servidor, faça backup e substitua os arquivos preservando data e .tools. Reinicie pelo INICIAR-INVICTUS e pressione Ctrl+F5. Em Ocorrências, confira os controles abaixo da tabela. Com mais de 25 registros, avance e compare o CSV com o total. Com poucos registros, os botões indisponíveis ficam desabilitados.

Testes automatizados cobrem limites, páginas vazias, cobertura sem duplicação, redução por filtros e exportação integral. A conferência visual na instalação permanece necessária. Não há alteração de banco ou consulta à IA.
