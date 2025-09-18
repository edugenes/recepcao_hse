const WebSocket = require('ws');

console.log('🖐️ Testando ativação do leitor DigitalPersona 4500...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Conectado ao cliente DigitalPersona real!');
  
  // Primeiro verificar o leitor
  console.log('🔍 Verificando leitor...');
  ws.send(JSON.stringify({
    action: 'check_reader'
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log('📨 Resposta recebida:', response.action);
  
  if (response.action === 'check_reader') {
    if (response.success && response.available) {
      console.log('✅ Leitor detectado, tentando ativar...');
      
      // Tentar ativar o leitor
      ws.send(JSON.stringify({
        action: 'activate_reader'
      }));
    } else {
      console.log('❌ Leitor não disponível');
      ws.close();
    }
  } else if (response.action === 'activate_reader') {
    if (response.success) {
      console.log('🎉 LEITOR ATIVADO COM SUCESSO!');
      console.log('📋 Detalhes:', response.details);
    } else {
      console.log('❌ Falha ao ativar leitor');
      console.log('📋 Erro:', response.error);
    }
    ws.close();
  }
});

ws.on('error', (error) => {
  console.log('❌ Erro na conexão:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Conexão fechada');
  process.exit(0);
});

// Timeout
setTimeout(() => {
  console.log('⏰ Timeout - cliente não respondeu');
  process.exit(1);
}, 10000);

