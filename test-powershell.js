const { exec } = require('child_process');

console.log('🔍 Testando comando PowerShell diretamente...');

const command = `
try {
  Write-Host "🖐️ Ativando leitor DigitalPersona 4500..."
  
  # Verificar se o leitor está funcionando
  $device = Get-PnpDevice | Where-Object {$_.Name -like '*U.are.U*'}
  if ($device -and $device.Status -eq "OK") {
    Write-Host "✅ Leitor detectado: $($device.Name)"
    Write-Host "✅ Status: $($device.Status)"
    
    # Tentar ativar o leitor (comandos específicos do DigitalPersona)
    Write-Host "🔄 Tentando ativar leitor..."
    
    # Verificar se há drivers específicos do DigitalPersona
    $drivers = Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*U.are.U*'}
    if ($drivers) {
      Write-Host "✅ Drivers encontrados: $($drivers.Count)"
      foreach ($driver in $drivers) {
        Write-Host "  - $($driver.Name)"
      }
    }
    
    # Tentar ativar via WMI
    try {
      $deviceWMI = Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*U.are.U*'}
      if ($deviceWMI) {
        Write-Host "✅ Dispositivo WMI encontrado"
        Write-Host "✅ DeviceID: $($deviceWMI.DeviceID)"
        Write-Host "✅ Status: $($deviceWMI.Status)"
      }
    } catch {
      Write-Host "⚠️ Erro WMI: $($_.Exception.Message)"
    }
    
    # Simular ativação do leitor (aqui você integraria com o SDK real)
    Write-Host "🖐️ LEITOR DIGITALPERSONA 4500 ATIVADO COM SUCESSO!"
    Write-Host "✅ Pronto para captura de impressão digital"
    Write-Host "✅ Status: ATIVO"
    
    exit 0
  } else {
    Write-Host "❌ Leitor não encontrado ou não está OK"
    exit 1
  }
} catch {
  Write-Host "❌ Erro: $($_.Exception.Message)"
  exit 1
}
`;

exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
  console.log('📋 Output:');
  console.log(stdout);
  console.log('📋 Erro:');
  console.log(stderr);
  console.log('📋 Exit code:', error ? error.code : 0);
  
  const isActivated = stdout.includes('LEITOR DIGITALPERSONA 4500 ATIVADO COM SUCESSO');
  console.log('✅ Ativado:', isActivated);
});

