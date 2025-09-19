const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do app
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Diálogos
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Biométrica
  captureBiometric: (data) => ipcRenderer.invoke('capture-biometric', data),
  checkReader: () => ipcRenderer.invoke('check-reader'),
  
  // Eventos
  on: (channel, callback) => {
    const validChannels = ['biometric-captured', 'reader-status'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// Log de inicialização
console.log('🔒 Preload script carregado - APIs seguras expostas');
