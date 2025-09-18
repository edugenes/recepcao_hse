const { exec } = require('child_process');

console.log('🔍 Testando comando WMI simples...');

const wmiCommand = `Get-WmiObject -Class Win32_PnPEntity | Where-Object {$_.Name -like '*U.are.U*'} | Select-Object Name, DeviceID, Status`;

exec(`powershell -Command "${wmiCommand}"`, (error, stdout, stderr) => {
  console.log('📋 Output WMI:');
  console.log(stdout);
  console.log('📋 Erro WMI:');
  console.log(stderr);
  console.log('📋 Exit code:', error ? error.code : 0);
});

