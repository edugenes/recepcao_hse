const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const DebugLogger = require('./debug-logger');

// Variáveis globais
let mainWindow;
let db;
let logger;

// Função para criar a janela principal
function createWindow() {
  if (logger) logger.info('🖥️ Criando janela principal...');
  console.log('🖥️ Criando janela principal...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    title: 'Sistema de Recepção HSE v1.0',
    show: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    autoHideMenuBar: true
  });

  // Carregar interface
  mainWindow.loadFile('index.html');

  // Mostrar janela quando pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (logger) logger.success('✅ Janela principal exibida');
    console.log('✅ Janela principal exibida');
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

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    if (logger) logger.info('📊 Inicializando banco de dados...');
    console.log('📊 Inicializando banco de dados...');
    
    const dbPath = path.join(__dirname, 'recepcao.db');
    
    // Conectar ao banco
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        if (logger) logger.error('❌ Erro ao conectar com banco:', err);
        console.error('❌ Erro ao conectar com banco:', err);
        throw err;
      }
      if (logger) logger.success('✅ Conectado ao banco SQLite');
      console.log('✅ Conectado ao banco SQLite');
    });

    // Criar tabelas
    await createTables();
    
    // Inserir dados iniciais
    await insertInitialData();
    
    console.log('✅ Banco de dados inicializado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    throw error;
  }
}

// Função para criar tabelas
async function createTables() {
  const tables = [
    // Tabela de visitantes
    `CREATE TABLE IF NOT EXISTS visitantes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT,
        setor TEXT NOT NULL,
        paciente TEXT NOT NULL,
        data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_saida DATETIME,
        status TEXT DEFAULT 'ativo'
    )`,
    
    // Tabela de setores
    `CREATE TABLE IF NOT EXISTS setores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL,
        descricao TEXT,
        ativo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const table of tables) {
    await runQuery(table);
  }
  
  console.log('✅ Tabelas criadas com sucesso');
}

// Função para inserir dados iniciais
async function insertInitialData() {
  try {
    // Inserir setores padrão
    const setores = [
      'UTI', 'Emergência', 'Cirurgia', 'Cardiologia', 
      'Neurologia', 'Pediatria', 'Oncologia', 'Outros'
    ];
    
    for (const setor of setores) {
      await runQuery(
        'INSERT OR IGNORE INTO setores (nome) VALUES (?)',
        [setor]
      );
    }

    console.log('✅ Dados iniciais inseridos');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados iniciais:', error);
  }
}

// Função para executar queries
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Banco de dados não inicializado'));
      return;
    }

    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Função para executar queries de seleção
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Banco de dados não inicializado'));
      return;
    }

    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Função de limpeza
async function cleanup() {
  try {
    console.log('🧹 Limpando recursos...');
    
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar banco:', err);
        } else {
          console.log('✅ Banco de dados fechado');
        }
      });
    }
    
    console.log('✅ Limpeza concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  }
}

// Eventos do app
app.whenReady().then(async () => {
  // Inicializar logger
  logger = new DebugLogger();
  logger.info('🎯 App pronto, inicializando...');
  console.log('🎯 App pronto, inicializando...');
  
  try {
    // Inicializar banco de dados
    await initializeDatabase();
    
    // Criar janela
    createWindow();
    
    logger.success('🎉 Sistema inicializado com sucesso!');
    console.log('🎉 Sistema inicializado com sucesso!');
    
  } catch (error) {
    logger.error('❌ Erro ao inicializar sistema:', error);
    console.error('❌ Erro ao inicializar sistema:', error);
    dialog.showErrorBox('Erro de Inicialização', 
      `Erro ao inicializar o sistema: ${error.message}`);
  }

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
ipcMain.handle('database-query', async (event, queryText, params = []) => {
  try {
    if (!db) {
      throw new Error('Banco de dados não inicializado');
    }
    return await query(queryText, params);
  } catch (error) {
    console.error('❌ Erro na query do banco:', error);
    throw error;
  }
});

ipcMain.handle('database-run', async (event, queryText, params = []) => {
  try {
    if (!db) {
      throw new Error('Banco de dados não inicializado');
    }
    return await runQuery(queryText, params);
  } catch (error) {
    console.error('❌ Erro na execução do banco:', error);
    throw error;
  }
});

// Diálogos do sistema
ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Log de inicialização
console.log('🎉 Sistema de Recepção HSE v1.0 carregado!');
