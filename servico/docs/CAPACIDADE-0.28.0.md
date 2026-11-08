# Capacidade por conta — 0.28.0

O servidor aplica um teto de vídeos por usuário, somando suas abas e sessões. O teto global continua valendo. Encerrar uma conta não encerra os vídeos de outra. Processos em encerramento continuam ocupando uma vaga até sua saída efetiva. Capturas de fotos usam o limite separado de capturas.

O mosaico respeita o menor limite entre conta e central. Se a conta já estiver usando vídeos em outra aba, pode receber aviso de limite mesmo com vagas aparentes no mosaico. Este teto aplica-se também a administradores e clientes, não somente ao papel operador.

## Configuração

Sem configuração: 8 vídeos globais, até 8 por conta e 2 capturas. Nenhum aumento automático para 32 vídeos.

Para dividir 8 vagas entre duas contas, use o conteúdo de `docs/capacity.example.json` em `data/capacity.json`: live 8, perOperator 4, captures 2.

A referência `docs/capacity-two-operators.example.json` define live 32, perOperator 16, captures 2. É um alvo de teste, não uma garantia de desempenho. Reinicie o serviço após alterar a configuração. Variáveis INVICTUS_MAX_LIVE, INVICTUS_MAX_LIVE_PER_OPERATOR e INVICTUS_MAX_CAPTURES prevalecem sobre o arquivo. perOperator deve ficar entre 1 e live.

O limite é por conta, não uma reserva exclusiva: com mais contas conectadas, a capacidade global pode ser preenchida. Não há cotas por empresa nem balanceamento entre servidores nesta versão. Use contas individuais para os dois funcionários.

## Verificação no computador da central

1. Configure live 8/perOperator 4 e entre com duas contas autorizadas.
2. Abra quatro câmeras em cada conta. Tente abrir uma quinta na primeira conta em outra aba: deve receber limite por conta.
3. Encerre os vídeos da primeira conta e confirme que os da segunda continuam.
4. Após confirmar o encerramento, abra novamente os vídeos da primeira conta.
5. Antes de usar 32 vídeos, medir CPU, memória, rede e estabilidade com 16 por operador, renovação após cinco minutos e perda/retorno da conexão. A validação automatizada usa processos simulados.

## Etapas antes do supermercado

- Compartilhar uma transmissão entre operadores com entrada tardia válida no vídeo e autorização individual. Ainda há um processo por visualização.
- Operação prolongada no DVR real; diagnóstico de carga para 10–50 clientes, 8–16 câmeras cada (80–800 cadastradas). Câmeras cadastradas e visualizações simultâneas são medidas diferentes.
- Conexão remota por cliente, processamento distribuído, hospedagem e teste de carga.
- Hierarquia de empresas/clientes, licenças, planos, marca própria e integração Invictus Systems.
- Transferência e escalonamento de ocorrências; procedimentos dos operadores.
- Clipes antes/depois, retenção efetiva, backup externo agendado e restauração validada.
- Piloto com clientes reais e acesso móvel.

Só depois: módulo de supermercado, com análise temporal e revisão humana dos alertas.

## Atualização

Feche o servidor antes de substituir os arquivos da aplicação. Preserve as pastas data, .tools e backups. O ZIP não contém banco, senhas, chaves ou imagens da instalação. A configuração capacity.json fica em data e precisa ser preservada; o backup manual atual não inclui esse arquivo.
