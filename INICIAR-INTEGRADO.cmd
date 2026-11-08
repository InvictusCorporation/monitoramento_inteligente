@echo off
setlocal
cd /d "%~dp0"
if not exist "servico\dist\interface\index.html" (
  echo Build operacional ausente. Consulte docs\INTEGRACAO-OPERACIONAL.md.
  pause
  exit /b 1
)
set "INVICTUS_UI=modern"
call "servico\INICIAR-INVICTUS.cmd"