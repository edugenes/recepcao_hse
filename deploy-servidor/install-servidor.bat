@echo off
echo ========================================
echo   INSTALACAO SERVIDOR - SISTEMA HSE
echo   Deploy para Servidor 24/7
echo ========================================
echo.

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Node.js nao encontrado!
    echo.
    echo Por favor, instale o Node.js 18+:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo Instalando PM2 (Process Manager)...
npm install -g pm2
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar PM2!
    pause
    exit /b 1
)

echo.
echo Instalando dependencias do projeto...
npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias!
    pause
    exit /b 1
)

echo.
echo Configurando servidor para acesso de rede...
echo.

echo Criando arquivo de configuracao PM2...
echo { > ecosystem.config.js
echo   "apps": [{ >> ecosystem.config.js
echo     "name": "recepcao-hse", >> ecosystem.config.js
echo     "script": "server.js", >> ecosystem.config.js
echo     "instances": 1, >> ecosystem.config.js
echo     "exec_mode": "cluster", >> ecosystem.config.js
echo     "env": { >> ecosystem.config.js
echo       "NODE_ENV": "production", >> ecosystem.config.js
echo       "PORT": 3000 >> ecosystem.config.js
echo     }, >> ecosystem.config.js
echo     "error_file": "./logs/err.log", >> ecosystem.config.js
echo     "out_file": "./logs/out.log", >> ecosystem.config.js
echo     "log_file": "./logs/combined.log", >> ecosystem.config.js
echo     "time": true >> ecosystem.config.js
echo   }] >> ecosystem.config.js
echo } >> ecosystem.config.js

echo.
echo Criando diretorio de logs...
if not exist "logs" mkdir logs

echo.
echo Iniciando servidor com PM2...
pm2 start ecosystem.config.js

echo.
echo Configurando PM2 para iniciar automaticamente...
pm2 startup
pm2 save

echo.
echo ========================================
echo   INSTALACAO CONCLUIDA!
echo ========================================
echo.
echo Servidor rodando em: http://localhost:3000
echo Para acesso externo: http://[IP_DO_SERVIDOR]:3000
echo.
echo Comandos PM2:
echo   pm2 status     - Ver status
echo   pm2 restart    - Reiniciar
echo   pm2 stop       - Parar
echo   pm2 logs       - Ver logs
echo.
echo Pressione qualquer tecla para continuar...
pause


