# Recuperação de backups — 0.31.0

Esta versão acrescenta RESTAURAR-BACKUP.cmd. A ferramenta confere o backup, cria uma cópia recuperada dentro de restauracoes e não substitui a pasta data da aplicação. Cada execução usa uma pasta nova. Pastas com o sufixo .incompleto indicam falha e não devem ser usadas.

## Criar e recuperar uma cópia de teste

1. Na pasta extraída do programa, abra FAZER-BACKUP e aguarde a mensagem de conclusão. Anote a pasta criada dentro de backups.
2. Abra RESTAURAR-BACKUP. Cole o caminho completo dessa pasta de backup (a pasta que contém manifest.json, monitoramento.sqlite e camera.key) e pressione Enter. Aspas externas copiadas pelo Explorador são aceitas.
3. Aguarde a verificação. Abra a pasta informada dentro de restauracoes.
4. Leia LEIA-ANTES-DE-USAR.txt. O arquivo restoration-report.json informa quantidades de empresas, usuários, câmeras, ocorrências e fotos, além de sessões removidas e serviços pausados na cópia.

Esse procedimento pode ser realizado sem substituir o sistema que está atendendo. Ele não abre câmeras, não inicia o servidor e não faz requisições de IA. Um teste com cópia descartável deve anteceder a recuperação de produção.

## Colocar a recuperação em uso

Somente quando decidir usar os dados recuperados:

1. Faça um backup do estado atual e encerre o servidor.
2. Renomeie a pasta data atual para um nome novo, por exemplo data-anterior-DATA. Preserve-a para retorno. Não misture bancos nem arquivos WAL de estados diferentes.
3. Copie a pasta data inteira da recuperação para a pasta da aplicação, ocupando o lugar da antiga data.
4. Execute INICIAR-INVICTUS na versão atual ou posterior compatível. O iniciador recria local-runtime.json; pode precisar preparar novamente o componente de vídeo. Entre com as credenciais que existiam na data do backup.
5. Confira cadastros, fotos, ocorrências e câmeras. O monitoramento contínuo fica pausado na cópia recuperada: reative-o pelo painel apenas depois da conferência.

Os logins do backup são removidos da cópia, exigindo novo login. Senhas dos usuários, regras, configurações e credenciais criptografadas são preservadas. Chaves de API revogadas ou senhas do DVR alteradas desde o backup ainda precisarão ser atualizadas: a verificação criptográfica não consulta os serviços externos.

## O que é conferido

- Hash SHA-256 e tamanho de cada arquivo previsto no manifesto.
- Integridade SQLite e vínculos entre tabelas.
- Compatibilidade de estrutura do banco; versões de migração futuras são recusadas.
- Capacidade da chave restaurada de abrir todas as credenciais de câmeras e de IA presentes no banco, sem mostrar seus valores.
- Integridade final e resumo da cópia após remover sessões e pausar o serviço contínuo.

A ferramenta recusa transações WAL/journal externas ao manifesto. As verificações de hash detectam alterações, mas não comprovam a origem de um backup: use cópias confiáveis. As pastas de backup e recuperação contêm dados sensíveis e a chave de credenciais; não são criptografadas como um pacote. Os relatórios não incluem as credenciais.

## Configuração de capacidade

Novos backups usam manifesto de formato 2 e incluem data/capacity.json quando esse arquivo existir. Sua configuração é validada antes de concluir o backup. Os backups anteriores, de formato 1, continuam aceitos na recuperação.

Se capacity.json não estiver no backup, a ferramenta não inventa um arquivo: após a recuperação, valem os padrões do programa, salvo variáveis de ambiente. Variáveis de ambiente e executáveis não são copiados pelo backup. Ferramentas anteriores à 0.31 não verificam o novo formato 2; use esta versão ou uma posterior compatível.

## Validação e limites

119 testes automatizados aprovados. Os testes usam bancos temporários e credenciais fictícias: conferem fotos, capacidade, preservação da origem, pausa do serviço, remoção de sessões, recuperação repetida em pastas distintas, formato antigo, chave incompatível, arquivo alterado, configuração inválida e versão futura.

Nenhum backup real do usuário foi criado ou restaurado durante o desenvolvimento. Ainda faltam o ensaio na instalação real, o agendamento e a cópia externa protegida. Um backup no mesmo disco não cobre a perda desse disco. Nenhum arquivo antigo é removido automaticamente; reserve espaço para backups e recuperações completas.

## Atualização e próximas etapas

Encerre o servidor e preserve data, .tools, backups e restauracoes ao atualizar. Esta versão não acrescenta migração de banco à aplicação. O pacote é cumulativo e inclui as funções anteriores.

Antes do supermercado permanecem: teste prolongado de vídeo e carga com dois operadores; conexão remota por cliente e processamento distribuído; hierarquia comercial, licenças, planos e marca própria; integração Invictus Systems; escalonamento e procedimentos de plantão; clipes antes/depois e retenção efetiva; backup externo agendado e ensaio de recuperação real; piloto móvel e com clientes.
