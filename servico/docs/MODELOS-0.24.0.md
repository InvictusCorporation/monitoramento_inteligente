# Regra como modelo — 0.24.0

Em Monitoramento, escolha Usar outra regra como modelo na câmera de destino. Selecione uma regra de outra câmera do mesmo local e clique em Abrir no editor. São copiados nome, categorias, prioridade, dias, horários e fuso. A área volta à imagem inteira e a análise começa desabilitada no formulário.

Revise a região usando a foto da câmera de destino, confira os horários e decida se deseja habilitar. Nada muda no servidor até Salvar. Se o destino já tem regra, salvar substitui sua configuração; a regra de origem permanece intacta. Cancelar não muda nem desativa a regra já salva no destino.

Disponível para administradores e clientes autorizados a configurar regras; operadores continuam somente consultando. A lista usa câmeras e regras já autorizadas da mesma localização. O salvamento mantém os controles existentes de empresa/local, CSRF e versão de destino, impedindo sobrescrever uma alteração concorrente.

Carregar o modelo não captura imagem nem consulta IA. Capturar imagem usa a câmera de destino; habilitar e salvar pode iniciar análises se o serviço contínuo e o local estiverem ativos.

Faça backup, atualize com servidor fechado preservando data/.tools/backups, reinicie e use Ctrl+F5. Teste em duas câmeras do mesmo local e confira o estado desabilitado e área completa antes de salvar. Testes cobrem cópia independente, versão de destino, categorias legadas e validação da regra; conferência visual na instalação permanece necessária.
