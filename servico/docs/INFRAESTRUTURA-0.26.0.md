# Base de crescimento — 0.26.0

## Meta definida com Tiago

Primeira operação comercial: 10 a 50 clientes. Ainda falta confirmar câmeras por cliente, operadores simultâneos e infraestrutura de hospedagem. Como cenário de planejamento, oito câmeras por cliente significam 80 a 400 câmeras cadastradas; isso não é um número de streams simultâneos validado.

Com amostragem de uma imagem por minuto em todas as câmeras durante 24 horas, esse cenário exigiria teoricamente 115.200 a 576.000 análises por dia, sem contar tempo de processamento e indisponibilidades. O limite diário de teste atual não atende esse volume. Antes da escala comercial, definir regras de horário, pré-detecção/seleção de eventos, orçamento de uso e quotas reais. A pré-detecção local não está implementada. Não ampliar limites de IA indiscriminadamente.

A arquitetura alvo deve separar painel/API, banco, fila e trabalhadores de mídia/análise, com armazenamento de evidências e conectividade por local. O código desta entrega ainda é uma instalação de processo único: prepara limites e visualização, mas não implementa essa arquitetura distribuída. A consulta de CPU/RAM foi negada pelo ambiente; nenhuma capacidade de hardware foi inferida.

## Entregue nesta etapa

Os inicializadores local e servidor carregam limites independentes para vídeo e captura. Sem configuração adicional, são 8 vídeos ao vivo e 2 capturas simultâneas por processo. O gateway mantém limites e encerramento de processos em cada grupo. A fila automática consulta a capacidade de capturas, não os lugares de vídeo. Prévias e análises compartilham as vagas de captura. A concorrência de chamadas de IA continua limitada separadamente pelo detector existente.

O painel e Câmeras oferecem mosaico por páginas com opções 1, 4, 8, 9, 16 e 25, quando o limite configurado permite. O filtro de local e a busca definem quais câmeras entram nas páginas. A abertura padrão continua em 4; selecione 8 para ampliar. Sair da página encerra seus vídeos. Conexões são compartilhadas por todos os operadores do processo e não há reserva por empresa/operador nesta etapa. Duas pessoas vendo a mesma câmera ainda consomem dois processos de vídeo.

Esses são limites de software, não capacidade medida do computador. Vídeo e capturas ainda compartilham CPU, memória e rede. O teto técnico de configuração é 64 vídeos e 8 capturas; isso não é uma recomendação de uso nem garantia de desempenho. Cada vídeo ainda tem duração máxima de cinco minutos e precisa ser reaberto; operação ininterrupta de longa duração permanece pendente.

## Configuração

Na instalação, crie data/capacity.json com:

```json
{"live": 8, "captures": 2}
```

Para ensaio com 16 vídeos, use live igual a 16 e reinicie o servidor. As variáveis INVICTUS_MAX_LIVE e INVICTUS_MAX_CAPTURES têm prioridade sobre o arquivo. Valores fora dos limites impedem inicialização com erro. O arquivo é local e não contém credenciais. O backup atual guarda banco e chave; preserve capacity.json separadamente junto da configuração da instalação.

## Sequência de infraestrutura para múltiplos clientes

1. Validar nesta instalação 8 e depois 16 vídeos: abertura, atraso observado, CPU/RAM/rede, erros e tempo das análises com mosaico cheio. Registrar resolução, bitrate, substream, equipamentos e duração do ensaio. Os testes automatizados usam processos simulados e não medem desempenho real.
2. Implementar reutilização de fluxo por câmera, cotas por empresa/operador e renovação controlada de sessões de vídeo. Definir prioridade dos alertas e recuperação de desconexões.
3. Separar servidor de aplicação, trabalhadores de vídeo/IA e armazenamento. Planejar banco transacional compartilhado e fila de tarefas antes de executar várias instâncias. Não iniciar múltiplos servidores sobre este SQLite esperando coordenação distribuída: a fila atual não faz eleição/lease entre processos.
4. Definir conectividade autorizada entre locais dos clientes e servidor. O IP privado de um DVR só é alcançável na rede correspondente; clientes podem usar IPs iguais. A solução remota precisa identificar o local, com agente/gateway ou túnel, sem publicar o DVR diretamente. Nenhuma rede ou roteador foi alterado nesta entrega.
5. Definir hospedagem, domínio e HTTPS, gestão de segredos, backups externos verificados, recuperação, armazenamento de evidências e observabilidade. Fazer implantação isolada para não afetar outros sistemas.
6. Executar testes com múltiplos operadores/clientes, saturação, perda de rede, reinício, recuperação de backup e isolamento. Só então fixar planos comerciais e limites por cliente.

Para dimensionar a próxima etapa, levantar: clientes e câmeras iniciais/projetadas; vídeos simultâneos por operador; quantidade de operadores; frequência de análise; retenção de fotos/clipes; máquinas disponíveis; upload de cada local; tipos de DVR; acesso remoto permitido. Ainda não há dimensionamento de hardware, contratação, publicação ou alteração de infraestrutura externa.

## Atualização e validação

Faça backup e feche o programa. Atualize preservando data, .tools e backups; reinicie e use Ctrl+F5. Confira 0.26.0, selecione 8 câmeras por página e mantenha uma análise ativa. Com capacidade configurada para 16, confira a opção 16. O controle de permissões por empresa/local continua nas APIs existentes. A capacidade de 16 vídeos mais 2 capturas foi validada apenas com processos simulados.
