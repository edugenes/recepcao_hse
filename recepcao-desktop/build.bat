@echo off
echo ========================================
echo Build Sistema de Recepcao HSE Desktop
echo ========================================
echo.

echo [1/4] Instalando dependencias de build...
npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependencias!
    pause
    exit /b 1
)
echo ✅ Dependencias instaladas

echo.
echo [2/4] Instalando dependencias nativas...
npm install ffi-napi ref-napi --build-from-source
if %errorlevel% neq 0 (
    echo ⚠️ Aviso: Dependencias nativas podem falhar, continuando...
)
echo ✅ Dependencias nativas processadas

echo.
echo [3/4] Criando diretorios necessarios...
if not exist "assets" mkdir assets
if not exist "data" mkdir data
if not exist "dist" mkdir dist
echo ✅ Diretorios criados

echo.
echo [4/4] Gerando executavel...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Erro ao gerar executavel!
    pause
    exit /b 1
)
echo ✅ Executavel gerado com sucesso!

echo.
echo ========================================
echo ✅ BUILD CONCLUIDO!
echo ========================================
echo.
echo 📁 Executavel gerado em: dist/
echo 🚀 Para instalar: execute o arquivo .exe
echo.
pause
