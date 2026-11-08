# Pausa de alertas por categoria — 0.41.0

O detector identifica presença, inclusive veículos estacionados. Finalizar uma ocorrência não impede novas detecções. Esta versão acrescenta uma pausa explícita por câmera e categoria.

## Usar

Em Ocorrências → Analisar, escolha em Após este atendimento: Finalizar e pausar alertas de veículos nesta câmera (ou pessoas/animais). Registre a observação e salve. A finalização e a pausa são gravadas juntas. A opção padrão mantém os alertas como estão.

Para voltar, abra uma ocorrência dessa câmera, escolha Reativar alertas da categoria e salve. Administradores também podem desmarcar a pausa em Monitoramento → Editar regra. As categorias pausadas aparecem no monitoramento e no detalhe das ocorrências.

## Alcance

- A pausa bloqueia toda a categoria naquela câmera, inclusive novos veículos, até reativar manualmente. Não reconhece o mesmo objeto, movimento, saída ou retorno.
- Outras categorias selecionadas e outras câmeras continuam conforme suas configurações. O vídeo ao vivo não muda.
- A pausa permanece após reiniciar o programa. Não há expiração automática.
- Se todas as categorias estiverem pausadas, não há novas capturas/análises pela IA. Se restarem categorias ativas, as análises continuam para elas e consomem a quota normalmente.
- Uma análise em andamento é descartada se a regra mudar. Uma chamada já enviada ao provedor pode ter custo.
- Ocorrências e fotos anteriores são preservadas. Outras ocorrências abertas não são finalizadas automaticamente; podem continuar aparecendo na fila e nos alertas de prazo.
- Administradores e operadores da empresa podem pausar pelo atendimento. Clientes finais não têm essa ação na ocorrência; suas permissões existentes de configurar a própria regra permanecem.
- A ação é auditada, exige nota na finalização e valida versão da ocorrência, empresa e categoria configurada.

## Implementação e teste

A configuração JSON da regra recebe pausedTargets, inicialmente vazio. Não exige migração de banco. Alterar a pausa incrementa a versão da regra, invalidando análises em andamento. Não altera chaves, quotas, DVR, resolução ou área de detecção.

Testes isolados com detector simulado verificam pausa total/parcial, reativação, reconstrução do detector, descarte de resultado em andamento, transação, permissões, CSRF e conflitos. Não houve acesso à câmera real nem chamadas pagas à API.

Após atualizar: pause veículos na câmera 2, confira o aviso e aguarde além do intervalo de repetição. Não devem surgir novas ocorrências de veículo dessa câmera. Reative e confira a retomada, respeitando horários, quota e intervalo configurados. Finalizar normalmente não pausa alertas.
