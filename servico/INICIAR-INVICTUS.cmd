@echo off
setlocal
cd /d "%~dp0"
set "INVICTUS_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined INVICTUS_NODE set "INVICTUS_NODE=%%N"
if not defined INVICTUS_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "INVICTUS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined INVICTUS_NODE (
  echo Nao foi encontrado Node.js. Instale Node.js 24 LTS em https://nodejs.org/ e abra este arquivo novamente.
  pause
  exit /b 1
)
echo Preparando Invictus Monitoramento. Aguarde e mantenha esta janela aberta.
"%INVICTUS_NODE%" scripts\install-local.mjs
if errorlevel 1 (
  echo A preparacao nao terminou. Veja a mensagem acima.
  pause
  exit /b 1
)
"%INVICTUS_NODE%" scripts\start-local.mjs
pause
