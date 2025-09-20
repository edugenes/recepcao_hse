@echo off
:menu
cls
echo ========================================
echo   GERENCIADOR SERVIDOR - SISTEMA HSE
echo ========================================
echo.
echo 1. Ver Status do Servidor
echo 2. Ver Logs do Sistema
echo 3. Reiniciar Servidor
echo 4. Parar Servidor
echo 5. Iniciar Servidor
echo 6. Fazer Backup
echo 7. Ver IP do Servidor
echo 8. Testar Acesso
echo 9. Sair
echo.
set /p opcao="Escolha uma opcao (1-9): "

if "%opcao%"=="1" goto status
if "%opcao%"=="2" goto logs
if "%opcao%"=="3" goto restart
if "%opcao%"=="4" goto stop
if "%opcao%"=="5" goto start
if "%opcao%"=="6" goto backup
if "%opcao%"=="7" goto ip
if "%opcao%"=="8" goto test
if "%opcao%"=="9" goto exit
goto menu

:status
cls
echo ========================================
echo   STATUS DO SERVIDOR
echo ========================================
echo.
pm2 status
echo.
pause
goto menu

:logs
cls
echo ========================================
echo   LOGS DO SISTEMA
echo ========================================
echo.
pm2 logs recepcao-hse --lines 50
echo.
pause
goto menu

:restart
cls
echo ========================================
echo   REINICIANDO SERVIDOR
echo ========================================
echo.
pm2 restart recepcao-hse
echo.
echo Servidor reiniciado com sucesso!
pause
goto menu

:stop
cls
echo ========================================
echo   PARANDO SERVIDOR
echo ========================================
echo.
pm2 stop recepcao-hse
echo.
echo Servidor parado!
pause
goto menu

:start
cls
echo ========================================
echo   INICIANDO SERVIDOR
echo ========================================
echo.
pm2 start recepcao-hse
echo.
echo Servidor iniciado!
pause
goto menu

:backup
cls
echo ========================================
echo   FAZENDO BACKUP
echo ========================================
echo.
call backup-automatico.bat
goto menu

:ip
cls
echo ========================================
echo   IP DO SERVIDOR
echo ========================================
echo.
echo IPs disponiveis:
ipconfig | findstr "IPv4"
echo.
echo URL de acesso: http://[IP_ACIMA]:3000
echo.
pause
goto menu

:test
cls
echo ========================================
echo   TESTANDO ACESSO
echo ========================================
echo.
echo Testando acesso local...
curl -s http://localhost:3000 >nul
if %errorlevel%==0 (
    echo ✅ Servidor respondendo localmente
) else (
    echo ❌ Servidor nao esta respondendo
)
echo.
echo Abrindo navegador para teste...
start http://localhost:3000
echo.
pause
goto menu

:exit
echo.
echo Saindo do gerenciador...
exit


