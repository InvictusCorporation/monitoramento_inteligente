# Prazos de atendimento — 0.32.0

A central pode destacar ocorrências que ultrapassarem o prazo para assumir ou o prazo de atendimento após uma atribuição. A função é desativada por padrão e configurada por empresa, apenas por administradores.

## Configurar

1. Entre como administrador e abra Configurações → Prazos de atendimento.
2. Escolha Ativados e informe dois prazos inteiros entre 1 e 1.440 minutos.
3. Salve. Os alertas passam a considerar a configuração na próxima consulta da faixa, normalmente em até dez segundos enquanto a página está aberta.

O formulário inicialmente apresenta 5 minutos para assumir e 15 minutos após atribuir, mas esses valores não são aplicados enquanto a função estiver desativada. Ajuste-os ao procedimento real da central. Ativar ou reduzir um prazo também avalia ocorrências antigas ainda abertas.

## Contagem e destinatários

| Situação | Início da contagem | Quem vê o aviso de atraso |
| --- | --- | --- |
| Sem responsável | Registro da ocorrência | Operadores e administradores da empresa |
| Assumida | Data em que foi assumida | Responsável atual e administradores da empresa |
| Transferida | Data da transferência mais recente | Novo responsável e administradores da empresa |
| Finalizada | Não entra na fila de alertas | Nenhum aviso por prazo |

Salvar uma observação ou alterar a versão da ocorrência não reinicia o relógio. Reabrir uma ocorrência não cria automaticamente uma nova atribuição: o prazo usa a data de atribuição já registrada. Transferir reinicia o prazo de atendimento para o novo responsável e continua registrando o motivo no histórico.

Na faixa, o texto Prazo excedido identifica o atraso. A contagem informa o total de itens atrasados disponíveis àquela conta. Até vinte itens são mostrados, priorizando atrasos, transferências para a própria conta e, entre atrasos do mesmo grupo, o prazo mais antigo. A lista de Ocorrências permanece disponível para consultar o conjunto completo.

Os administradores conseguem identificar atrasos de atendimentos de usuários desativados, desde que a ocorrência continue atribuída e aberta. Outro operador não recebe um alerta de atraso pelo atendimento atribuído a um colega.

## Som e limites

O som depende de ativação pelo usuário e do navegador. A primeira consulta após entrar não toca para avisos já existentes. Quando um item visível ultrapassa o prazo durante a sessão, pode gerar um novo som; as consultas seguintes não repetem o som para o mesmo vencimento. Alterar a política de prazos pode gerar novos avisos para atrasos existentes.

O servidor calcula os prazos com seu próprio relógio. A verificação ocorre nas consultas de alertas e exige a página aberta e conectada. Este recurso não envia WhatsApp, e-mail ou push em segundo plano, não garante entrega quando o navegador está fechado e não equivale a um serviço de notificações externas.

O atraso não transfere nem finaliza a ocorrência automaticamente. O responsável e o administrador decidem a ação. Aceite pelo destinatário, substituição automática de plantão e escalonamento por canais externos continuam pendentes.

## Validação e instalação

123 testes automatizados aprovados, incluindo limites de prazo, empresa e perfil, configuração desativada, fronteira exata do vencimento, transferência, finalização, observação sem reinício de relógio, fila cheia, som sem repetição e respostas atrasadas de formulários. Não houve validação visual na instalação real nesta entrega.

Faça backup e encerre o servidor antes de atualizar. Preserve data, .tools, backups e restauracoes. A migração 11 acrescenta a configuração por empresa sem apagar dados existentes. O recuperador de backup desta versão aceita esse banco; ferramentas anteriores podem recusar backups da nova versão por incompatibilidade de esquema.

Teste sugerido em uma ocorrência de teste: configure um minuto para assumir e dois após assumir; confira o aviso na faixa, assuma e confira a nova contagem; depois finalize e confira a remoção. Não use prazos experimentais como procedimento definitivo sem revisão.

## Antes do supermercado

O alerta visual por prazo está implementado. Permanecem a validação de operação e carga, conexão remota e processamento distribuído, hierarquia comercial/licenças/planos/marca própria, integração Invictus Systems, procedimentos e canais de escalonamento, clipes antes/depois, retenção efetiva, backup externo agendado e ensaio de recuperação, além do piloto com clientes e acesso móvel.
