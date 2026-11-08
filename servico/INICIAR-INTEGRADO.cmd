@echo off
setlocal
cd /d "%~dp0"
if not exist "dist\interface\index.html" (
  echo Build operacional ausente. Consulte ATUALIZAR-INTEGRADO.md.
  pause
  exit /b 1
)
set "INVICTUS_UI=modern"
call "%~dp0INICIAR-INVICTUS.cmd"