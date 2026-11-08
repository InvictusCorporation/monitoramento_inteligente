# Invictus Monitoramento — organização das próximas entregas

## Implementado e validado pelo usuário até 0.5.1

Login e separação por empresa/local; conexão Intelbras MHDX 1208; vídeo no painel; regras de área e horário; detecção de pessoas pela OpenAI; ocorrência com imagem e revisão. O teste real de pessoa e foto foi confirmado pelo usuário. Isso não equivale a uma avaliação de precisão em diferentes ambientes.

## Implementado, aguardando validação real

- 0.6.0: serviço contínuo no servidor, intervalos, controle diário e retomada após reinício. Testes automatizados realizados; validação prolongada com DVR ainda pendente.
- 0.7.0: escolha de pessoas, veículos ou animais por câmera. Uma categoria por regra/câmera nesta versão; mesmos horários, área, prioridade e imagem. Regras anteriores continuam em pessoas. Categorias novas precisam de teste real.

## Ordem proposta para as próximas etapas

1. Operação: status de saúde e falhas por câmera, retenção de fotos, espaço disponível, backups e restauração verificada.
2. Regras: múltiplas regras e áreas por câmera, seleção da área sobre a imagem real. Múltiplas categorias na mesma área foram implementadas na versão 0.7.1, aguardando validação real.
3. Análise temporal: fluxo de quadros e rastreamento para cruzamento de linha, direção e permanência prolongada. Fotografias isoladas não comprovam esses comportamentos. Definir motor, capacidade do computador, atraso e critérios de teste antes de implementar.
4. Central: fila de atendimento, reconhecimento de alertas, aviso sonoro no painel, escalonamento e relatórios operacionais.
5. Evidências: clipes de vídeo antes/depois do evento, armazenamento e política de retenção.
6. Produtos comerciais: licenciamento por local/módulo, planos, white-label, implantação em servidor e acesso seguro pelo celular. Integração com a central Invictus Systems permanece pendente.
7. Comércio: sinais observáveis de movimentação para revisão humana, após validação temporal. Não inferir furto ou intenção criminosa a partir da aparência de uma pessoa.
8. Integrações externas: notificações autorizadas e sirenes compatíveis. Exigem destinos/equipamentos definidos e teste controlado.

## Critério de conclusão por módulo

Código e documentação no Git local, testes de acesso e falha, atualização que preserve dados, pacote de instalação e teste pelo usuário. Não marcar integração real, produção ou publicação como concluídas com base apenas em testes simulados. Ainda não houve publicação deste repositório em Git remoto nem implantação em produção.

## Atualização 0.8.0
Faixa de alertas, aviso sonoro no navegador e registro de responsável implementados, aguardando teste visual e sonoro pelo usuário. Escalonamento, notificações externas e sirenes permanecem pendentes.

## Atualização 0.9.0
Editor de área sobre fotografia real implementado, aguardando validação visual do alinhamento pelo usuário. Múltiplas áreas por câmera permanecem pendentes.


## Entrega 0.10.0 — Saúde do sistema

Diagnóstico por câmera com motivos de pausa, histórico de análise e tentativas automáticas, falhas e uso diário. Isolamento por empresa e local. Consulta sem captura ou uso da API. Não confirma conexão ao vivo. Retenção de evidências e backups automatizados continuam pendentes.


## Entrega 0.11.0 — Relatórios e filtros

Filtros compartilhados e exportação CSV coerente com os resultados, incluindo responsável e indicação de foto. Paginação de grandes históricos no servidor permanece pendente.


## Entrega 0.12.0 — Download de foto

Download autenticado de evidências JPEG com identificação no nome, isolamento por empresa/local e auditoria da solicitação. Sem novas capturas ou chamadas à IA.


## Entrega 0.13.0 — Fila de atendimento

Filtros por responsável e ocorrências abertas, ordenação por prioridade/antiguidade e coluna de atendimento. CSV e totais coerentes com a seleção. Transferência de responsáveis e escalonamento permanecem pendentes.


## Entrega 0.14.0 — Navegação do histórico

Paginação da tabela no navegador, 25/50/100 registros, mantendo totais e CSV completos. A API ainda envia todos os registros autorizados; paginação no servidor permanece pendente.


## Entrega 0.15.0 — Backup local

Ferramenta manual para snapshot SQLite e chave, verificação de integridade e hashes, múltiplas cópias sem sobrescrita. Agendamento, criptografia do backup e restauração assistida permanecem pendentes.


## Entrega 0.16.0 — Armazenamento de evidências

Resumo e totais por câmera de fotos, bytes e ocorrências sem evidência. Sem exclusões ou novas capturas. Retenção configurável e espaço livre de disco permanecem pendentes.


## Entrega 0.17.0 — Identificação da instalação

Versão e início do servidor na interface autenticada, com instruções de atualização e conferência para administradores. Atualização automática permanece fora do escopo.


## Entrega 0.18.0 — Histórico por ocorrência

Consulta de até 100 ações auditadas por ocorrência para a central, sem abandonar a edição. Versões anteriores do conteúdo das observações não estão armazenadas.


## Entrega 0.19.0 — Revisões de atendimento

Situação e observação antes/depois guardadas para novos salvamentos, na mesma transação de atualização/auditoria. Consulta pela central no histórico. Sem reconstrução de textos antigos.


## Entrega 0.20.0 — Gestão de acessos

Redefinição administrativa de senha por empresa, confirmação da senha do administrador, sessões revogadas e auditoria. Envio de credenciais e troca obrigatória no próximo acesso não implementados.


## Entrega 0.21.0 — Troca obrigatória de senha

Novas redefinições administrativas exigem senha pessoal diferente antes de liberar APIs do painel. Sessões revogadas após a troca. Não altera retroativamente contas ou cadastros existentes.


## Entrega 0.22.0 — Meus acessos

Contagem de sessões próprias e revogação das outras, preservando a atual. Sem identificação de dispositivos ou gerenciamento de contas de terceiros.


## Entrega 0.23.0 — Edição de nomes

Renomeação de câmeras autorizadas e locais pelo administrador, preservando vínculos, com auditoria e comparação do nome anterior para conflitos.


## Entrega 0.24.0 — Regras como modelo

Cópia para editor de outra câmera do mesmo local; regra desabilitada, área inteira e versão do destino preservada. Alteração somente ao salvar.


## Revisão 0.24.1

Corrigida perda do rascunho ao assumir atendimento. Teste de formulário simulado e suíte completa executados. Validação visual e operacional na instalação permanece necessária.


## Revisão 0.24.2

Controlador compartilhado de formulários protege contra respostas atrasadas de outra janela ou sessão. Testes simulados cobrem sucesso, erro e preservação da edição atual.


## Entrega 0.25.0 — Simulação de retenção

Consulta administrativa por local/prazo para fotos antigas de ocorrências finalizadas. Fotos abertas preservadas. Exclusão e agendamento não implementados.


## Entrega 0.26.0 — Base de crescimento

Meta informada: 10 a 50 clientes. Limites independentes de vídeo e captura, configuração por arquivo/ambiente e mosaico por páginas. Inicializadores usam 8 vídeos + 2 capturas por padrão. Testes simulam 16 vídeos + 2 capturas; capacidade real não medida. Próximos passos: confirmar câmeras/operadores, ensaio de carga, reutilização de streams e cotas, conectividade por local, banco/fila distribuídos e hospedagem isolada. Não houve implantação externa.


## Entrega 0.27.0 — Continuidade do vídeo

Renovação automática ao término do fluxo e reconexão com espera crescente, limite e cancelamento. Não repete erros de autenticação/permissão/configuração/capacidade. Testes simulados; ensaio prolongado com DVR e dois operadores ainda pendente. Próximo: compartilhamento de streams e cotas por operador; supermercado permanece para etapa posterior.


## Entrega 0.28.0 — Capacidade por conta

Teto por usuário aplicado no servidor e no mosaico. Referência configurável de 32 visualizações/16 por conta, sem ativação automática e sem validação de desempenho real. Consulte CAPACIDADE-0.28.0.md para os bloqueios antes do supermercado. Compartilhamento de vídeo permanece pendente.


## Entrega 0.29.0 — Transmissão compartilhada local

Um processo de vídeo por câmera/configuração, compartilhado entre espectadores autorizados. Entrada tardia com inicialização e fragmento completo, autorização individual, fila limitada por espectador. 108 testes aprovados e decodificação de vídeo sintético. Supera a pendência de implementação local citada na 0.28; validação visual prolongada, carga e infraestrutura distribuída permanecem pendentes. Consulte TRANSMISSAO-COMPARTILHADA-0.29.0.md para a lista antes do supermercado.


## Entrega 0.30.0 — Transferência manual

Responsável atual ou administrador redistribui para outro operador/administrador elegível da empresa, com motivo e histórico. Destinatário recebe aviso na faixa de alertas da página aberta. Migração 10 e 112 testes automatizados aprovados. Escalonamento automático, aceite e demais pendências de infraestrutura/comercial/backup seguem anteriores ao supermercado; consulte TRANSFERENCIAS-0.30.0.md.


## Entrega 0.31.0 — Recuperação verificada em pasta separada

Ferramenta RESTAURAR-BACKUP com cópia isolada, validação SQLite/hashes/chave, sessões removidas e monitoramento pausado apenas na recuperação. Backup de formato 2 inclui capacidade; formato 1 continua recuperável. 119 testes aprovados. Não substitui a instalação automaticamente. Agendamento, cópia externa e ensaio real permanecem pendentes antes do supermercado. Consulte RECUPERACAO-0.31.0.md.


## Entrega 0.32.0 — Alertas por prazo

Política por empresa, desativada por padrão, com prazos para assumir e atender após atribuição. Atrasos avisam responsável e administradores na faixa de alertas, sem alterar responsável/status. Migração 11 e 123 testes aprovados. Canais externos, aceite e procedimentos de escalonamento permanecem pendentes. Consulte PRAZOS-0.32.0.md para as demais etapas antes do supermercado.


## Entrega 0.33.0 — Backup automático e cópia externa

Agendador ligado ao servidor, configurado localmente, desativado por padrão, com processo separado, destino externo existente, verificação, estado persistido, intervalo e novas tentativas após falha. Compatível com caminhos personalizados do banco e chave. 130 testes aprovados. Ainda requer ensaio real, monitoramento externo de falhas e política de espaço/retenção de backups. Consulte BACKUP-AUTOMATICO-0.33.0.md para requisitos e pendências antes do supermercado.


## Entrega 0.34.0 — Estrutura comercial

Master local explícito, parceiras diretas isoladas, clientes com vários locais, licença patrimonial por local com plano textual, limite, validade e suspensão aplicados ao vídeo/IA/cadastro. Locais anteriores preservados como legado. 134 testes aprovados. Não inclui logo/cores/subdomínios, cobrança, integração Systems nem supermercado. Consulte COMERCIAL-0.34.0.md para ativação e pendências.


## 0.35.0 — Área master

Navegação separada, resumo comercial e pendências de licenças. Sem mudanças de banco ou licenças existentes. Demais pendências comerciais e infraestrutura permanecem; consulte MASTER-0.35.0.md.


## 0.35.1 — Correção de carregamento

Rota master.js liberada explicitamente e teste HTTP de todos os recursos da página. Sem mudança de banco.


## 0.36.0 — Clientes diretos no master

Cadastro, lista e vínculo de clientes/locais no master, usando escopo da própria empresa. Sem migração de banco. Parceiras e licenças continuam separadas. Pendências detalhadas em CLIENTES-MASTER-0.36.0.md.


## 0.37.0 — Catálogo de planos

Cadastro e edição versionada de planos patrimoniais, ativos/inativos e limite por local. Seleção nas licenças, preservando as condições anteriores até aplicação explícita. Migração 13 e restauração compatível. Sem preços/cobrança automática; demais pendências constam em PLANOS-0.37.0.md.


## 0.38.0 — Identidade visual por empresa

Master configura nome exibido, cor principal e logo própria/parceiras diretas. Aplicação depois do login, limpeza ao sair, versão concorrente e migração 14. Entrada compartilhada e domínios ainda não personalizados. 146 testes aprovados; validação visual real pendente. Consulte MARCAS-0.38.0.md.


## 0.39.0 — Retenção manual de fotos

Prévia vinculada ao administrador, confirmação explícita, lote máximo 500 e exclusão atômica de fotos antigas finalizadas. Ocorrências e auditoria preservadas. Sem agendamento/compactação. Migração 15. 150 testes da suíte mais 1 adicional de interface aprovados. Consulte RETENCAO-0.39.0.md.


## 0.40.0 — Alertas e clareza dos intervalos

Som ajustável (3/6/10 s e volume), consulta normal em 2 s, agenda de sucesso medida desde início e teste temporário separado da operação contínua. Sem alteração automática das quotas/configurações. 155 testes aprovados; latência real e som no dispositivo ainda precisam ser medidos. Consulte ALERTAS-0.40.0.md.
