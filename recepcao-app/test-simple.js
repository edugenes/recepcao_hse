const { app, BrowserWindow } = require('electron');
const path = require('path');

console.log('🚀 Iniciando teste simples...');

let mainWindow;

function createWindow() {
    console.log('🖥️ Criando janela...');
    
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        title: 'Teste Simples - Sistema HSE',
        show: false
    });

    // Carregar HTML simples
    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        console.log('✅ Janela pronta, mostrando...');
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        console.log('🛑 Janela fechada');
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    console.log('🎯 App pronto!');
    createWindow();
});

app.on('window-all-closed', () => {
    console.log('🛑 Todas as janelas fechadas');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

console.log('📋 Script de teste carregado');
