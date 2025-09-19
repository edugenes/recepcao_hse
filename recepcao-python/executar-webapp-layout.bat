@echo off
echo ========================================
echo   SISTEMA DE RECEPCAO HSE v1.0
echo   Layout Exato do WebApp Original
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando Python...
python --version
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Python nao encontrado!
    echo.
    echo Por favor, instale o Python 3.8+:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo.
echo Executando aplicativo com layout do webapp...
echo.
python main-webapp-layout.py

echo.
echo Aplicativo finalizado.
pause
