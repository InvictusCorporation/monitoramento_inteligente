@echo off
setlocal
cd /d "%~dp0"
set "INVICTUS_NODE="
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined INVICTUS_NODE set "INVICTUS_NODE=%%N"
if not defined INVICTUS_NODE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "INVICTUS_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not defined INVICTUS_NODE (
  echo Node.js nao encontrado. Use a mesma instalacao do INICIAR-INVICTUS.
  pause
  exit /b 1
)
"%INVICTUS_NODE%" scripts\restore-local.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
pause
