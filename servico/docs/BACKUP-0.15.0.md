> Atualização 0.31.0: há recuperação guiada em RESTAURAR-BACKUP e novos backups incluem capacity.json quando presente. A cópia recuperada pausa o monitoramento e encerra sessões antigas. Consulte RECUPERACAO-0.31.0.md; as instruções abaixo registram o comportamento original da 0.15.

# Backup local — 0.15.0

Na pasta extraída do sistema, abra FAZER-BACKUP. Aguarde a mensagem de conclusão e verificação. A cópia fica em backups/invictus-DATA-IDENTIFICADOR, com banco, camera.key e manifest.json. Cada execução cria uma pasta nova e não remove backups anteriores. Copie a pasta concluída para outro disco protegido: uma cópia no mesmo disco não protege contra defeito desse disco.

O banco inclui cadastros, usuários, ocorrências, imagens, regras, auditoria e credenciais criptografadas. A chave é necessária para recuperar as credenciais. O backup também inclui sessões existentes no banco. Quem tiver banco e chave pode recuperar dados sensíveis; não envie esse backup por chat nem coloque em pasta pública. O backup não é um arquivo criptografado. As permissões do Windows são herdadas da pasta de instalação.

Usa um snapshot SQLite por VACUUM INTO, incluindo dados confirmados no WAL. Pode funcionar com o servidor aberto; em caso de bloqueio ou erro, feche o servidor e execute novamente. Não copie manualmente somente o arquivo SQLite de uma instalação em execução. Nenhuma alteração é feita nos registros de origem. A ferramenta confere integridade SQLite e hashes SHA-256 antes de retirar o sufixo .incompleto da pasta. Não use pastas incompletas como backup concluído. O hash detecta alterações acidentais, não certifica autenticidade.

Não inclui executáveis .tools, código ou local-runtime.json (gerado pelo instalador), nem eventuais arquivos externos que o operador tenha colocado em data. Requer espaço para uma cópia integral do banco, da chave e possíveis temporários SQLite. Não há agendamento nem exclusão automática nesta versão.

## Recuperação manual

Use a mesma versão do programa ou uma posterior compatível. Feche o servidor antes de substituir qualquer arquivo. Preserve a pasta data atual inteira em outro local, para não misturar o WAL antigo com o banco restaurado. Em uma pasta data nova, copie monitoramento.sqlite e camera.key do mesmo backup concluído. Execute INICIAR-INVICTUS para preparar o ambiente e confira cadastros, fotos e câmeras. As configurações de monitoramento contínuo também são restauradas e podem voltar a analisar imagens quando o servidor iniciar.

Verificação adicional por terminal, sem restaurar: node scripts/backup-local.mjs --verify "CAMINHO_DA_PASTA_DO_BACKUP". Isso verifica integridade e hashes, sem acessar DVR ou IA.

## Atualização

Feche o servidor e preserve uma cópia da pasta data antes de atualizar. Extraia o pacote preservando data, .tools e backups existentes. Abra FAZER-BACKUP para testar a ferramenta na instalação. O pacote de distribuição não contém dados nem backups de clientes.

Testes automatizados usam um banco temporário com WAL, imagem e chave de teste; conferem recuperação dos bytes, preservação da origem, múltiplas cópias, alteração detectada e instalação incompleta. Não foi criado um backup dos dados reais do usuário durante o desenvolvimento.
