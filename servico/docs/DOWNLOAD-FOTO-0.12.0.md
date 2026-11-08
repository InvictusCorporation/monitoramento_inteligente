# Download de foto — 0.12.0

Abra Ocorrências, clique em Analisar e em Baixar foto. O botão aparece somente quando há uma imagem salva. O navegador recebe o JPEG original guardado pelo sistema, sem recompressão, marca d'água ou nova captura. A imagem é o recorte analisado na detecção, não necessariamente o quadro inteiro da câmera.

O nome contém câmera, data em UTC e identificador da ocorrência. A câmera usa o nome atual do cadastro. O local de salvamento depende das preferências do navegador. A mensagem confirma a solicitação ao navegador, não a gravação efetiva no disco.

O servidor exige sessão ativa e aplica os mesmos limites de empresa e local usados para visualizar fotos. Registra no Histórico a solicitação de download. Esse registro não comprova que o usuário salvou o arquivo. Não há URL pública, chave de IA, senha de DVR ou imagem incluída no pacote da atualização. Nenhuma consulta à IA é feita pelo download.

Instalação: feche o servidor, faça backup, substitua arquivos preservando data e .tools, execute INICIAR-INVICTUS e pressione Ctrl+F5. Confira uma ocorrência com foto e outra sem foto. Baixe a foto, abra o JPEG e compare com Ver imagem. A validação visual na instalação continua necessária.

Testes cobrem autenticação, separação por empresa/local, revogação, preservação dos bytes, nome seguro e auditoria. A função não adiciona assinatura digital ou certificação pericial.
