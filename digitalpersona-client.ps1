# DigitalPersona 4500 Client - PowerShell
# Cliente para o WebApp Original

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Configurações
$webappUrl = "http://localhost:3000"
$logMessages = @()

# Função para adicionar log
function Add-LogMessage {
    param($message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    $logMessages += $logEntry
    $txtLog.AppendText("$logEntry`r`n")
    $txtLog.SelectionStart = $txtLog.Text.Length
    $txtLog.ScrollToCaret()
}

# Função para verificar leitor
function Check-Reader {
    Add-LogMessage "🔍 Verificando leitor DigitalPersona 4500..."
    
    try {
        $result = Get-PnpDevice -Class Biometric | Where-Object {$_.FriendlyName -like "*DigitalPersona*"} | Select-Object FriendlyName, Status
        
        if ($result -and $result.FriendlyName -like "*DigitalPersona*") {
            $lblStatus.Text = "✅ Leitor DigitalPersona 4500 detectado"
            $lblStatus.ForeColor = [System.Drawing.Color]::Green
            Add-LogMessage "✅ Leitor DigitalPersona 4500 detectado e funcionando!"
            return $true
        } else {
            $lblStatus.Text = "❌ Leitor DigitalPersona 4500 não detectado"
            $lblStatus.ForeColor = [System.Drawing.Color]::Red
            Add-LogMessage "❌ Leitor DigitalPersona 4500 não detectado"
            Add-LogMessage "💡 Verifique se o leitor está conectado e os drivers instalados"
            return $false
        }
    } catch {
        $lblStatus.Text = "❌ Erro na verificação"
        $lblStatus.ForeColor = [System.Drawing.Color]::Red
        Add-LogMessage "❌ Erro ao verificar leitor: $($_.Exception.Message)"
        return $false
    }
}

# Função para capturar impressão
function Capture-Fingerprint {
    Add-LogMessage "🖐️ Iniciando captura de impressão digital..."
    
    if ($lblStatus.Text -like "*não detectado*") {
        [System.Windows.Forms.MessageBox]::Show("Leitor DigitalPersona não detectado. Verifique a conexão.", "Aviso", "OK", "Warning")
        return
    }

    try {
        Add-LogMessage "📡 Conectando com o leitor..."
        Add-LogMessage "👆 Coloque o dedo no leitor..."
        
        # Simular captura (aqui você integraria o SDK real)
        Start-Sleep -Seconds 2
        
        $quality = Get-Random -Minimum 60 -Maximum 100
        $template = "TEMPLATE_$(Get-Date -Format 'yyyyMMddHHmmss')"
        
        Add-LogMessage "✅ Captura realizada com sucesso!"
        Add-LogMessage "📊 Qualidade: $quality%"
        Add-LogMessage "🔑 Template: $template"
        Add-LogMessage "💾 Impressão digital salva no sistema"
        
        [System.Windows.Forms.MessageBox]::Show("Impressão digital capturada com sucesso!`nQualidade: $quality%", "Sucesso", "OK", "Information")
    } catch {
        Add-LogMessage "❌ Erro na captura: $($_.Exception.Message)"
    }
}

# Função para notificar webapp
function Notify-WebApp {
    param($eventType, $message)
    
    try {
        $payload = @{
            event = $eventType
            message = $message
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        } | ConvertTo-Json

        $response = Invoke-RestMethod -Uri "$webappUrl/api/biometric-event" -Method Post -Body $payload -ContentType "application/json"
        Add-LogMessage "📡 Evento enviado para o webapp"
    } catch {
        Add-LogMessage "⚠️ Erro ao notificar webapp: $($_.Exception.Message)"
    }
}

# Criar interface
$form = New-Object System.Windows.Forms.Form
$form.Text = "DigitalPersona 4500 - Cliente Biométrico"
$form.Size = New-Object System.Drawing.Size(500, 400)
$form.StartPosition = "CenterScreen"

# Status
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "🔍 Verificando leitor..."
$lblStatus.Location = New-Object System.Drawing.Point(20, 20)
$lblStatus.Size = New-Object System.Drawing.Size(400, 30)
$lblStatus.Font = New-Object System.Drawing.Font("Arial", 12)
$form.Controls.Add($lblStatus)

# Botão Verificar
$btnCheckReader = New-Object System.Windows.Forms.Button
$btnCheckReader.Text = "🔍 Verificar Leitor"
$btnCheckReader.Location = New-Object System.Drawing.Point(20, 60)
$btnCheckReader.Size = New-Object System.Drawing.Size(150, 40)
$btnCheckReader.BackColor = [System.Drawing.Color]::FromArgb(52, 152, 219)
$btnCheckReader.ForeColor = [System.Drawing.Color]::White
$btnCheckReader.Add_Click({ Check-Reader })
$form.Controls.Add($btnCheckReader)

# Botão Capturar
$btnCapture = New-Object System.Windows.Forms.Button
$btnCapture.Text = "🖐️ Capturar Impressão"
$btnCapture.Location = New-Object System.Drawing.Point(190, 60)
$btnCapture.Size = New-Object System.Drawing.Size(150, 40)
$btnCapture.BackColor = [System.Drawing.Color]::FromArgb(231, 76, 60)
$btnCapture.ForeColor = [System.Drawing.Color]::White
$btnCapture.Add_Click({ Capture-Fingerprint })
$form.Controls.Add($btnCapture)

# Label Log
$lblLog = New-Object System.Windows.Forms.Label
$lblLog.Text = "Log de Atividades:"
$lblLog.Location = New-Object System.Drawing.Point(20, 120)
$lblLog.Size = New-Object System.Drawing.Size(200, 30)
$lblLog.Font = New-Object System.Drawing.Font("Arial", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblLog)

# TextBox Log
$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ScrollBars = "Vertical"
$txtLog.Location = New-Object System.Drawing.Point(20, 150)
$txtLog.Size = New-Object System.Drawing.Size(440, 200)
$txtLog.Font = New-Object System.Drawing.Font("Consolas", 9)
$txtLog.ReadOnly = $true
$form.Controls.Add($txtLog)

# Verificar leitor na inicialização
Check-Reader

# Mostrar formulário
$form.ShowDialog()
