# Validação da prévia INVICTUS (demonstração)

Data: 07/11/2026. Dados e imagens apenas ilustrativos; o aviso "Demonstração · imagens ilustrativas" continua em todas as telas.

## Resultado dos comandos
- `tsgo -b --noEmit`: **0 erros** (antes: cerca de 30 erros de tipagem estrita).
- `bunx vitest run`: **2 arquivos, 8 testes, todos passaram** (`detection-logic.test.ts` 7, `app-routing.test.tsx` 1).
- `vite build`: **concluído sem erros**.
- Playwright (1280×900 e 390×844): `/`, `/ocorrencias`, `/cameras`, `/gestao` responderam 200, sem erros de página, sem rolagem horizontal e com o aviso de demonstração visível.
- Fluxo testado: abrir ocorrência → "Assumir atendimento" → "Finalizar" (aviso: "a detecção desta câmera continua ativa"); fila em painel deslizante no celular.

## Arquivos alterados
- `src/lib/demo-data.ts`, `src/lib/detection-logic.ts`: `bbox` opcional aceita `undefined`.
- `src/routes/cameras.tsx`, `src/routes/ocorrencias.tsx`: parâmetros de busca com tipagem estrita.
- `src/routes/index.tsx`, `src/components/layout/AppShell.tsx`, `src/components/common/ResponsiveTable.tsx`: acessos a listas com valor sempre presente.
- `src/components/layout/AppShell.tsx`: o seletor de cliente agora mostra o nome escolhido (antes aparecia vazio).
- `src/lib/detection-logic.test.ts`: ajustes de tipagem, regras inalteradas.

## Limitações
- Nada está conectado: sem DVR, RTSP, IA, banco de dados nem login. Os botões sem função mostram "Disponível após integração".
- A integração com o backend Node/SQLite/RTSP existente depende do acesso ao código-fonte e de uma implantação na mesma origem autenticada. Nenhum contrato de API foi definido ou inventado aqui.
