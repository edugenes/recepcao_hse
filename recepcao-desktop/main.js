const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const DigitalPersonaSDK = require('./sdk/digitalpersona');

// Manter referência global da janela
let mainWindow;
let serverProcess;
let digitalPersonaSDK;

// Função para criar a janela principal
function createWindow() {
  // Criar a janela do navegador
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Necessário para DigitalPersona
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Sistema de Recepção HSE v3.0 - Desktop App',
    show: false // Não mostrar até carregar
  });

  // Carregar a interface
  mainWindow.loadFile('renderer/index.html');

  // Mostrar janela quando pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Abrir DevTools em modo desenvolvimento
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Eventos da janela
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Iniciar servidor backend
  startBackendServer();
  
  // Inicializar SDK DigitalPersona
  initializeDigitalPersona();
}

// Função para iniciar o servidor backend
function startBackendServer() {
  console.log('🚀 Iniciando servidor backend...');
  
  // Iniciar servidor Node.js
  serverProcess = spawn('node', ['server/server.js'], {
    cwd: __dirname,
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`📡 Servidor: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`❌ Erro servidor: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`🔴 Servidor finalizado com código: ${code}`);
  });
}

// Função para parar o servidor
function stopBackendServer() {
  if (serverProcess) {
    console.log('🛑 Parando servidor backend...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// Função para inicializar SDK DigitalPersona
function initializeDigitalPersona() {
  try {
    console.log('🖐️ Inicializando SDK DigitalPersona...');
    digitalPersonaSDK = new DigitalPersonaSDK();
    console.log('✅ SDK DigitalPersona inicializado');
  } catch (error) {
    console.error('❌ Erro ao inicializar SDK DigitalPersona:', error);
  }
}

// Eventos do app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  stopBackendServer();
  if (digitalPersonaSDK) {
    await digitalPersonaSDK.terminate();
  }
});

// IPC Handlers para comunicação com renderer
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

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

// Handler para captura biométrica
ipcMain.handle('capture-biometric', async (event, data) => {
  try {
    console.log('🖐️ Iniciando captura biométrica...');
    
    if (!digitalPersonaSDK) {
      throw new Error('SDK DigitalPersona não inicializado');
    }
    
    const result = await digitalPersonaSDK.captureFingerprint();
    return result;
  } catch (error) {
    console.error('❌ Erro na captura biométrica:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// Handler para verificar leitor
ipcMain.handle('check-reader', async () => {
  try {
    console.log('🔍 Verificando leitor DigitalPersona...');
    
    if (!digitalPersonaSDK) {
      throw new Error('SDK DigitalPersona não inicializado');
    }
    
    const result = await digitalPersonaSDK.checkReader();
    return result;
  } catch (error) {
    console.error('❌ Erro ao verificar leitor:', error);
    return {
      success: false,
      detected: false,
      error: error.message
    };
  }
});

console.log('🎉 Sistema de Recepção HSE Desktop v3.0 iniciado!');
