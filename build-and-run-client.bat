@echo off
echo ========================================
echo  DIGITALPERSONA 4500 - CLIENTE REAL
echo ========================================
echo.

REM Verificar se .NET está instalado
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: .NET 6.0 nao encontrado!
    echo Instale o .NET 6.0 primeiro: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo Compilando cliente DigitalPersona...
dotnet build DigitalPersonaClient.csproj

if %errorlevel% neq 0 (
    echo ERRO: Falha na compilacao!
    pause
    exit /b 1
)

echo.
echo Cliente compilado com sucesso!
echo.
echo Iniciando cliente DigitalPersona...
echo.

REM Executar o cliente
dotnet run --project DigitalPersonaClient.csproj

pause
