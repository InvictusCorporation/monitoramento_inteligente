# Regras de monitoramento — 0.4.0

## Entrega

Menu Monitoramento com ativação por local e uma regra de presença de pessoas por câmera. Cada regra armazena nome, habilitação, prioridade, dias, intervalo diário, fuso IANA e área retangular em porcentagem da imagem inteira. A área pode ser desenhada em um quadro esquemático ou preenchida por coordenadas; ainda não há imagem real nesse editor.

Administradores configuram os locais da própria empresa. Clientes configuram somente o próprio local. Operadores apenas consultam. Alterações são auditadas e exigem a versão atual para evitar sobrescritas concorrentes.

Dias indicam o início do intervalo. Segunda 22:00–06:00 inclui terça até 05:59. O fim é exclusivo. Horários iguais representam o dia inteiro nos dias selecionados. O horário exibido é calculado no fuso da regra ao carregar a tela; Atualizar recalcula esse indicador.

## Limites explícitos

Ainda não há detector, consumo de API, análise contínua, gravação automática, sirene ou geração de ocorrências por estas regras. A habilitação salva a intenção de monitorar. O futuro detector deverá exigir local habilitado, regra habilitada, câmera acessível e horário válido antes de processar eventos. Licenciamento comercial ainda não está conectado. Não há classificação de furto ou identificação de pessoas.

## Persistência e API

Migração aditiva 3 cria monitoring_locations e monitoring_rules sem remover registros anteriores. GET /api/monitoring respeita empresa e local. POST /api/monitoring/locations/:id altera enabled com version; POST /api/monitoring/cameras/:id salva regra completa com version. Sem regra, version é zero. Conflitos retornam 409. A resposta identifica detectorAvailable=false.

## Atualização e conferência

Feche o servidor e faça backup da pasta atual. Copie o conteúdo do ZIP sobre os arquivos da instalação existente, preservando data e .tools. Abra INICIAR-INVICTUS e use Ctrl+F5 no navegador. Não inicie uma instalação nova em outra pasta.

1. Abra Monitoramento e habilite a configuração do local Casa.
2. Crie uma regra no Canal 1, selecione dias, horários e fuso America/Belem.
3. Desenhe uma área ou mantenha a imagem inteira (0, 0, 100, 100).
4. Salve, atualize a página e confira os valores ao editar novamente.
5. Desabilite a regra ou o local e confirme a mudança.

Testes automatizados cobrem horários, entradas inválidas, isolamento, permissões, CSRF, versão e auditoria. Verificação visual no navegador do usuário continua necessária.
