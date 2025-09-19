const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do sistema
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Banco de dados
  databaseQuery: (query, params) => ipcRenderer.invoke('database-query', query, params),
  databaseRun: (query, params) => ipcRenderer.invoke('database-run', query, params),
  
  // Diálogos do sistema
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
});

// Log de inicialização
console.log('🔒 Preload script carregado - APIs seguras expostas');
