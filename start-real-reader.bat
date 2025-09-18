@echo off
echo ========================================
echo  DIGITALPERSONA 4500 - LEITOR REAL
echo ========================================
echo.
echo Iniciando cliente para leitor fisico...
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Instale o Node.js primeiro.
    pause
    exit /b 1
)

REM Verificar se o leitor está conectado
echo Verificando leitor DigitalPersona 4500...
powershell -Command "Get-PnpDevice | Where-Object {$_.Name -like '*U.are.U*'} | Select-Object Name, Status"

if %errorlevel% neq 0 (
    echo.
    echo AVISO: Leitor nao detectado ou nao esta funcionando.
    echo Verifique se o leitor esta conectado e os drivers instalados.
    echo.
)

echo.
echo Iniciando cliente real...
echo.

REM Iniciar o cliente real
node digitalpersona-real-client.js

pause

