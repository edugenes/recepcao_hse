@echo off
echo ========================================
echo   SISTEMA DE RECEPCAO HSE v1.0
echo   Aplicativo Windows Nativo C#
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando .NET SDK...
dotnet --version
if %errorlevel% neq 0 (
    echo.
    echo ERRO: .NET SDK nao encontrado!
    echo.
    echo Por favor, instale o .NET 8.0 SDK:
    echo https://dotnet.microsoft.com/download/dotnet/8.0
    echo.
    pause
    exit /b 1
)

echo.
echo Restaurando pacotes NuGet...
dotnet restore
if %errorlevel% neq 0 (
    echo ERRO: Falha ao restaurar pacotes!
    pause
    exit /b 1
)

echo.
echo Compilando aplicativo...
dotnet build --configuration Release
if %errorlevel% neq 0 (
    echo ERRO: Falha na compilacao!
    pause
    exit /b 1
)

echo.
echo Executando aplicativo...
echo.
dotnet run --configuration Release

echo.
echo Aplicativo finalizado.
pause
