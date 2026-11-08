# Vídeo contínuo e intervalos — 0.42.0

Sem renovação obrigatória do vídeo a cada cinco minutos; análise configurável a partir de 10 segundos. Leia ATUALIZAR-PAINEL.md e docs/VIDEO-E-INTERVALOS-0.42.0.md.

# Pausa de alertas — 0.41.0

Finalização com pausa opcional por câmera e categoria, reativação manual e indicação visível. Leia docs/PAUSA-DE-ALERTAS-0.41.0.md e ATUALIZAR-PAINEL.md.

# Alertas e intervalos — 0.40.0

Som de 6 segundos ajustável, consulta de alertas a cada 2 segundos após resposta, cadência contínua sem espera extra após sucesso e teste temporário separado. Consulte docs/ALERTAS-0.40.0.md.

# Retenção controlada — 0.39.0

Limpeza manual de fotos antigas finalizadas, prévia e confirmação, lote de até 500, auditoria e ocorrências preservadas. Nenhuma exclusão automática na instalação. Backup antes da migração 15. Consulte docs/RETENCAO-0.39.0.md.

# Marcas das empresas — 0.38.0

Nome, logo e cor principal por empresa, configurados pelo master. Backup antes da migração 14. Consulte docs/MARCAS-0.38.0.md.

# Catálogo de planos — 0.37.0

Planos patrimoniais por master e seleção nas licenças de locais próprios/parceiras. Sem cobrança automática. Backup antes da migração 13. Consulte docs/PLANOS-0.37.0.md.

# Gestão de clientes diretos — 0.36.0

Cadastro de clientes e locais pelo master, com resumo e vínculos existentes preservados. Consulte docs/CLIENTES-MASTER-0.36.0.md.

# Correção 0.35.1

Corrige menu e painel vazios após login. Leia docs/CORRECAO-0.35.1.md.

# Área master — 0.35.0

Gestão master separada da operação, resumo de empresas e licenças. Leia ATUALIZAR-PAINEL.md e docs/MASTER-0.35.0.md.

# Estrutura comercial — 0.34.0

Empresas parceiras, clientes com vários locais e licenças patrimoniais por local. Habilitação master explícita pelo CONFIGURAR-MASTER. Leia docs/COMERCIAL-0.34.0.md antes de ativar o controle comercial. Faça backup antes da migração 12.

# Backup automático com cópia externa — 0.33.0

CONFIGURAR-BACKUP permite definir destino externo e intervalo de 1 a 168 horas. Desativado por padrão; depende do servidor aberto. Cópias verificadas, sem remoção automática. Consulte docs/BACKUP-AUTOMATICO-0.33.0.md.

# Prazos de atendimento — 0.32.0

Configuração administrativa por empresa para destacar ocorrências atrasadas, separando prazo para assumir e prazo após atribuição. Desativada por padrão. Consulte docs/PRAZOS-0.32.0.md. Faça backup antes da migração 11.

# Recuperação de backups — 0.31.0

RESTAURAR-BACKUP recupera dados em pasta separada, verifica integridade e credenciais, remove sessões antigas e pausa o monitoramento contínuo na cópia. Novos backups incluem capacity.json quando presente. Consulte docs/RECUPERACAO-0.31.0.md.

# Transferência de atendimentos — 0.30.0

Transferência com motivo, autorização por empresa e responsável, histórico e alerta ao destinatário. Consulte docs/TRANSFERENCIAS-0.30.0.md. Faça backup antes da atualização (migração 10).

# Transmissão compartilhada — 0.29.0

Contas autorizadas assistindo à mesma câmera compartilham um processo de vídeo, com autorizações individuais e limites por visualização. Consulte docs/TRANSMISSAO-COMPARTILHADA-0.29.0.md. Ainda requer conferência visual no DVR real.

# Capacidade por conta — 0.28.0

Limite de vídeos por usuário, incluindo outras abas, e mosaico ajustado ao teto da conta. Consulte docs/CAPACIDADE-0.28.0.md. Compartilhamento de transmissão ainda pendente.

# Continuidade de vídeo — 0.27.0

Player com renovação de transmissões e reconexão limitada após falhas temporárias. Consulte docs/CONTINUIDADE-0.27.0.md. Requer ensaio prolongado com DVR real.

# Base de crescimento — 0.26.0

Vídeos e capturas com limites independentes; inicialização padrão 8 vídeos + 2 capturas. Mosaico paginado configurável até 25 por tela conforme capacidade. Planejamento inicial para 10 a 50 clientes em docs/INFRAESTRUTURA-0.26.0.md. Não representa implantação distribuída nem capacidade validada de hardware.

# Simulação de retenção — 0.25.0

Consulte quantas fotos antigas de ocorrências finalizadas entram em um prazo, sem excluir dados. Consulte docs/RETENCAO-0.25.0.md.

# Correção de formulários — 0.24.2

Respostas atrasadas de salvamento não interferem em formulários abertos depois. Consulte docs/FORMULARIOS-0.24.2.md.

# Correção de atendimento — 0.24.1

Assumir atendimento preserva a observação ainda não salva no formulário. Consulte docs/REVISAO-0.24.1.md.

# Regras como modelo — 0.24.0

Abra uma regra de outra câmera do mesmo local como modelo para revisão antes de salvar. Consulte docs/MODELOS-0.24.0.md.

# Edição de nomes — 0.23.0

Renomeie câmeras e locais preservando conexões e vínculos. Consulte docs/NOMES-0.23.0.md.

# Meus acessos — 0.22.0

Consulte sessões válidas da própria conta e encerre os outros acessos em Configurações. Consulte docs/SESSOES-0.22.0.md.

# Troca obrigatória de senha — 0.21.0

Após novas redefinições administrativas, o usuário define sua própria senha antes de acessar o painel. Faça backup antes da migração 9. Consulte docs/SENHA-INICIAL-0.21.0.md.

# Gestão de acessos — 0.20.0

Redefinição de senha por administrador com confirmação da própria senha e revogação das sessões do usuário. Consulte docs/ACESSOS-0.20.0.md.

# Revisões de atendimento — 0.19.0

Novos salvamentos guardam situação e observação antes/depois no histórico da ocorrência. Faça backup antes da migração 8. Consulte docs/REVISOES-0.19.0.md.

# Histórico por ocorrência — 0.18.0

Consulte ações de atendimento no detalhe da ocorrência. Consulte docs/HISTORICO-0.18.0.md.

# Identificação da instalação — 0.17.0

Versão no cabeçalho e instruções de atualização e backup em Configurações. Consulte docs/VERSAO-0.17.0.md.

# Armazenamento de evidências — 0.16.0

Saúde do sistema mostra quantidade e tamanho das fotos, evidência mais antiga e ocorrências sem foto, respeitando local e conta. Consulte docs/ARMAZENAMENTO-0.16.0.md.

# Backup local — 0.15.0

Abra FAZER-BACKUP.cmd para criar uma cópia verificada do banco e da chave em backups. Mantenha a cópia protegida. Consulte docs/BACKUP-0.15.0.md.

# Navegação do histórico — 0.14.0

Páginas com 25, 50 ou 100 registros em Ocorrências e Relatórios, com exportação completa dos resultados filtrados. Consulte docs/PAGINACAO-0.14.0.md.

# Fila de atendimento — 0.13.0

Filtre ocorrências abertas por responsável e ordene por prioridade ou antiguidade. Consulte docs/FILA-0.13.0.md.

# Download de foto — 0.12.0

Baixe o JPEG salvo diretamente na ocorrência. Identificação de câmera/data UTC no arquivo e registro da solicitação no Histórico. Consulte docs/DOWNLOAD-FOTO-0.12.0.md.

# Relatórios e filtros — 0.11.0

Ocorrências e Relatórios compartilham filtros de período, câmera, prioridade e situação. O CSV exporta exatamente os resultados selecionados. Consulte docs/RELATORIOS-0.11.0.md.

# Saúde do sistema - 0.10.0

Consulte o histórico por câmera, motivos de pausa, falhas automáticas e uso diário. A consulta não captura imagens nem chama a IA. Consulte docs/SAUDE-0.10.0.md.

# Área sobre a imagem — 0.9.0

Capture a fotografia da câmera no editor de regra e desenhe a região de vigilância sobre ela. Sem chamada à IA para a prévia. Consulte docs/AREA-SOBRE-IMAGEM-0.9.0.md.

# Central de alertas — 0.8.0

Faixa de alertas para administradores e operadores, som habilitado pelo usuário e registro de quem assumiu o atendimento. Consulte docs/ALERTAS-0.8.0.md.

# Múltiplas categorias — 0.7.1

Marque Pessoas, Veículos e Animais em qualquer combinação na regra da câmera. Uma consulta por imagem e ocorrência com os tipos confirmados. Consulte docs/MULTIPLAS-CATEGORIAS-0.7.1.md.

# Detecção por categoria — 0.7.0

Escolha Pessoas, Veículos ou Animais em Monitoramento → Editar regra. Uma categoria por câmera. Regras existentes preservam Pessoas. Consulte docs/DETECCAO-0.7.0.md e docs/PLANO-DO-PRODUTO.md.

# Monitoramento no servidor — 0.6.0

Ative em Monitoramento → Monitoramento contínuo. Funciona com o navegador fechado, respeitando regras e horários, enquanto o servidor estiver ligado. Intervalos e limite diário configuráveis; começa desativado. Consulte docs/MONITORAMENTO-CONTINUO-0.6.0.md.

# Imagens de ocorrências — 0.5.1

Novas detecções salvam o recorte analisado. Abra Ocorrências → Analisar → Ver imagem. Fotos antigas não são recuperadas. Atualize preservando data e .tools. Consulte docs/EVIDENCIAS-0.5.1.md.

# Piloto de IA — 0.5.0

Configure sua chave existente em Monitoramento → Configurar OpenAI. Análise manual ou teste por até cinco minutos, respeitando local, regra, área e horário. Imagens recortadas são enviadas à OpenAI; detecções geram ocorrências para revisão humana. Ainda não há vigilância contínua. Consulte docs/MODULO-05.md para atualização, custos, limites e teste real.

# Regras de monitoramento — 0.4.0

Menu Monitoramento: ativação por local, dias, horários, fuso, prioridade e área por câmera. Detecção por IA ainda pendente. Consulte docs/MODULO-04.md para instruções e limites.

# Invictus Monitoramento Inteligente

## Início rápido no Windows

Extraia o pacote e abra **INICIAR-INVICTUS.cmd**. Ele instala o FFmpeg portátil com verificação SHA-256 e abre o primeiro acesso. Crie a conta Invictus e informe as credenciais do DVR no formulário. O canal 1 do MHDX 1208 em 192.168.1.64:554 será preparado. Consulte **COMECE-AQUI.md**. Esse fluxo deve ser executado pelo usuário: o ambiente do assistente bloqueou download e acesso ao equipamento. Instalação completa e vídeo real ainda não verificados.

## Estado atual

Módulo 01: demonstração visual independente em `dist/`, com dados fictícios em localStorage.
Módulo 02: aplicação em `web/` + `server/`, com login, SQLite persistente e autorização por empresa/cliente. Começa sem dados fictícios.
Módulo 03: configuração RTSP com credenciais criptografadas, teste de conexão e player de vídeo sob demanda. Exige FFmpeg e acesso à rede da câmera. Implementado e testado com processo simulado; câmera real e reprodução ainda não homologadas. IA e gravação continuam pendentes.

## Executar a aplicação

Requisito: Node.js 24 ou superior. Não é necessário instalar pacotes JavaScript. A transmissão exige FFmpeg instalado separadamente; os demais módulos podem ser usados sem ele.

Na pasta do projeto:

```powershell
node scripts/create-company.mjs
node server/start.mjs
```

O primeiro comando solicita o nome e código da empresa, nome/e-mail do administrador e senha com entrada oculta. Não há senha padrão. Guarde os dados informados. A criação de outra empresa é feita executando novamente o mesmo comando com outro código.

O segundo comando inicia em http://127.0.0.1:8087. Acesse esse endereço no navegador do mesmo computador, entre com os dados cadastrados, crie um cliente/local, cadastre câmeras e usuários. O perfil Cliente deve ser vinculado a um local. Use Ctrl+C no terminal para parar.

Os registros ficam em `data/monitoramento.sqlite`. A pasta de dados não entra no Git nem nos pacotes de entrega. Não exclua essa pasta para atualizar o aplicativo. O frontend autenticado é entregue pelo servidor; abrir `web/index.html` diretamente não executa o backend.

## Verificação

```powershell
node --test tests/access.test.mjs tests/video.test.mjs tests/camera-profiles.test.mjs tests/local-setup.test.mjs
```

A suíte tem 38 testes aprovados, cobrindo acesso, primeiro acesso local, isolamento, revogação, concorrência, persistência, criptografia e controle do processo de vídeo. Os testes de transmissão usam processo simulado, não um equipamento real. Veja `docs/MODULO-02.md` para acesso e `docs/MODULO-03.md` para vídeo, instalação e limites.

## Habilitar vídeo

Siga `docs/MODULO-03.md`: configure o caminho do FFmpeg e os destinos permitidos por local usando `.env.example`. Consulte os IDs com `node scripts/list-locations.mjs`. Inicie com `node --env-file=.env server/start.mjs`, selecione a câmera no painel, configure o canal RTSP e teste. Não há descoberta automática de câmeras nesta etapa.

## Instalação em servidor

Variáveis suportadas: `PORT`, `HOST`, `APP_ORIGIN`, `DB_PATH`, `NODE_ENV`. Sem configuração, atende somente loopback. Para produção, use `NODE_ENV=production` e `APP_ORIGIN` igual à origem HTTPS pública (sem caminho). Isso ativa cookie Secure e exige uma origem HTTPS. Configure um proxy HTTPS para a porta interna e um volume persistente para o banco.

Não exponha a porta HTTP diretamente à internet. O proxy deve preservar o cabeçalho Origin e aplicar limitação adicional de tentativas por IP. O aplicativo ignora X-Forwarded-For. Com proxy local, o limite por IP do processo agrega os usuários do proxy; o limite por conta continua separado. Ajustar a política com testes de carga antes da operação comercial.

Faça backup consistente com o serviço parado, incluindo a pasta de dados; não copie apenas o arquivo principal de um banco ativo em modo WAL. Teste a restauração em ambiente separado. Nada foi instalado no VPS compartilhado.

O manifesto Sites existente continua destinado ao protótipo estático `dist/`, não ao backend Node. Não houve publicação online desta etapa.

## Próximos módulos

3. Homologar o gateway RTSP com câmera real, validar navegadores e implementar isolamento de rede por local antes de conectar redes de terceiros.
4. Eventos por zona, horário e permanência; IA após gatilhos, limites de consumo e revisão humana.
5. Evidências, retenção, atendimento, notificações e política por modalidade.
6. Licenças por local e módulos independentes: segurança patrimonial e movimentações suspeitas em comércio, sem rastreamento de mercadorias.
7. White-label e integração com a central Invictus Systems.

Plataforma independente. Não modificar infraestrutura de outros projetos. Não alegar vigilância 24 horas antes da implantação e validação operacional.

## DVR informado

Perfil Intelbras MHDX 1208 incluído, com seleção dos canais 1 a 8 e fluxos principal/extra. Veja docs/INTELBRAS-MHDX-1208.md. Teste no equipamento real ainda pendente.

# Painel ao vivo — atualização 0.3.3

O painel inicia até quatro canais configurados, com status de reprodução, Reconectar e Ampliar. O limite de quatro transmissões é compartilhado no servidor; cada sessão continua limitada a cinco minutos. Ao abrir uma janela de opções, os quadros são pausados e retomados ao fechá-la. A navegação encerra os players anteriores. Consulte ATUALIZAR-PAINEL.md para atualizar sem perder dados. Estas regras substituem o limite anterior de uma transmissão por usuário descrito nos documentos históricos.

