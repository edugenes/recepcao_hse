const WebSocket = require('ws');

console.log('🔌 Testando conexão WebSocket...');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Conectado ao cliente DigitalPersona real!');
  
  // Enviar mensagem de teste
  ws.send(JSON.stringify({
    action: 'check_reader'
  }));
});

ws.on('message', (data) => {
  console.log('📨 Resposta recebida:', JSON.parse(data));
  ws.close();
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
}, 5000);

