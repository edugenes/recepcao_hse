@echo off
echo ========================================
echo   SISTEMA DE RECEPCAO HSE v1.0
echo   Aplicativo Windows Nativo Python
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
echo Executando aplicativo...
echo.
python main.py

echo.
echo Aplicativo finalizado.
pause
