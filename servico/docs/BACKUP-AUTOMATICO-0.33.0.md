# Backup automático com cópia externa — 0.33.0

O servidor pode criar um backup local e copiá-lo para uma pasta externa à instalação. A cópia externa só é marcada como concluída depois da verificação de integridade e hashes. A função começa desativada e não foi ativada em nenhuma instalação real durante o desenvolvimento.

## Configuração no computador do servidor

1. Prepare uma pasta existente em disco externo ou compartilhamento de rede protegido. A conta que executa o servidor precisa conseguir ler e escrever nela.
2. Abra CONFIGURAR-BACKUP na pasta da aplicação.
3. Escolha 1, informe o caminho completo da pasta e um intervalo inteiro de 1 a 168 horas. Por exemplo, 24 significa repetir após 24 horas de cada conclusão bem-sucedida.
4. Mantenha o servidor aberto. A configuração é consultada aproximadamente a cada minuto; não é necessário reiniciar para alterá-la. Sem histórico de sucesso para essa configuração, a primeira tentativa ocorre na próxima consulta.
5. Abra CONFIGURAR-BACKUP novamente para consultar a situação e a última conclusão. Confirme a pasta criada no destino. Depois faça um ensaio com RESTAURAR-BACKUP usando essa cópia externa.

Não informe senhas ou credenciais de rede no caminho. Use uma pasta já acessível pela conta do servidor. O sistema não cadastra contas de nuvem nem autentica compartilhamentos.

Para desativar, escolha 2. Uma cópia já em andamento pode terminar; as próximas não serão iniciadas. Pressionar Enter apenas consulta e sai.

## Funcionamento e falhas

- O backup roda em um processo separado do servidor web. Ainda utiliza disco, CPU e rede do mesmo equipamento; é necessário medir o impacto real na operação.
- Primeiro é criado o snapshot local em backups. Depois, os arquivos previstos no manifesto são copiados para o destino e verificados novamente. Cada execução cria pastas novas e não sobrescreve cópias anteriores.
- A ferramenta recusa destinos dentro da instalação, dentro das pastas efetivas do banco/chave ou que sejam ancestrais dessas pastas. Um caminho fora da instalação pode continuar no mesmo disco: a escolha de um disco externo ou rede independente cabe ao administrador.
- Disco ausente, falta de espaço, permissão ou falha de verificação geram erro. Não há destino local alternativo considerado como sucesso externo. Se a cópia local terminar e o envio externo falhar, a local pode permanecer disponível, mas a execução automática é registrada como falha.
- Depois de falha, uma nova tentativa fica prevista para aproximadamente quinze minutos, enquanto o servidor estiver aberto. Pastas .incompleto não são backups concluídos.
- Não há duas tarefas automáticas simultâneas na mesma instância. Use uma única instância por instalação; não há coordenação distribuída entre vários servidores.
- Cada tentativa tem limite de uma hora. Encerrar o servidor cancela o processo de backup que estiver em andamento, podendo deixar uma pasta .incompleto. Uma parada abrupta também pode deixar o estado registrado como em andamento; ao reiniciar, o servidor volta a avaliar a próxima tentativa prevista.

O intervalo conta da conclusão da cópia externa. Não é um horário fixo do dia. O serviço depende do servidor em execução: com o programa fechado, o computador desligado ou suspenso, não cria backups. Não foi criada uma tarefa no Agendador do Windows nem um serviço separado do sistema operacional.

## Conteúdo, capacidade e proteção

São copiados o banco, camera.key e capacity.json quando presente, conforme o formato 2 do backup. O banco contém dados de todas as empresas da instalação, fotos e credenciais criptografadas; a chave permite recuperar essas credenciais. Por isso, essa configuração é local, e não um controle disponível ao administrador de qualquer empresa pelo navegador.

Os arquivos não recebem criptografia adicional de pacote. Restrinja o acesso ao destino. Não há envio de dados para um serviço externo predefinido: o destino é a pasta escolhida pelo administrador.

Não há exclusão nem retenção automática de backups nesta versão. Reserve espaço para cópias locais e externas e acompanhe também as pastas incompletas. Cópias devem ser periodicamente testadas com RESTAURAR-BACKUP.

Configuração e situação ficam em data/backup-schedule.json e data/backup-schedule-state.json. Esses dois arquivos não integram o backup: uma instalação recuperada não passa a copiar dados para um destino antigo automaticamente. Reconfigure após a recuperação. A aplicação preserva caminhos personalizados de DB_PATH e CAMERA_KEY_PATH ao iniciar o processo de backup, em vez de copiar um banco padrão diferente.

## Validação e atualização

130 testes automatizados aprovados, incluindo cópia externa verificada, banco/chave personalizados, destino inválido, arquivo alterado, concorrência, intervalo e reinício, desativação, tentativa após falha, cancelamento e execução real de um processo filho com banco fictício. Nenhum backup real foi enviado ou agendado.

Faça backup e encerre o servidor antes de atualizar. Preserve data, .tools, backups e restauracoes. Não há nova migração de banco nesta versão. O pacote é cumulativo.

Continuam pendentes antes do supermercado: ensaio real de backup/recuperação e carga; conectividade remota e processamento distribuído; hierarquia comercial, licenças, planos e marca própria; integração Invictus Systems; procedimentos e canais externos de escalonamento; clipes antes/depois, retenção efetiva de evidências e piloto com clientes e acesso móvel. Monitoramento de falhas de backup fora deste computador também continua pendente.
