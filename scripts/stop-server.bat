@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
cd /d "%ROOT%" >nul 2>&1

set "PIDFILE=logs\.server.pid"

if exist "%PIDFILE%" (
  set /p PID=<"%PIDFILE%"
  if not "!PID!"=="" (
    echo Tentando encerrar processo PID !PID!...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Stop-Process -Id %PID% -Force -ErrorAction Stop } catch {}"
    del "%PIDFILE%" >nul 2>&1
  )
)

echo Verificando processos node server.js restantes...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'server.js' -and $_.CommandLine -match [regex]::Escape('%ROOT%') } | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }"

echo Servidor parado (se estava em execução).
endlocal

