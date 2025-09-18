/**
 * Módulo de Captura Biométrica - DigitalPersona 4500 FÍSICO REAL
 * Versão 3.0 - Conecta ao cliente local para ativação real do leitor
 */

class BiometricCapturePhysical {
  constructor() {
    this.isSupported = false;
    this.device = null;
    this.template = null;
    this.quality = 0;
    this.previewElement = null;
    this.callbacks = {
      onSuccess: null,
      onError: null,
      onProgress: null
    };
    this.ws = null;
    this.realClientConnected = false;
    this.realReaderActive = false;
    this.isCapturing = false;
  }

  /**
   * Inicializa a captura biométrica
   */
  async initializeCapture(previewElementId) {
    this.previewElement = document.getElementById(previewElementId);
    
    if (!this.previewElement) {
      throw new Error('Elemento de preview não encontrado');
    }

    console.log('🖐️ Inicializando captura biométrica FÍSICA...');
    
    // Conectar ao cliente real
    await this.connectToRealClient();
    
    // Verificar se o leitor está disponível
    const readerAvailable = await this.checkRealReader();
    
    if (!readerAvailable) {
      throw new Error('Leitor DigitalPersona 4500 não está disponível');
    }

    this.setupPreview();
    this.isSupported = true;
    
    console.log('✅ Captura biométrica física inicializada');
  }

  /**
   * Conecta ao cliente real via WebSocket
   */
  async connectToRealClient() {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Conectando ao cliente DigitalPersona real...');
        
        this.ws = new WebSocket('ws://localhost:3001');
        
        this.ws.onopen = () => {
          console.log('✅ Conectado ao cliente DigitalPersona real');
          this.realClientConnected = true;
          resolve(true);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleRealClientMessage(data);
          } catch (error) {
            console.error('❌ Erro ao processar mensagem do cliente real:', error);
          }
        };
        
        this.ws.onclose = () => {
          console.log('🔌 Conexão com cliente real fechada');
          this.realClientConnected = false;
          this.realReaderActive = false;
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ Erro na conexão com cliente real:', error);
          reject(new Error('Não foi possível conectar ao cliente DigitalPersona real'));
        };
        
        // Timeout de conexão
        setTimeout(() => {
          if (!this.realClientConnected) {
            reject(new Error('Timeout na conexão com cliente real'));
          }
        }, 5000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Processa mensagens do cliente real
   */
  handleRealClientMessage(data) {
    console.log('📨 Mensagem do cliente real:', data);
    
    switch (data.action) {
      case 'check_reader':
        if (data.success && data.available) {
          console.log('✅ Leitor real detectado e funcionando');
        } else {
          console.log('❌ Leitor real não disponível');
        }
        break;
        
      case 'activate_reader':
        if (data.success) {
          console.log('🎉 LEITOR REAL ATIVADO COM SUCESSO!');
          this.realReaderActive = true;
          this.updateStatus('Leitor físico ativado! Aguardando captura...', 'success');
        } else {
          console.log('❌ Falha ao ativar leitor real');
          this.updateStatus('Erro ao ativar leitor físico', 'error');
        }
        break;
        
      case 'capture_fingerprint':
        if (data.success) {
          console.log('🎉 CAPTURA REAL CONCLUÍDA!');
          this.template = data.template;
          this.quality = data.quality;
          this.isCapturing = false;
          
          if (this.callbacks.onSuccess) {
            this.callbacks.onSuccess({
              template: this.template,
              quality: this.quality,
              real: true
            });
          }
        } else {
          console.log('❌ Falha na captura real');
          this.isCapturing = false;
          if (this.callbacks.onError) {
            this.callbacks.onError(new Error(data.error || 'Falha na captura real'));
          }
        }
        break;
        
      case 'deactivate_reader':
        this.realReaderActive = false;
        console.log('🔄 Leitor real desativado');
        break;
    }
  }

  /**
   * Verifica se o leitor real está disponível
   */
  async checkRealReader() {
    return new Promise((resolve) => {
      if (!this.realClientConnected) {
        resolve(false);
        return;
      }
      
      this.ws.send(JSON.stringify({
        action: 'check_reader'
      }));
      
      // Aguardar resposta
      const originalHandler = this.ws.onmessage;
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.action === 'check_reader') {
            this.ws.onmessage = originalHandler;
            resolve(data.success && data.available);
          }
        } catch (error) {
          console.error('❌ Erro ao verificar leitor real:', error);
          this.ws.onmessage = originalHandler;
          resolve(false);
        }
      };
      
      // Timeout
      setTimeout(() => {
        this.ws.onmessage = originalHandler;
        resolve(false);
      }, 3000);
    });
  }

  /**
   * Ativa o leitor real
   */
  async activateRealReader() {
    if (!this.realClientConnected) {
      throw new Error('Cliente real não conectado');
    }
    
    console.log('🖐️ Ativando leitor DigitalPersona 4500 REAL...');
    
    this.ws.send(JSON.stringify({
      action: 'activate_reader'
    }));
    
    // Aguardar ativação
    return new Promise((resolve) => {
      const checkActivation = () => {
        if (this.realReaderActive) {
          resolve(true);
        } else {
          setTimeout(checkActivation, 100);
        }
      };
      checkActivation();
    });
  }

  /**
   * Captura impressão digital real
   */
  async captureFingerprint() {
    if (!this.realClientConnected) {
      throw new Error('Cliente real não conectado');
    }
    
    if (!this.realReaderActive) {
      throw new Error('Leitor real não está ativo');
    }
    
    console.log('🖐️ Iniciando captura REAL de impressão digital...');
    
    this.isCapturing = true;
    this.updateStatus('Capturando impressão digital real...', 'capturing');
    
    this.ws.send(JSON.stringify({
      action: 'capture_fingerprint',
      options: {
        timeout: 30000,
        quality: 60
      }
    }));
    
    // Aguardar captura
    return new Promise((resolve, reject) => {
      const checkCapture = () => {
        if (!this.isCapturing) {
          if (this.template) {
            resolve({
              success: true,
              template: this.template,
              quality: this.quality,
              real: true
            });
          } else {
            reject(new Error('Captura falhou'));
          }
        } else {
          setTimeout(checkCapture, 100);
        }
      };
      checkCapture();
    });
  }

  /**
   * Configura o preview
   */
  setupPreview() {
    if (!this.previewElement) return;
    
    this.previewElement.innerHTML = `
      <div class="preview-container">
        <div class="preview-header">
          <div class="preview-title">🔒 DigitalPersona 4500</div>
          <div class="preview-subtitle">Leitor Biométrico REAL</div>
        </div>
        <div class="preview-area">
          <div class="preview-icon">🖐️</div>
          <div class="preview-text">Aguardando ativação do leitor...</div>
        </div>
        <div class="preview-status" id="reader-status">
          Conectando com leitor físico...
        </div>
        <div class="preview-progress" id="biometric-progress" style="width: 0%"></div>
        <div class="preview-quality" id="biometric-quality" style="display: none;">
          <span>Qualidade:</span>
          <div class="quality-indicators">
            <div class="quality-indicator"></div>
            <div class="quality-indicator"></div>
            <div class="quality-indicator"></div>
            <div class="quality-indicator"></div>
            <div class="quality-indicator"></div>
          </div>
        </div>
        <div class="preview-buttons">
          <button id="finger-confirm-btn" class="finger-btn" style="display: none;">
            🖐️ Dedo Posicionado - Iniciar Captura
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Atualiza status do leitor
   */
  updateStatus(message, type = 'info') {
    if (!this.previewElement) return;
    
    const statusElement = this.previewElement.querySelector('#reader-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `preview-status ${type}`;
    }
  }

  /**
   * Atualiza progresso
   */
  updateProgress(progress) {
    if (!this.previewElement) return;
    
    const progressElement = this.previewElement.querySelector('#biometric-progress');
    if (progressElement) {
      progressElement.style.width = `${progress}%`;
    }
  }

  /**
   * Atualiza qualidade
   */
  updateQuality(quality) {
    if (!this.previewElement) return;
    
    const qualityElement = this.previewElement.querySelector('#biometric-quality');
    if (qualityElement) {
      qualityElement.style.display = 'flex';
      
      const indicators = qualityElement.querySelectorAll('.quality-indicator');
      const activeCount = Math.min(5, Math.floor(quality / 20));
      
      indicators.forEach((indicator, index) => {
        indicator.className = 'quality-indicator';
        if (index < activeCount) {
          if (quality >= 80) {
            indicator.classList.add('good');
          } else if (quality >= 60) {
            indicator.classList.add('fair');
          } else {
            indicator.classList.add('poor');
          }
        }
      });
    }
  }

  /**
   * Callbacks
   */
  onSuccess(callback) {
    this.callbacks.onSuccess = callback;
  }

  onError(callback) {
    this.callbacks.onError = callback;
  }

  onProgress(callback) {
    this.callbacks.onProgress = callback;
  }

  /**
   * Limpa recursos
   */
  cleanup() {
    if (this.ws) {
      this.ws.close();
    }
    this.realClientConnected = false;
    this.realReaderActive = false;
    this.isCapturing = false;
  }
}

// Exportar para uso global
window.BiometricCapturePhysical = BiometricCapturePhysical;

