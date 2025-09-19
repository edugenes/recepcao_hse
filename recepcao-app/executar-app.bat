@echo off
echo ========================================
echo   SISTEMA DE RECEPCAO HSE v1.0
echo ========================================
echo.
echo Iniciando aplicativo...
echo.

cd /d "%~dp0"

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    pause
    exit /b 1
)

echo.
echo Verificando Electron...
npx electron --version
if %errorlevel% neq 0 (
    echo ERRO: Electron nao encontrado!
    pause
    exit /b 1
)

echo.
echo Executando aplicativo...
echo.
npx electron main.js

echo.
echo Aplicativo finalizado.
pause
