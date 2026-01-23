@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
cd /d "%ROOT%" >nul 2>&1
set "NSSM=%ROOT%\tools\nssm.exe"

if not exist "%NSSM%" (
  echo ERRO: nssm.exe não encontrado em %ROOT%\tools
  exit /b 1
)

set "PORT=3000"
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /I "%%A"=="PORT" set "PORT=%%B"
  )
)
set "PORT=!PORT: =!"
if "!PORT!"=="" set "PORT=3000"

if not exist logs mkdir logs

"%NSSM%" install RecepcaoHSE "node" "server.js"
"%NSSM%" set RecepcaoHSE AppDirectory "%ROOT%"
"%NSSM%" set RecepcaoHSE AppEnvironmentExtra "PORT=!PORT!"
"%NSSM%" set RecepcaoHSE DisplayName "Recepção HSE"
"%NSSM%" set RecepcaoHSE Start SERVICE_AUTO_START
"%NSSM%" set RecepcaoHSE AppStdout "%ROOT%\logs\service.out.log"
"%NSSM%" set RecepcaoHSE AppStderr "%ROOT%\logs\service.err.log"
"%NSSM%" restart RecepcaoHSE

echo Serviço RecepcaoHSE instalado e iniciado.
endlocal

