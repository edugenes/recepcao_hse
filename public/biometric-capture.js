/**
 * Módulo de Captura Biométrica - DigitalPersona 4500
 * Versão 2.1 - Sistema de Recepção HSE com Visualização em Tempo Real
 */

class BiometricCapture {
  constructor() {
    this.isSupported = false;
    this.device = null;
    this.template = null;
    this.isCapturing = false;
    this.previewElement = null;
    this.callbacks = {
      onSuccess: null,
      onError: null,
      onProgress: null
    };
  }

  /**
   * Verifica se o dispositivo biométrico está disponível
   */
  async checkDeviceSupport() {
    try {
      // Verificar se o navegador suporta WebRTC
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC não suportado neste navegador');
      }

      // Verificar se há dispositivos de vídeo (webcam pode ser usada como fallback)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('Nenhum dispositivo de captura encontrado');
      }

      this.isSupported = true;
      return true;
    } catch (error) {
      console.error('Erro ao verificar suporte biométrico:', error);
      this.isSupported = false;
      return false;
    }
  }

  /**
   * Inicializa a captura biométrica com preview
   */
  async initializeCapture(previewElementId = 'biometric-preview') {
    try {
      // Configurar elemento de preview
      this.previewElement = document.getElementById(previewElementId);
      if (!this.previewElement) {
        throw new Error('Elemento de preview não encontrado');
      }

      // Configurar preview do leitor de digital (simulação)
      this.setupFingerprintReaderPreview();
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar captura:', error);
      throw error;
    }
  }

  /**
   * Configura o preview do leitor de digital (simulação)
   */
  setupFingerprintReaderPreview() {
    if (this.previewElement) {
      // Limpar preview anterior
      this.previewElement.innerHTML = '';
      
      // Criar container do leitor
      const readerContainer = document.createElement('div');
      readerContainer.style.cssText = `
        width: 100%;
        height: 200px;
        background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 2px solid #4b5563;
      `;
      
      // Adicionar título do leitor
      const readerTitle = document.createElement('div');
      readerTitle.style.cssText = `
        color: #e5e7eb;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 15px;
        text-align: center;
      `;
      readerTitle.innerHTML = '🔒 DigitalPersona 4500<br><span style="font-size: 10px; color: #9ca3af;">Leitor Biométrico</span>';
      readerContainer.appendChild(readerTitle);
      
      // Adicionar área de captura (simulação)
      const captureArea = document.createElement('div');
      captureArea.style.cssText = `
        width: 120px;
        height: 120px;
        border: 3px solid #3b82f6;
        border-radius: 50%;
        background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pulse 2s infinite;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
      `;
      
      // Adicionar ícone de dedo
      const fingerIcon = document.createElement('div');
      fingerIcon.style.cssText = `
        font-size: 2rem;
        color: #e5e7eb;
        animation: bounce 1.5s infinite;
      `;
      fingerIcon.innerHTML = '🖐️';
      captureArea.appendChild(fingerIcon);
      
      readerContainer.appendChild(captureArea);
      
      // Adicionar indicador de status
      const statusIndicator = document.createElement('div');
      statusIndicator.id = 'reader-status';
      statusIndicator.style.cssText = `
        margin-top: 15px;
        color: #10b981;
        font-size: 12px;
        font-weight: 500;
        text-align: center;
      `;
      statusIndicator.innerHTML = 'Aguardando posicionamento do dedo...';
      readerContainer.appendChild(statusIndicator);
      
      // Adicionar linhas de varredura (simulação)
      const scanLines = document.createElement('div');
      scanLines.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        overflow: hidden;
      `;
      
      for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.style.cssText = `
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
          top: ${20 + i * 20}%;
          animation: scan 3s infinite;
          animation-delay: ${i * 0.5}s;
        `;
        scanLines.appendChild(line);
      }
      
      readerContainer.appendChild(scanLines);
      this.previewElement.appendChild(readerContainer);
      
      // Adicionar CSS para animações
      if (!document.getElementById('biometric-animations')) {
        const style = document.createElement('style');
        style.id = 'biometric-animations';
        style.textContent = `
          @keyframes pulse {
            0% { 
              border-color: #3b82f6; 
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
            }
            50% { 
              border-color: #10b981; 
              background: linear-gradient(135deg, #059669 0%, #10b981 100%);
              box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
            }
            100% { 
              border-color: #3b82f6; 
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
            }
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes scan {
            0% { transform: translateX(-100%); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(100%); opacity: 0; }
          }
          @keyframes capture-flash {
            0% { background: rgba(255, 255, 255, 0); }
            50% { background: rgba(255, 255, 255, 0.8); }
            100% { background: rgba(255, 255, 255, 0); }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Captura a impressão digital com visualização
   */
  async captureFingerprint() {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.isCapturing) {
          reject(new Error('Captura já em andamento'));
          return;
        }

        this.isCapturing = true;
        
        // Mostrar feedback visual de captura
        this.showCaptureFeedback();
        
        // Simular captura biométrica com progresso visual
        const captureResult = await this.simulateBiometricCaptureWithProgress();
        
        if (captureResult.success) {
          this.template = captureResult.template;
          this.showSuccessFeedback();
          resolve({
            success: true,
            template: captureResult.template,
            quality: captureResult.quality,
            message: 'Captura realizada com sucesso'
          });
        } else {
          this.showErrorFeedback(captureResult.error);
          reject(new Error(captureResult.error));
        }
      } catch (error) {
        this.showErrorFeedback(error.message);
        reject(error);
      } finally {
        this.isCapturing = false;
      }
    });
  }

  /**
   * Mostra feedback visual durante captura
   */
  showCaptureFeedback() {
    if (this.previewElement) {
      const statusIndicator = this.previewElement.querySelector('#reader-status');
      if (statusIndicator) {
        statusIndicator.innerHTML = '📸 Capturando impressão digital...';
        statusIndicator.style.color = '#3b82f6';
      }
      
      // Adicionar efeito de flash
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.8);
        z-index: 15;
        animation: capture-flash 0.5s ease-out;
        pointer-events: none;
      `;
      this.previewElement.appendChild(flash);
      
      // Remover flash após animação
      setTimeout(() => {
        if (flash.parentNode) {
          flash.parentNode.removeChild(flash);
        }
      }, 500);
    }
  }

  /**
   * Mostra feedback de sucesso
   */
  showSuccessFeedback() {
    if (this.previewElement) {
      const statusIndicator = this.previewElement.querySelector('#reader-status');
      if (statusIndicator) {
        statusIndicator.innerHTML = '✅ Captura realizada com sucesso!';
        statusIndicator.style.color = '#10b981';
      }
    }
  }

  /**
   * Mostra feedback de erro
   */
  showErrorFeedback(error) {
    if (this.previewElement) {
      const statusIndicator = this.previewElement.querySelector('#reader-status');
      if (statusIndicator) {
        statusIndicator.innerHTML = `❌ Erro: ${error}`;
        statusIndicator.style.color = '#ef4444';
      }
    }
  }

  /**
   * Simula captura biométrica com progresso visual
   */
  async simulateBiometricCaptureWithProgress() {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        
        // Atualizar progresso visual
        if (this.previewElement) {
          const statusIndicator = this.previewElement.querySelector('#reader-status');
          if (statusIndicator) {
            statusIndicator.innerHTML = `📸 Capturando... ${progress}%`;
            statusIndicator.style.color = '#3b82f6';
          }
        }
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Gerar template simulado
          const template = this.generateMockTemplate();
          
          resolve({
            success: true,
            template: template,
            quality: Math.random() * 100,
            timestamp: new Date().toISOString()
          });
        }
      }, 200); // Atualizar a cada 200ms
    });
  }

  /**
   * Gera template biométrico simulado
   */
  generateMockTemplate() {
    // Em produção, este seria o template real do DigitalPersona
    const template = {
      id: 'template_' + Date.now(),
      data: this.generateRandomTemplateData(),
      format: 'ISO19794-2',
      quality: Math.floor(Math.random() * 100),
      timestamp: new Date().toISOString()
    };
    
    return template;
  }

  /**
   * Gera dados aleatórios para template (simulação)
   */
  generateRandomTemplateData() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 1024; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Verifica se um template já existe (evitar duplicatas)
   */
  async verifyTemplateExists(template) {
    try {
      // Em produção, verificar no banco de dados
      const response = await fetch('/api/biometric/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ template: template.data })
      });

      const result = await response.json();
      return result.exists;
    } catch (error) {
      console.error('Erro ao verificar template:', error);
      return false;
    }
  }

  /**
   * Salva template no banco de dados
   */
  async saveTemplate(visitanteId, template) {
    try {
      const response = await fetch('/api/biometric/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          visitante_id: visitanteId,
          template: template.data,
          quality: template.quality,
          format: template.format
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      return false;
    }
  }

  /**
   * Limpa recursos
   */
  cleanup() {
    if (this.device) {
      this.device.getTracks().forEach(track => track.stop());
      this.device = null;
    }
    if (this.previewElement) {
      // Restaurar placeholder
      this.previewElement.innerHTML = `
        <div class="preview-placeholder">
          <div class="preview-icon">📷</div>
          <div class="preview-text">Clique em "Capturar Digital" para iniciar</div>
        </div>
      `;
    }
    this.isCapturing = false;
    this.template = null;
  }

  /**
   * Configura callbacks
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
}

// Exportar para uso global
window.BiometricCapture = BiometricCapture;