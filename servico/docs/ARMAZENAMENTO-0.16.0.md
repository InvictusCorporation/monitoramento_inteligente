# Armazenamento de evidências — 0.16.0

Saúde do sistema mostra quantidade de fotos, tamanho somado das imagens, ocorrências sem foto e data da imagem mais antiga. Cada cartão de câmera mostra seus próprios totais. O filtro Local restringe o resumo; contas de cliente recebem somente o local autorizado, e empresas permanecem isoladas.

O tamanho representa os bytes dos JPEGs salvos. Não é o tamanho total do SQLite, não inclui índices, backups, vídeos ou espaço livre do computador. KiB corresponde a 1.024 bytes e MiB a 1.048.576 bytes. A data mais antiga é da evidência salva, não de ocorrências sem foto. Ocorrência sem foto pode ser um registro antigo ou criado por outro fluxo; o contador não afirma falha da câmera.

Consultar não carrega fotos no navegador, não captura imagens, não chama a IA e não remove registros. A atualização ocorre ao entrar na tela ou clicar em Atualizar diagnóstico. A consulta agrega metadados no servidor; bases muito grandes ainda precisam de avaliação de desempenho. Não há limpeza automática, retenção configurável, medição de espaço livre ou agendamento de backups nesta versão.

Feche o servidor, faça backup e atualize preservando data, .tools e backups. Reinicie e pressione Ctrl+F5. Abra Saúde do sistema, confira o resumo e altere o filtro Local. Os testes verificam contagens, bytes, ausência de fotos e isolamento entre empresas/locais; a conferência visual na instalação permanece necessária.
