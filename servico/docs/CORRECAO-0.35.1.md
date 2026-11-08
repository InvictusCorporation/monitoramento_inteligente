# Correção do painel vazio — 0.35.1

A versão 0.35.0 incluiu master.js na página mas omitiu esse arquivo da lista de rotas estáticas do servidor. O navegador recebia 404 e interrompia a renderização do menu e painel após o login. Corrigida a rota explícita, sem ampliar acesso a arquivos privados.

Novo teste HTTP verifica todos os scripts e estilos referenciados pela página inicial, incluindo status, tipo de conteúdo e corpo. Não houve alteração de banco, contas, câmeras ou licenças.

Para instalar: encerre o servidor, faça backup da pasta atual e substitua os arquivos do programa pelo conteúdo do ZIP, preservando data, .tools e configurações locais. Reinicie INICIAR-INVICTUS.cmd e pressione Ctrl+F5 no navegador. Confirme versão 0.35.1. Não execute novo cadastro nem habilitação master se já existentes.

Após instalar, confira menu, painel e alternância entre Gestão master e Central de monitoramento. Validação do DVR real deve ser feita na instalação.
