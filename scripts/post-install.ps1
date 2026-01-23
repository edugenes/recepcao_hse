param(
    [Parameter(Mandatory=$false)]
    [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) {
    Write-Host "[INFO] $msg"
}

function Write-Warn($msg) {
    Write-Host "[AVISO] $msg" -ForegroundColor Yellow
}

function Write-Ok($msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Garantir pastas
$logDir = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force -Path $logDir | Out-Null }

# Gerar .env
$envPath = Join-Path $root '.env'
if (-not (Test-Path $envPath)) {
    $secret = [Guid]::NewGuid().ToString('N')
    $content = @(
        "PORT=$Port",
        "JWT_SECRET=$secret",
        "NODE_ENV=production"
    )
    $content | Set-Content -Path $envPath -Encoding UTF8
    Write-Ok "Arquivo .env criado."
} else {
    $lines = Get-Content $envPath
    $updated = $false
    if ($lines -notmatch '^PORT=') {
        $lines += "PORT=$Port"
        $updated = $true
    } else {
        $lines = $lines | ForEach-Object { if ($_ -match '^PORT=') { "PORT=$Port" } else { $_ } }
        $updated = $true
    }
    if ($lines -notmatch '^JWT_SECRET=') {
        $lines += "JWT_SECRET=" + ([Guid]::NewGuid().ToString('N'))
        $updated = $true
    }
    if ($lines -notmatch '^NODE_ENV=') {
        $lines += "NODE_ENV=production"
        $updated = $true
    }
    if ($updated) {
        $lines | Set-Content -Path $envPath -Encoding UTF8
        Write-Ok ".env atualizado."
    } else {
        Write-Info ".env já configurado."
    }
}

# Preparar banco de dados usando script Node
$seedScript = Join-Path $root 'scripts/init-db.js'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw 'Node.js não encontrado no PATH. Execute a opção de instalar Node no instalador.'
}

Write-Info "Executando script de seed do banco..."
& node $seedScript --db "./recepcao.db" --admin-login "admin" --admin-email "admin@recepcao.com" --admin-password "admin123"
Write-Ok "Banco preparado. Usuário admin/admin123 garantido."

# Criar regra de firewall
try {
    $ruleName = "RecepcaoHSE_$Port"
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if (-not $existing) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
        Write-Ok "Regra de firewall criada."
    } else {
        Write-Info "Regra de firewall já existe."
    }
} catch {
    Write-Warn "Não foi possível configurar o firewall automaticamente: $_"
}
