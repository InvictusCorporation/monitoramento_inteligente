# Importação e integração

## Entrega disponível

O código da interface demonstrativa está em `interface/`, incluindo fontes, configurações, testes e imagens ilustrativas. Foram copiados 108 arquivos com conteúdo preservado. Os arquivos de exportação auxiliares e metadados internos do serviço de origem não foram incluídos.

A raiz mantém documentação e exclusões para arquivos locais. A cópia da interface é independente: não configura sincronização automática entre plataformas.

## Pendências operacionais

O serviço original de monitoramento ainda precisa ser importado. Esta interface usa dados simulados; não existe conexão real com DVR, RTSP, análise de IA, autenticação, banco de dados ou licenças nesta cópia.

1. Importar os arquivos de programa da versão existente e conferir a versão antes de modificar o código.
2. Excluir dados de clientes, imagens reais de câmeras, bancos, configurações privadas, chaves e backups.
3. Ler as instruções do projeto e adaptar a interface aos contratos reais de autenticação, vídeo, câmeras, análise, ocorrências e licenças.
4. Preservar autorização, proteção das operações e isolamento entre clientes e empresas no servidor.
5. Validar o acesso aos equipamentos na arquitetura de implantação escolhida. Uma hospedagem na nuvem não obtém automaticamente acesso a um DVR da rede local.
6. Testar login, vídeo, fotos, análise, atendimento, finalização, pausa e reativação, quotas, backup, restauração e recuperação após falhas.
7. Executar os testes do conjunto integrado e registrar os resultados antes da implantação operacional.

## Verificação da cópia

Os hashes SHA256 e tamanhos de todos os arquivos foram conferidos contra a exportação. As imagens foram transferidas como binários e seus identificadores de objeto Git conferidos. A integridade da cópia não substitui executar os testes no ambiente de implantação.

O registro de validação da interface está em `interface/docs/VALIDACAO-PREVIA.md`. A validação da interface e os testes de um serviço separado não comprovam, por si só, o funcionamento do conjunto integrado.
