# Sistema de Recepção HSE - Executor Automático
# Versão: 1.0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    SISTEMA DE RECEPCAO HSE - v1.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se o Node.js está instalado
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
        Write-Host "   Baixe e instale o Node.js em: https://nodejs.org/" -ForegroundColor Yellow
        return $false
    }
    return $false
}

# Função para instalar dependências
function Install-Dependencies {
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
        try {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
            } else {
                Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
                return $false
            }
        }
        catch {
            Write-Host "❌ Erro ao instalar dependências: $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "✅ Dependências já instaladas!" -ForegroundColor Green
    }
    return $true
}

# Função para verificar se a porta está em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName "localhost" -Port $Port -InformationLevel Quiet
        return $connection
    }
    catch {
        return $false
    }
}

# Função para matar processo na porta
function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($process) {
            $pid = $process.OwningProcess
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "🔄 Processo na porta $Port finalizado" -ForegroundColor Yellow
        }
    }
    catch {
        # Ignorar erros
    }
}

# Função para abrir o navegador
function Open-Browser {
    param([string]$Url)
    try {
        Start-Process $Url
        Write-Host "🌐 Navegador aberto em: $Url" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Não foi possível abrir o navegador automaticamente" -ForegroundColor Yellow
        Write-Host "   Acesse manualmente: $Url" -ForegroundColor Yellow
    }
}

# Função principal
function Start-SistemaRecepcao {
    Write-Host "[1/4] Verificando Node.js..." -ForegroundColor Cyan
    if (-not (Test-NodeJS)) {
        Read-Host "Pressione Enter para sair"
        exit 1
    }

    Write-Host ""
    Write-Host "[2/4] Verificando dependências..." -ForegroundColor Cyan
    if (-not (Install-Dependencies)) {
        Read-Host "Pressione Enter para sair"
        exit 1
    }

    Write-Host ""
    Write-Host "[3/4] Verificando porta 3000..." -ForegroundColor Cyan
    if (Test-Port -Port 3000) {
        Write-Host "⚠️  Porta 3000 está em uso. Tentando liberar..." -ForegroundColor Yellow
        Stop-ProcessOnPort -Port 3000
        Start-Sleep -Seconds 2
    }

    Write-Host ""
    Write-Host "[4/4] Iniciando servidor..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🌐 Servidor iniciando em: http://localhost:3000" -ForegroundColor Green
    Write-Host "📱 Interface web disponível em: http://localhost:3000" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
    Write-Host ""

    # Aguardar um pouco antes de abrir o navegador
    Start-Sleep -Seconds 3
    Open-Browser -Url "http://localhost:3000"

    # Iniciar o servidor
    try {
        node server.js
    }
    catch {
        Write-Host ""
        Write-Host "❌ Erro ao iniciar o servidor: $($_.Exception.Message)" -ForegroundColor Red
    }
    finally {
        Write-Host ""
        Write-Host "Servidor finalizado." -ForegroundColor Yellow
        Read-Host "Pressione Enter para sair"
    }
}

# Executar função principal
Start-SistemaRecepcao
