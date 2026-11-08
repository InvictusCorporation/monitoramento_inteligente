# Área de vigilância sobre a fotografia — 0.9.0

Abra Monitoramento → Editar regra → Área de vigilância → Capturar imagem da câmera. O sistema busca uma fotografia atual do enquadramento inteiro e a coloca no editor. Arraste com mouse ou toque sobre ela para selecionar o retângulo. Os campos de porcentagem são atualizados; também é possível ajustá-los pelo teclado. Usar imagem inteira restaura 0, 0, 100, 100. Clique Salvar para aplicar.

A fotografia mantém sua proporção original; as coordenadas continuam em porcentagem da imagem inteira. Recarregar uma foto não modifica a seleção. Se a captura falhar, a foto anterior é mantida com aviso; sem foto anterior, o quadro permanece esquemático. É uma imagem estática: capture novamente se a câmera mudar de posição. Não é vídeo ao vivo.

A prévia usa o DVR e não chama a OpenAI, não cria ocorrência e não consome o contador diário de IA. Não é salva como evidência nem adicionada ao banco. A fotografia permanece na memória da página enquanto o editor estiver aberto. O serviço contínuo, quando ativado, continua seguindo a regra anterior até Salvar; esta atualização não o desativa.

A rota POST /api/cameras/:id/preview exige sessão, origem e CSRF. Respeita empresa/local, conexão habilitada e versão; revalida durante a captura e antes de devolver a imagem. Abrir outra tela, sair ou fechar o editor cancela a solicitação. A captura compartilha a capacidade do gateway com vídeos e análises; se estiver lotado, feche um vídeo e tente de novo. Limite de 60 solicitações de prévia por usuário a cada 15 minutos.

## Atualizar e testar

Feche o programa, faça backup e substitua os arquivos preservando data e .tools. Reinicie e pressione Ctrl+F5. Não precisa cadastrar novamente câmeras, regras ou chave.

Capture a foto, selecione uma região pequena e confira as porcentagens. Salve, reabra e capture novamente: a área deve coincidir. Depois faça uma análise dentro do horário configurado e confira se a foto da ocorrência corresponde ao recorte. A gravação de foto da ocorrência continua independente da prévia.

Testes automatizados verificam resposta JPEG, captura integral, ausência de chamadas à IA e isolamento. O alinhamento visual e o desenho por toque precisam ser conferidos no navegador e na câmera reais. Múltiplas áreas na mesma câmera continuam pendentes.
