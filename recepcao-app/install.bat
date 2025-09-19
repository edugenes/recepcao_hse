@echo off
echo ========================================
echo Sistema de Recepcao HSE v1.0
echo ========================================
echo.

echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo 📥 Baixe e instale Node.js: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

echo.
echo [2/3] Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias!
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas

echo.
echo [3/3] Executando aplicativo...
echo 🚀 Iniciando Sistema de Recepcao HSE v1.0...
echo.
npm start

pause
