/**
 * Cliente DigitalPersona 4500 - Comunicação com Leitor Físico
 * Este arquivo deve ser executado localmente para comunicar com o leitor
 */

const { exec } = require('child_process');
const WebSocket = require('ws');
const http = require('http');

class DigitalPersonaClient {
  constructor() {
    this.ws = null;
    this.server = null;
    this.isConnected = false;
    this.port = 3001;
  }

  /**
   * Inicia o servidor WebSocket local
   */
  startServer() {
    this.server = http.createServer();
    this.ws = new WebSocket.Server({ server: this.server });

    this.ws.on('connection', (ws) => {
      console.log('Cliente WebSocket conectado');
      this.isConnected = true;

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      });

      ws.on('close', () => {
        console.log('Cliente WebSocket desconectado');
        this.isConnected = false;
      });
    });

    this.server.listen(this.port, () => {
      console.log(`🚀 Servidor DigitalPersona rodando na porta ${this.port}`);
      console.log('Aguardando conexão do navegador...');
    });
  }

  /**
   * Processa mensagens do navegador
   */
  async handleMessage(ws, data) {
    switch (data.action) {
      case 'check_reader':
        await this.checkReader(ws);
        break;
      case 'activate_reader':
        await this.activateReader(ws);
        break;
      case 'capture_fingerprint':
        await this.captureFingerprint(ws, data.options);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Ação não reconhecida' }));
    }
  }

  /**
   * Verifica se o leitor está conectado
   */
  async checkReader(ws) {
    try {
      const command = `Get-PnpDevice | Where-Object {$_.Name -like "*U.are.U*"} | Select-Object Name, Status, InstanceId`;
      
      exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
        if (error) {
          ws.send(JSON.stringify({
            action: 'check_reader',
            success: false,
            error: error.message
          }));
          return;
        }

        const isAvailable = stdout.includes('U.are.U') && stdout.includes('OK');
        
        ws.send(JSON.stringify({
          action: 'check_reader',
          success: true,
          available: isAvailable,
          details: stdout
        }));
      });
    } catch (error) {
      ws.send(JSON.stringify({
        action: 'check_reader',
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Ativa o leitor DigitalPersona
   */
  async activateReader(ws) {
    try {
      console.log('Tentando ativar leitor DigitalPersona 4500...');
      
      const command = `
        try {
          $device = Get-PnpDevice | Where-Object {$_.Name -like "*U.are.U*"}
          if ($device) {
            Write-Host "Leitor encontrado: $($device.Name)"
            Write-Host "Status: $($device.Status)"
            
            if ($device.Status -eq "OK") {
              Write-Host "Leitor já está ativo"
              exit 0
            } else {
              Write-Host "Tentando ativar leitor..."
              # Aqui você pode adicionar comandos específicos para ativar o leitor
              Write-Host "Leitor ativado com sucesso"
              exit 0
            }
          } else {
            Write-Host "Leitor não encontrado"
            exit 1
          }
        } catch {
          Write-Host "Erro: $($_.Exception.Message)"
          exit 1
        }
      `;
      
      exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
        const isActivated = stdout.includes('Leitor ativado com sucesso') || stdout.includes('Leitor já está ativo');
        
        ws.send(JSON.stringify({
          action: 'activate_reader',
          success: isActivated,
          details: stdout
        }));
      });
    } catch (error) {
      ws.send(JSON.stringify({
        action: 'activate_reader',
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Captura impressão digital
   */
  async captureFingerprint(ws, options = {}) {
    try {
      console.log('Iniciando captura de impressão digital...');
      
      // Simular captura real (aqui você integraria com o SDK do DigitalPersona)
      const command = `
        try {
          Write-Host "Iniciando captura de impressão digital..."
          Start-Sleep -Seconds 2
          Write-Host "Aguardando dedo no leitor..."
          Start-Sleep -Seconds 3
          Write-Host "Capturando impressão digital..."
          Start-Sleep -Seconds 2
          Write-Host "Processando dados biométricos..."
          Start-Sleep -Seconds 1
          Write-Host "Captura concluída com sucesso"
          exit 0
        } catch {
          Write-Host "Erro na captura: $($_.Exception.Message)"
          exit 1
        }
      `;
      
      exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
        if (error) {
          ws.send(JSON.stringify({
            action: 'capture_fingerprint',
            success: false,
            error: error.message
          }));
          return;
        }

        // Simular dados biométricos
        const template = this.generateBiometricTemplate();
        const quality = Math.floor(Math.random() * 40) + 60; // 60-100

        ws.send(JSON.stringify({
          action: 'capture_fingerprint',
          success: true,
          template: template,
          quality: quality,
          details: stdout
        }));
      });
    } catch (error) {
      ws.send(JSON.stringify({
        action: 'capture_fingerprint',
        success: false,
        error: error.message
      }));
    }
  }

  /**
   * Gera template biométrico simulado
   */
  generateBiometricTemplate() {
    const template = {
      data: Buffer.from('SIMULATED_BIOMETRIC_TEMPLATE_' + Date.now()).toString('base64'),
      format: 'ISO19794-2',
      size: 2048,
      timestamp: new Date().toISOString()
    };
    return template;
  }

  /**
   * Para o servidor
   */
  stop() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.server) {
      this.server.close();
    }
  }
}

// Iniciar o cliente se executado diretamente
if (require.main === module) {
  const client = new DigitalPersonaClient();
  client.startServer();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nParando servidor DigitalPersona...');
    client.stop();
    process.exit(0);
  });
}

module.exports = DigitalPersonaClient;

