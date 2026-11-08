# Clientes diretos na Gestão master — 0.36.0

O master agora inclui Clientes diretos, separado de Empresas e licenças. Lista clientes, quantidade de locais/câmeras e licenças ativas. Inclui clientes ainda sem local e identifica locais existentes sem vínculo.

Fluxo: Novo cliente → Novo local (selecione o cliente) → Empresas e licenças para ativar a licença do local. Para locais já cadastrados, use Vincular cliente, sem criar duplicatas. É possível editar o nome do local. Câmeras e usuários continuam na Central de monitoramento.

Os cadastros utilizam os mesmos endpoints e permissões da empresa autenticada. Nenhuma licença, câmera ou vínculo existente é alterado automaticamente. Parceiras continuam administrando seus próprios clientes. Não foi ampliado acesso a imagens de parceiras.

Enquanto estiver no master, esta aba não mostra nem consulta alertas operacionais. Mantenha uma aba/estação na central para acompanhar ocorrências. Monitoramento contínuo do servidor mantém sua configuração.

Esta entrega não conclui toda a plataforma: catálogo de planos, cobrança, marca visual por empresa, infraestrutura remota, teste real de capacidade e recuperação, além do módulo de supermercado permanecem pendentes. O login de cliente continua limitado a um local por usuário.

Verificação local: entre como master, abra Clientes diretos, confira locais existentes e clientes sem locais. Cadastre somente dados reais quando necessário. Confira depois Empresas e licenças e a operação. Testes automatizados não substituem validação visual e teste com o DVR real.
