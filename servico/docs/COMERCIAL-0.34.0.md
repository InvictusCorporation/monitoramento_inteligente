# Estrutura comercial — 0.34.0

Esta entrega implementa gestão master de empresas parceiras diretas, clientes com vários locais e licenciamento patrimonial por local. É uma base comercial funcional; não representa a conclusão de toda a plataforma white-label nem sua instalação no ambiente real.

## Instalar e habilitar o master

1. Faça backup com a versão atual e encerre o servidor.
2. Atualize usando apenas este pacote cumulativo. Preserve data, .tools, backups e restauracoes. A primeira abertura aplica a migração 12 sem apagar os registros anteriores.
3. No computador do servidor, abra CONFIGURAR-MASTER. Informe o código da sua empresa e o e-mail do administrador já existente, ativo e com senha própria definida. Digite ATIVAR.
4. Atualize o painel do navegador. Esse usuário terá o menu Gestão comercial. O comando também permite REMOVER o acesso master. Remover a permissão não apaga empresas, licenças nem desliga o controle comercial.

O acesso master não é concedido automaticamente a todos os administradores. Configure-o somente para quem administrará a comercialização da plataforma. O comando exige acesso local ao banco; em instalações com DB_PATH personalizado, ele usa essa variável.

## Empresas parceiras e marca

Em Gestão comercial, escolha Empresa parceira e informe nome, código único de acesso, administrador, e-mail e senha inicial. A empresa e seu administrador são criados juntos. O administrador precisa definir uma senha própria no primeiro acesso. O sistema não envia credenciais por mensagem ou e-mail.

A parceira entra com seu código e possui seus próprios usuários, clientes, locais, câmeras, regras e ocorrências. Pode alterar o nome textual exibido na marca pelo menu Configurações. O master vê dados comerciais de sua empresa e parceiras diretas; essa permissão não permite abrir as imagens ou ocorrências delas pela API.

Não há cadeia de revenda em múltiplos níveis nesta interface. Outras empresas independentes da instalação não aparecem no catálogo daquele master.

## Clientes e locais

Em Clientes e locais:

- Novo cliente cadastra a pessoa ou empresa atendida pelo nome.
- Novo local cadastra uma unidade, podendo vinculá-la a um cliente.
- Vincular cliente associa um local existente ao cliente correto da mesma empresa.

Um cliente pode ter vários locais. Câmeras, regras e licenças continuam vinculadas ao local. Locais anteriores ficam preservados e podem ser vinculados gradualmente. O perfil de acesso Cliente continua restrito a um local; acesso de uma única conta a várias unidades será uma etapa posterior.

Esta versão ainda não inclui cadastro fiscal, contatos completos, contratos, catálogo de produtos ou faturamento. O nome do plano na licença é uma referência comercial textual, sem cobrança automática.

## Licença por local

No menu Gestão comercial, o master escolhe Configurar licença no local desejado e define:

- Módulo patrimonial (único habilitável nesta entrega).
- Plano/referência comercial.
- Situação ativa ou suspensa.
- Limite de 1 a 256 câmeras cadastradas no local.
- Data e hora de vencimento, ou prazo indeterminado.

O horário do formulário é interpretado no fuso do computador e armazenado em UTC. No instante do vencimento, a licença deixa de permitir operação. O limite não pode ser reduzido abaixo do número de câmeras já cadastradas. O limite comercial não indica capacidade de processamento: permanecem os limites globais e por operador do servidor, e é necessário validar o hardware.

Novas parceiras exigem licença em cada local. Na central habilitada comercialmente, novos locais também aguardam licença. Os locais existentes antes da migração 12 ficam marcados como Legado — licença não configurada, preservando sua operação até que o master configure uma licença explícita. Instalações independentes ainda não habilitadas comercialmente mantêm o comportamento anterior. Essa compatibilidade não é comprovação de contrato ou pagamento.

Uma licença pendente, suspensa ou vencida bloqueia novas câmeras, vídeo ao vivo, teste de vídeo, prévia e análise de IA manual/contínua. O servidor aplica o bloqueio independentemente dos botões do navegador. Histórico e fotos já salvas permanecem acessíveis conforme as permissões da conta. Configuração e metadados continuam disponíveis para correção.

Alterar a licença encerra as transmissões atuais do local e cancela análises em andamento. Vencimento é verificado novamente durante a sessão de vídeo e durante a análise, sujeito ao intervalo de verificação e aos dados que já tiverem sido enviados. Resultados sob licença/configuração invalidada são descartados. A tela Saúde do sistema informa bloqueios de licença; o mosaico deixa de iniciar vídeos que o estado carregado já indique como bloqueados.

O administrador da parceira não pode conceder, ampliar ou renovar sua própria licença. O módulo de supermercado é recusado pelo servidor e indicado como indisponível na interface.

## Fluxo de conferência na instalação

1. Habilite seu administrador master e confira os locais legados existentes.
2. Crie uma parceira de teste; entre com seu código, troque a senha inicial e cadastre um cliente com dois locais.
3. No master, licencie apenas um desses locais. Confira que o outro não permite adicionar câmera.
4. Cadastre câmeras no local licenciado até o limite contratado e confira a recusa da próxima.
5. Abra vídeo na conta da parceira e suspenda a licença no master. Confira o encerramento e a mensagem no diagnóstico.
6. Reative a licença e confira o retorno pelo acesso da parceira. Cadastros e histórico devem permanecer preservados.

Não use a suspensão de um local em operação para fazer o primeiro teste. A entrada master não substitui o teste visual de cada perfil.

## Validação e pendências

134 testes automatizados aprovados: incluem autorização master, criação com senha inicial, isolamento comercial e operacional, cliente com dois locais, rejeição de vínculo entre empresas, licença pendente, concorrência no limite, suspensão de vídeo, vencimento, bloqueio de IA, versão da licença, revogação de permissão e montagem da interface. Não houve instalação nem teste visual no DVR real nesta entrega.

Próximas etapas comerciais: logo e cores por empresa, domínios/subdomínios, catálogo e cobrança de planos, contratos e integração real com a central Invictus Systems. Acesso de cliente a múltiplos locais e contato/cadastro comercial completo também não estão concluídos.

Continuam pendentes antes do supermercado: operação prolongada e teste de carga, conectividade remota por cliente, processamento distribuído, procedimentos e canais externos de escalonamento, clipes antes/depois e retenção efetiva, ensaio real de backup/recuperação e piloto com clientes e acesso móvel.
