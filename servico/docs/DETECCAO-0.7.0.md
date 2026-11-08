# Pessoas, veículos e animais — 0.7.0

Em Monitoramento → Editar regra, escolha O que detectar: Pessoas, Veículos ou Animais. Há uma categoria por câmera nesta versão. Altere também o nome da regra para identificar o uso, por exemplo Veículo no portão. Salve e use Analisar agora ou o serviço contínuo.

Regras existentes continuam detectando pessoas; nenhuma câmera passa automaticamente a detectar veículos ou animais. Uma resposta de categoria diferente da configurada é rejeitada. Ocorrências usam título próprio e preservam a mesma imagem recortada analisada. Veículos incluem carro, moto, caminhão, ônibus e bicicleta, parados ou em movimento. Animais são animais não humanos. Não há identificação de pessoas, leitura de placas, espécie garantida nem contagem de objetos.

Os mesmos limites diários, horários, acesso e supressão por câmera continuam aplicados. Trocar a categoria não zera o intervalo entre alertas: uma ocorrência recente pode suprimir outra até terminar o prazo. Múltiplas categorias na mesma câmera, movimento, cruzamento de linha e permanência ainda não estão implementados.

Para atualizar, feche o servidor, faça backup, substitua os arquivos do programa preservando data e .tools, reinicie e pressione Ctrl+F5. A chave continua salva. Se o serviço contínuo já estiver ativado, ele retoma automaticamente ao iniciar o servidor; desative-o antes de editar se quiser fazer somente testes manuais.

Teste cada categoria com uma cena autorizada contendo o alvo e outra sem o alvo dentro da área. Aguarde o intervalo entre análises e o intervalo entre alertas. Confira o título e a foto em Ocorrências. Animais pequenos, oclusão e baixa iluminação podem gerar falhas. A análise é por imagens periódicas, não por todos os quadros.

Não foi feita chamada real à API durante esta atualização. Os testes simulados verificam contrato, categorias aceitas, compatibilidade e gravação de título/imagem; precisão e conectividade reais precisam ser conferidas na instalação.
