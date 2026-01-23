# ============================================
# Script de Preparação para Produção
# Sistema de Recepção HSE
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [int]$Port = 3000,
    [Parameter(Mandatory=$false)]
    [string]$JwtSecret = $null
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Write-Warn($msg) {
    Write-Host "[AVISO] $msg" -ForegroundColor Yellow
}

function Write-Ok($msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Error-Custom($msg) {
    Write-Host "[ERRO] $msg" -ForegroundColor Red
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "`n============================================" -ForegroundColor Blue
Write-Host "  PREPARAÇÃO PARA PRODUÇÃO" -ForegroundColor Blue
Write-Host "  Sistema de Recepção HSE" -ForegroundColor Blue
Write-Host "============================================`n" -ForegroundColor Blue

# 1. Verificar Node.js
Write-Info "Verificando Node.js..."
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Error-Custom "Node.js não encontrado! Instale Node.js 18+ primeiro."
    exit 1
}
Write-Ok "Node.js encontrado: $nodeVersion"

# 2. Instalar dependências
Write-Info "Instalando dependências de produção..."
try {
    npm install --production
    Write-Ok "Dependências instaladas"
} catch {
    Write-Error-Custom "Erro ao instalar dependências: $_"
    exit 1
}

# 3. Criar diretórios necessários
Write-Info "Criando diretórios necessários..."
$dirs = @('logs', 'uploads', 'data')
foreach ($dir in $dirs) {
    $dirPath = Join-Path $root $dir
    if (-not (Test-Path $dirPath)) {
        New-Item -ItemType Directory -Force -Path $dirPath | Out-Null
        Write-Ok "Diretório criado: $dir"
    } else {
        Write-Info "Diretório já existe: $dir"
    }
}

# 4. Configurar .env
Write-Info "Configurando arquivo .env..."
$envPath = Join-Path $root '.env'
$envExamplePath = Join-Path $root '.env.example'

if (-not (Test-Path $envExamplePath)) {
    Write-Warn "Arquivo .env.example não encontrado. Criando..."
    # Criar .env.example básico
    @"
PORT=3000
NODE_ENV=production
JWT_SECRET=altere_este_valor_em_producao
"@ | Set-Content -Path $envExamplePath -Encoding UTF8
}

if (-not (Test-Path $envPath)) {
    Write-Info "Criando arquivo .env a partir de .env.example..."
    Copy-Item $envExamplePath $envPath
    
    # Gerar JWT_SECRET se não fornecido
    if (-not $JwtSecret) {
        $bytes = 1..32 | ForEach-Object { Get-Random -Maximum 256 }
        $JwtSecret = [Convert]::ToBase64String($bytes)
    }
    
    # Atualizar .env
    $envContent = Get-Content $envPath
    $envContent = $envContent | ForEach-Object {
        if ($_ -match '^PORT=') {
            "PORT=$Port"
        } elseif ($_ -match '^JWT_SECRET=') {
            "JWT_SECRET=$JwtSecret"
        } elseif ($_ -match '^NODE_ENV=') {
            "NODE_ENV=production"
        } else {
            $_
        }
    }
    $envContent | Set-Content -Path $envPath -Encoding UTF8
    
    Write-Ok "Arquivo .env criado"
    Write-Warn "IMPORTANTE: Revise o arquivo .env e ajuste as configurações!"
} else {
    Write-Info "Arquivo .env já existe. Verificando configurações..."
    
    $envContent = Get-Content $envPath
    $needsUpdate = $false
    
    # Verificar PORT
    if ($envContent -notmatch '^PORT=') {
        Add-Content -Path $envPath -Value "PORT=$Port"
        $needsUpdate = $true
    }
    
    # Verificar JWT_SECRET
    if ($envContent -notmatch '^JWT_SECRET=') {
        if (-not $JwtSecret) {
            $bytes = 1..32 | ForEach-Object { Get-Random -Maximum 256 }
            $JwtSecret = [Convert]::ToBase64String($bytes)
        }
        Add-Content -Path $envPath -Value "JWT_SECRET=$JwtSecret"
        $needsUpdate = $true
    } elseif ($envContent -match '^JWT_SECRET=altere_este_valor') {
        Write-Warn "JWT_SECRET ainda está com valor padrão! Altere no arquivo .env"
    }
    
    # Verificar NODE_ENV
    if ($envContent -notmatch '^NODE_ENV=') {
        Add-Content -Path $envPath -Value "NODE_ENV=production"
        $needsUpdate = $true
    }
    
    if ($needsUpdate) {
        Write-Ok "Arquivo .env atualizado"
    } else {
        Write-Ok "Arquivo .env já está configurado"
    }
}

# 5. Inicializar banco de dados
Write-Info "Verificando banco de dados..."
$dbPath = Join-Path $root 'recepcao.db'
if (-not (Test-Path $dbPath)) {
    Write-Info "Banco de dados não encontrado. Inicializando..."
    $initScript = Join-Path $root 'scripts/init-db.js'
    if (Test-Path $initScript) {
        try {
            node $initScript
            Write-Ok "Banco de dados inicializado"
        } catch {
            Write-Warn "Erro ao inicializar banco de dados: $_"
            Write-Info "Você pode inicializar manualmente com: node scripts/init-db.js"
        }
    } else {
        Write-Warn "Script de inicialização não encontrado: $initScript"
    }
} else {
    Write-Ok "Banco de dados encontrado"
}

# 6. Verificar porta
Write-Info "Verificando se a porta $Port está disponível..."
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Warn "Porta $Port está em uso! Verifique se outro processo está usando esta porta."
} else {
    Write-Ok "Porta $Port está disponível"
}

# 7. Resumo
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  PREPARAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green

Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Revise o arquivo .env e ajuste as configurações" -ForegroundColor White
Write-Host "2. Altere a senha padrão do admin após o primeiro login" -ForegroundColor White
Write-Host "3. Configure o firewall para permitir a porta $Port" -ForegroundColor White
Write-Host "4. Inicie o servidor com: npm start" -ForegroundColor White
Write-Host "   Ou instale como serviço: .\scripts\install-service.bat`n" -ForegroundColor White

Write-Ok "Sistema pronto para produção!"
