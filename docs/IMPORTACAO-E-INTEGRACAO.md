# Importação e integração

## Etapas concluídas

- Interface demonstrativa importada em `interface/`, preservando fontes, configurações, testes e imagens.
- Serviço original 0.42.0 recuperado em `servico/`, preservando 152 arquivos e passando novamente nos 162 testes originais.
- Arquivos conferidos por hash. Dados da instalação, chaves, banco, ferramentas baixadas e backups não foram importados.

## Etapa atual

Conectar a interface visual ao serviço já existente. A interface ainda usa dados simulados; a presença do código do serviço não a conecta automaticamente às câmeras ou aos dados reais.

1. Adaptar autenticação, sessão, troca inicial de senha e CSRF.
2. Carregar câmeras, clientes/locais e ocorrências reais respeitando escopos e licenças.
3. Conectar vídeo e imagens aos endpoints autenticados existentes.
4. Persistir atendimento, finalização, notas, pausa/reativação e regras com controle de versão.
5. Integrar permissões operacionais e gestão master, sem confundir os perfis.
6. Preparar interface e API na mesma origem autenticada em uma implantação compatível com Node, SQLite e FFmpeg.
7. Validar os fluxos integrados, falhas de conexão, expiração de sessão e persistência antes da operação real.

O mapa dos contratos reais está em `VALIDACAO-SERVICO-ORIGINAL.md`. Não criar APIs paralelas ou substituir o serviço por fixtures. A hospedagem da interface não oferece automaticamente acesso a um DVR em uma rede local.
