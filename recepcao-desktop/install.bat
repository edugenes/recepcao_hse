@echo off
echo ========================================
echo Sistema de Recepcao HSE v3.0 - Desktop
echo ========================================
echo.

echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo 📥 Baixe e instale Node.js: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

echo.
echo [2/5] Verificando npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm nao encontrado!
    pause
    exit /b 1
)
echo ✅ npm encontrado

echo.
echo [3/5] Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias!
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas

echo.
echo [4/5] Criando diretorio de dados...
if not exist "data" mkdir data
if not exist "assets" mkdir assets
echo ✅ Diretorios criados

echo.
echo [5/5] Verificando DigitalPersona...
echo 🔍 Verificando se o leitor DigitalPersona 4500 esta conectado...
powershell -Command "Get-PnpDevice | Where-Object {$_.FriendlyName -like '*DigitalPersona*' -or $_.FriendlyName -like '*U.are.U*'}" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Leitor DigitalPersona detectado!
) else (
    echo ⚠️  Leitor DigitalPersona nao detectado
    echo 💡 Conecte o leitor e instale os drivers
)

echo.
echo ========================================
echo ✅ INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo 🚀 Para executar o aplicativo:
echo    npm start
echo.
echo 📦 Para gerar instalador:
echo    npm run build
echo.
echo 📚 Documentacao: README.md
echo.
pause
