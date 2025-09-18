@echo off
echo ========================================
echo   BACKUP AUTOMATICO - SISTEMA HSE
echo ========================================
echo.

echo Criando diretorio de backup...
if not exist "backup" mkdir backup

echo.
echo Fazendo backup do banco de dados...
set timestamp=%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%

copy "recepcao.db" "backup\recepcao_%timestamp%.db"
if %errorlevel% neq 0 (
    echo ERRO: Falha ao fazer backup!
    pause
    exit /b 1
)

echo.
echo Backup criado: backup\recepcao_%timestamp%.db

echo.
echo Limpando backups antigos (manter apenas 30 dias)...
forfiles /p backup /m recepcao_*.db /d -30 /c "cmd /c del @path" 2>nul

echo.
echo Backup concluido com sucesso!
echo.
pause
