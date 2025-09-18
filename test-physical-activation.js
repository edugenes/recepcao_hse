const WebSocket = require('ws');

console.log('🖐️ Testando ativação FÍSICA do leitor DigitalPersona 4500...');

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
      console.log('✅ Leitor detectado, tentando ativar FISICAMENTE...');
      
      // Tentar ativar o leitor
      ws.send(JSON.stringify({
        action: 'activate_reader'
      }));
    } else {
      console.log('❌ Leitor não disponível');
      ws.close();
    }
  } else if (response.action === 'activate_reader') {
    console.log('📋 Sucesso:', response.success);
    console.log('📋 Leitor ativo:', response.readerActive);
    console.log('📋 Ativação física:', response.physicalActivation);
    console.log('📋 Detalhes:', response.details);
    
    if (response.success && response.physicalActivation) {
      console.log('🎉 LEITOR FÍSICO ATIVADO COM SUCESSO!');
    } else if (response.success && !response.physicalActivation) {
      console.log('⚠️ Leitor detectado mas não foi possível ativar fisicamente');
      console.log('💡 Pode precisar de drivers específicos ou permissões administrativas');
    } else {
      console.log('❌ Falha ao ativar leitor');
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
}, 15000);

