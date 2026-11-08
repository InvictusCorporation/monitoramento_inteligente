# Ocorrências e relatórios — 0.11.0

Ocorrências e Relatórios passam a compartilhar filtros de busca, situação, câmera, prioridade e datas inicial/final. O filtro Local permanece no topo. Limpar filtros mantém o local escolhido. Ao trocar o local, a câmera selecionada é limpa. Sair da conta limpa os filtros.

As datas usam o fuso do computador que abriu a página, incluindo todo o dia final. Não são o fuso da regra da câmera. Um período invertido mostra aviso e nenhum resultado. Os filtros de câmera e período permanecem ao navegar entre as duas telas; a busca textual é limpa na navegação, como nas demais páginas.

O CSV agora exporta exatamente os resultados filtrados, corrigindo o comportamento anterior que ignorava busca e situação. Inclui local, responsável que assumiu atendimento, data do atendimento, indicação de foto e observação. As datas do CSV estão em UTC e os cabeçalhos indicam isso. As fotos não são embutidas: abra a ocorrência e use Ver imagem. O arquivo usa UTF-8 com BOM, ponto e vírgula, aspas escapadas e neutralização de fórmulas.

Os dados continuam vindo da API autenticada existente, restrita à empresa e ao local autorizado. A tela usa a última carga do painel; Atualizar busca novos dados. Não faz consultas à IA, não captura imagens e não modifica ocorrências. Ainda não há paginação no servidor; grandes históricos exigirão essa evolução.

## Instalação e conferência

Feche o programa e faça backup. Substitua os arquivos preservando data e .tools. Execute INICIAR-INVICTUS e pressione Ctrl+F5 no navegador.

Em Relatórios, escolha um local, período e situação. Confira os totais e a lista. Exporte CSV e compare as linhas; a primeira linha contém os cabeçalhos. Teste um período sem resultados e Limpar filtros. Use uma conta de cliente para conferir que somente o local autorizado aparece.

Testes automatizados verificam limites de datas locais, combinação de filtros e proteção do CSV. A validação visual na instalação e com dados reais permanece necessária.
