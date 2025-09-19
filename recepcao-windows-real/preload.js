const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do sistema
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Banco de dados
  databaseQuery: (query, params) => ipcRenderer.invoke('database-query', query, params),
  databaseRun: (query, params) => ipcRenderer.invoke('database-run', query, params),
  
  // Sistema biométrico REAL
  biometricCheckReader: () => ipcRenderer.invoke('biometric-check-reader'),
  biometricCapture: (options) => ipcRenderer.invoke('biometric-capture', options),
  
  // Diálogos do sistema
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options)
});

// Log de inicialização
console.log('🔒 Preload script carregado - APIs seguras expostas');
