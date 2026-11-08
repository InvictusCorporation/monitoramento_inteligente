@echo off
setlocal
cd /d "%~dp0"
if exist "interface\package.json" cd /d "%~dp0interface"
call bun install --frozen-lockfile
if errorlevel 1 exit /b 1
call bun run build:operational
if errorlevel 1 exit /b 1
echo Build concluido. Use INICIAR-INTEGRADO.cmd na raiz.