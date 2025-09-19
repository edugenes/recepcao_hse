const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Importar módulos do sistema
const DatabaseManager = require('./database/database');
const BiometricManager = require('./biometric/biometric');

// Variáveis globais
let mainWindow;
let databaseManager;
let biometricManager;

// Função para criar a janela principal
function createWindow() {
  console.log('🖥️ Criando janela principal...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    title: 'Sistema de Recepção HSE v4.0 - REAL DigitalPersona',
    show: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    autoHideMenuBar: true
  });

  // Carregar interface
  mainWindow.loadFile('client/index.html');

  // Mostrar janela quando pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Janela principal exibida');
    
    // Abrir DevTools em modo desenvolvimento
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Eventos da janela
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevenir fechamento acidental
  mainWindow.on('close', (event) => {
    event.preventDefault();
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Sim', 'Não'],
      defaultId: 1,
      title: 'Confirmar Saída',
      message: 'Deseja realmente sair do sistema?'
    }).then((result) => {
      if (result.response === 0) {
        cleanup().then(() => {
          app.quit();
        });
      }
    });
  });
}

// Função para inicializar o sistema
async function initializeSystem() {
  try {
    console.log('🚀 Inicializando Sistema de Recepção HSE v4.0 REAL...');
    
    // 1. Inicializar banco de dados
    console.log('📊 Inicializando banco de dados...');
    databaseManager = new DatabaseManager();
    await databaseManager.initialize();
    console.log('✅ Banco de dados inicializado');
    
    // 2. Inicializar sistema biométrico REAL
    console.log('🖐️ Inicializando sistema biométrico REAL...');
    biometricManager = new BiometricManager();
    await biometricManager.initialize();
    console.log('✅ Sistema biométrico REAL inicializado');
    
    console.log('🎉 Sistema REAL inicializado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema:', error);
    dialog.showErrorBox('Erro de Inicialização', 
      `Erro ao inicializar o sistema: ${error.message}`);
  }
}

// Função de limpeza
async function cleanup() {
  try {
    console.log('🧹 Limpando recursos...');
    
    if (biometricManager) {
      await biometricManager.cleanup();
    }
    
    if (databaseManager) {
      await databaseManager.close();
    }
    
    console.log('✅ Limpeza concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  }
}

// Eventos do app
app.whenReady().then(async () => {
  console.log('🎯 App pronto, inicializando...');
  
  // Inicializar sistema
  await initializeSystem();
  
  // Criar janela
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  console.log('🛑 Todas as janelas fechadas');
  await cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  console.log('🛑 Preparando para sair...');
  await cleanup();
});

// IPC Handlers - Comunicação com o cliente

// Informações do sistema
ipcMain.handle('get-system-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version
  };
});

// Banco de dados
ipcMain.handle('database-query', async (event, query, params = []) => {
  try {
    if (!databaseManager) {
      throw new Error('Banco de dados não inicializado');
    }
    return await databaseManager.query(query, params);
  } catch (error) {
    console.error('❌ Erro na query do banco:', error);
    throw error;
  }
});

ipcMain.handle('database-run', async (event, query, params = []) => {
  try {
    if (!databaseManager) {
      throw new Error('Banco de dados não inicializado');
    }
    return await databaseManager.runQuery(query, params);
  } catch (error) {
    console.error('❌ Erro na execução do banco:', error);
    throw error;
  }
});

// Sistema biométrico REAL
ipcMain.handle('biometric-check-reader', async () => {
  try {
    if (!biometricManager) {
      throw new Error('Sistema biométrico não inicializado');
    }
    return await biometricManager.checkReader();
  } catch (error) {
    console.error('❌ Erro ao verificar leitor:', error);
    throw error;
  }
});

ipcMain.handle('biometric-capture', async (event, options = {}) => {
  try {
    if (!biometricManager) {
      throw new Error('Sistema biométrico não inicializado');
    }
    return await biometricManager.captureFingerprint(options);
  } catch (error) {
    console.error('❌ Erro na captura biométrica:', error);
    throw error;
  }
});

// Diálogos do sistema
ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Log de inicialização
console.log('🎉 Sistema de Recepção HSE Windows REAL v4.0 carregado!');
