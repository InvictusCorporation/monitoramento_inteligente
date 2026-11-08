# Múltiplas categorias por câmera — 0.7.1

Em Monitoramento → Editar regra → O que detectar, marque uma, duas ou três categorias: Pessoas, Veículos e Animais. Ao menos uma deve permanecer selecionada. Salve e confira as escolhas ao reabrir a regra. Configurações anteriores mantêm sua categoria original; regras antigas sem categoria continuam em Pessoas.

Cada captura usa uma única imagem e uma única consulta à OpenAI, mesmo com três categorias. A resposta avalia cada categoria independentemente como presente, ausente ou inconclusiva. Isso não garante custo monetário idêntico: a cobrança da API depende do processamento e dos tokens.

Quando mais de uma categoria está presente, uma ocorrência reúne os tipos detectados e a mesma foto da captura, por exemplo Pessoa detectada + Veículo detectado. Categoria inconclusiva não aparece como detectada. Sem categorias confirmadas, nenhuma ocorrência é criada. Área, horário e prioridade continuam compartilhados pela regra da câmera.

O intervalo entre alertas continua por câmera, não por categoria. Portanto, uma ocorrência recente pode suprimir outra com categorias diferentes durante o intervalo configurado. Não há múltiplas áreas ou prioridades por categoria nesta versão. Som, notificações, cruzamento de linha e permanência prolongada permanecem pendentes.

Atualize com o servidor fechado, faça backup e preserve data e .tools. Reinicie e pressione Ctrl+F5. A chave da OpenAI não precisa ser informada novamente. Se o monitoramento contínuo estiver ativado, retoma ao reiniciar e passa a usar as categorias selecionadas assim que a regra for salva.

Teste com duas categorias na mesma imagem e confira o título e a foto da nova ocorrência. Os testes automatizados usam respostas simuladas; a precisão com as cenas reais ainda deve ser verificada na instalação.
