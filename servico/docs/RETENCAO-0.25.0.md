# Simulação de retenção — 0.25.0

Administradores encontram Simular retenção em Saúde do sistema, no resumo de fotos. A simulação usa o local selecionado e um prazo de 1 a 3650 dias; 30 é apenas o valor inicial do formulário, não uma política ativada.

Entram no resultado fotos capturadas estritamente antes de agora menos o prazo, vinculadas a ocorrências atualmente Finalizadas. A conta é de dias completos de 24 horas. Fotos antigas de ocorrências abertas são contadas separadamente e preservadas. Capturas exatamente no limite não entram. O tamanho soma bytes JPEG, não estima redução imediata do arquivo SQLite ou espaço livre do disco.

Esta versão somente consulta. Não grava preferência, não agenda limpeza, não apaga imagens ou ocorrências e não consulta IA. Os totais podem mudar quando outras ocorrências forem finalizadas. A API é restrita a administradores e à própria empresa, com validação de local e prazo.

Faça backup e atualize com servidor fechado, preservando data/.tools/backups. Reinicie e pressione Ctrl+F5. Confira Saúde do sistema > Simular retenção. Testes cobrem limites de data, status, contagem de bytes, isolamento, permissões e ausência de alterações. Validação visual na instalação permanece necessária.
