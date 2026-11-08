# Imagens das ocorrências — 0.5.1

Novas ocorrências geradas pela IA salvam a mesma imagem JPEG recortada que foi enviada à análise. A imagem e a ocorrência são gravadas na mesma transação: falha na gravação reverte ambas. Resultados sem pessoa, inconclusivos e repetições suprimidas não armazenam imagens adicionais. As ocorrências anteriores permanecem sem foto.

Para visualizar: Ocorrências → Analisar → Ver imagem. O aplicativo consulta os registros recentes ao navegar. A foto é histórica, não é vídeo ao vivo. O recorte pode mostrar somente parte da pessoa, conforme a área configurada.

As imagens são guardadas como BLOB no banco local data/monitoramento.sqlite, com limite de 4 MiB por foto. A rota exige sessão ativa e aplica a mesma separação de empresa/local das ocorrências. Respostas usam no-store e acessos são auditados. Não há URL pública de arquivo. As fotos não são criptografadas individualmente no banco; a proteção do disco e dos backups deve acompanhar a proteção da instalação.

Nesta versão não há exclusão automática por prazo. As imagens permanecem no banco inclusive depois da finalização da ocorrência e aumentam seu tamanho. Não há gravação de clipes. Esta atualização substitui a limitação de ausência de evidência descrita no documento do módulo 05.

## Atualizar e testar

1. Feche o servidor e faça uma cópia da pasta de instalação.
2. Copie os arquivos do ZIP sobre a instalação atual, preservando data e .tools. Nenhuma chave precisa ser digitada novamente.
3. Reinicie INICIAR-INVICTUS e pressione Ctrl+F5 no navegador.
4. Gere uma nova detecção. Se houver uma ocorrência recente da mesma câmera, aguarde cinco minutos para sair da supressão de repetição.
5. Abra Ocorrências, clique Analisar e depois Ver imagem. Feche e reabra o programa para conferir a persistência.

Testes automatizados cobrem bytes da imagem, persistência, gravação atômica, supressão de repetição, acesso anônimo e isolamento entre empresas e locais. A conferência visual com o DVR real deve ser feita após a atualização. Nenhuma chamada real à OpenAI foi feita nesta alteração.
