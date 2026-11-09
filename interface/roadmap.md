# Integração operacional

- [x] Recuperar e validar o motor original e a distribuição 0.43.0.
- [x] Integrar a SPA operacional autenticada, corrigir concorrência, rascunhos e player.
- [x] Investigar e documentar o alerta Microsoft Defender sem alterar o ZIP.

# Paridade operacional 0.44.0-dev.1

- [x] Inventariar todas as ações web, contratos, perfis e limites do legado.
- [x] Implementar navegação e telas nativas por perfil, sem dependência do legado.
- [x] Completar câmeras, clientes/locais, usuários, monitoramento e áreas visuais.
- [x] Completar ocorrências, transferência, evidências, relatórios e CSV.
- [x] Implementar saúde, retenção segura, marca/conta, prazos e gestão master.
- [x] Identificar 0.44.0-dev.1 e gerar build reproduzível em servico/dist/interface.
- [x] Adicionar e executar testes de serviço, frontend, tipos e browser/CSP com fixtures.
- [x] Cobrir login com leitura pendente, falha/recuperação sem perder rascunhos e preservação isolada de credenciais.
- [x] Documentar matriz de paridade, resultados reais e limitações pendentes.
- [x] Gerar e validar exports/parity-source-export.json e manifesto de assets.
- [x] Commitar fontes, testes, documentação e build, sem gerar ZIP ou publicar.

# Revisão focada de concorrência

- [x] Preservar observação no 409 → recarregar → salvar com a nova versão.
- [x] Distinguir escrita gravada de refresh falho e impedir repetição com versão antiga.
- [x] Cancelar retenção por geração/escopo sem travar botões ou reutilizar token antigo.
- [x] Executar testes afetados, tipos/build, atualizar documentação e regenerar export delta.
- [x] Commitar a revisão sem ZIP, publicação ou alteração da suspensão Defender.

# Restrição de destino para credenciais preservadas

- [x] Servidor permite preserveCredentials somente no mesmo host/porta validados.
- [x] UI exige novas credenciais ao alterar host/porta; canal/stream/path continuam editáveis.
- [x] Testar papel, local, tenant, versão, ausência de row, host/porta e resposta redigida.
- [x] Executar checks afetados, build, documentação e export delta; commitar sem ZIP/publicação.
