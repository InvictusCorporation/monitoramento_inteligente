# Identificação da instalação — 0.17.0

O cabeçalho após o login exibe a versão do servidor. Configurações apresenta também a data/hora em que essa instância do servidor foi criada. O servidor lê a versão do package.json ao iniciar; substituir arquivos sem reiniciar não muda essa identificação.

Administradores recebem na própria tela as instruções para backup, substituição preservando data/.tools/backups, reinício e conferência funcional. Outros perfis recebem orientação para procurar o administrador. Não há atualização automática, verificação remota de versões nem instalação de pacotes pelo navegador.

Os metadados são devolvidos somente na API autenticada, sem caminhos locais, credenciais ou variáveis de ambiente. A versão não certifica que todos os arquivos foram substituídos corretamente. Atualize o pacote completo e use Ctrl+F5 após reiniciar.

Atualize preservando data, .tools e backups, reinicie e entre na conta. Confira 0.17.0 no cabeçalho e em Configurações. Testes de API verificam formato e conteúdo dos metadados; conferência visual na instalação continua necessária.
