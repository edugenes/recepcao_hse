@echo off
echo ========================================
echo   CONFIGURACAO DE REDE - SISTEMA HSE
echo   Permitir acesso das recepcoes
echo ========================================
echo.

echo Configurando firewall do Windows...
echo.

echo Adicionando regra de entrada para porta 3000...
netsh advfirewall firewall add rule name="Sistema HSE - Porta 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo Verificando IP do servidor...
ipconfig | findstr "IPv4"

echo.
echo ========================================
echo   CONFIGURACAO DE REDE CONCLUIDA!
echo ========================================
echo.
echo O servidor agora aceita conexoes externas na porta 3000
echo.
echo Para acessar de outras maquinas:
echo   http://[IP_DO_SERVIDOR]:3000
echo.
echo Exemplo:
echo   http://192.168.1.100:3000
echo   http://10.0.0.50:3000
echo.
echo IMPORTANTE: Anote o IP do servidor acima!
echo.
pause


