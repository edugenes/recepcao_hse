@echo off
echo ========================================
echo    SISTEMA DE RECEPCAO HSE - v1.0
echo ========================================
echo.

echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo    Baixe e instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js encontrado!

echo.
echo [2/3] Verificando dependencias...
if not exist "node_modules" (
    echo 📦 Instalando dependencias...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependencias!
        pause
        exit /b 1
    )
    echo ✅ Dependencias instaladas!
) else (
    echo ✅ Dependencias ja instaladas!
)

echo.
echo [3/3] Iniciando servidor...
echo.
echo 🌐 Servidor iniciando em: http://localhost:3000
echo 📱 Interface web disponivel em: http://localhost:3000
echo.
echo ⚠️  Para parar o servidor, pressione Ctrl+C
echo.

node server.js

echo.
echo Servidor finalizado.
pause
