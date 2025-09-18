const { exec } = require('child_process');

console.log('🔍 Testando comando PowerShell simples...');

const command = `Get-PnpDevice | Where-Object {$_.Name -like '*U.are.U*'} | Select-Object Name, Status`;

exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
  console.log('📋 Output:');
  console.log(stdout);
  console.log('📋 Erro:');
  console.log(stderr);
  console.log('📋 Exit code:', error ? error.code : 0);
});

