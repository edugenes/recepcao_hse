@echo off
setlocal EnableDelayedExpansion

set "ROOT=%~dp0.."
cd /d "%ROOT%" >nul 2>&1

if not exist logs mkdir logs
if not exist data mkdir data

set "PORT=3000"
if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /I "%%A"=="PORT" set "PORT=%%B"
  )
)

set "PORT=!PORT: =!"
if "!PORT!"=="" set "PORT=3000"

echo Iniciando servidor na porta !PORT!...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$env:PORT='!PORT!'; $root='%ROOT:'='''%; $out=Join-Path $root 'logs/server.out.log'; $err=Join-Path $root 'logs/server.err.log'; $pidFile=Join-Path $root 'logs/.server.pid'; $p = Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $root -PassThru -RedirectStandardOutput $out -RedirectStandardError $err; Set-Content -Path $pidFile -Value $p.Id"

echo Servidor iniciado. Logs em logs\server.out.log e logs\server.err.log
endlocal

