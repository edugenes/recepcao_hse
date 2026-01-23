@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
cd /d "%ROOT%" >nul 2>&1
set "NSSM=%ROOT%\tools\nssm.exe"

if exist "%NSSM%" (
  "%NSSM%" stop RecepcaoHSE >nul 2>&1
  "%NSSM%" remove RecepcaoHSE confirm >nul 2>&1
)

echo Serviço RecepcaoHSE removido (se existia).
endlocal

