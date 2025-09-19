@echo off
echo ========================================
echo Sistema de Recepcao HSE v4.0 - REAL
echo ========================================
echo.

echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js nao encontrado!
    echo 📥 Baixe e instale Node.js: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

echo.
echo [2/4] Instalando dependencias...
npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias!
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas

echo.
echo [3/4] Instalando dependencias nativas para DigitalPersona...
npm install ffi-napi ref-napi --build-from-source
if %errorlevel% neq 0 (
    echo ⚠️ Aviso: Dependencias nativas podem falhar, continuando...
)
echo ✅ Dependencias nativas processadas

echo.
echo [4/4] Executando aplicativo REAL...
echo 🚀 Iniciando Sistema de Recepcao HSE v4.0 REAL...
echo 🖐️ Conecte o DigitalPersona 4500 antes de continuar!
echo.
npm start

pause
