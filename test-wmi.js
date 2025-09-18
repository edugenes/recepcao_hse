const { exec } = require('child_process');

console.log('🔍 Testando comando WMI diretamente...');

const wmiCommand = `
try {
  Write-Host "🔄 Tentativa 1: Ativando via WMI..."
  $device = Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*U.are.U*'}
  if ($device) {
    Write-Host "✅ Dispositivo WMI encontrado: $($device.Name)"
    Write-Host "✅ DeviceID: $($device.DeviceID)"
    Write-Host "✅ Status: $($device.Status)"
    
    # Tentar ativar o dispositivo
    try {
      $device.Enable()
      Write-Host "✅ Dispositivo ativado via WMI"
    } catch {
      Write-Host "⚠️ Erro ao ativar via WMI: $($_.Exception.Message)"
    }
  } else {
    Write-Host "❌ Dispositivo não encontrado via WMI"
  }
} catch {
  Write-Host "⚠️ Erro WMI: $($_.Exception.Message)"
}
`;

exec(`powershell -Command "${wmiCommand}"`, (error, stdout, stderr) => {
  console.log('📋 Output WMI:');
  console.log(stdout);
  console.log('📋 Erro WMI:');
  console.log(stderr);
  console.log('📋 Exit code:', error ? error.code : 0);
});

