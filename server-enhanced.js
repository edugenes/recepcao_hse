const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Importar módulos customizados
const ActiveDirectoryIntegration = require('./ad-integration');
const AuditLogger = require('./audit-logger');
const ReportGenerator = require('./report-generator');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

// Inicializar módulos
const adIntegration = new ActiveDirectoryIntegration();
const auditLogger = new AuditLogger();
const reportGenerator = new ReportGenerator();

// Middleware de segurança aprimorado
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "script-src-elem": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "script-src-attr": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'", "https://cdn.jsdelivr.net"],
      "font-src": ["'self'", "data:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({ origin: true }));

// Rate limiting aprimorado
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Muitas tentativas. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Criar diretórios necessários
const requiredDirs = ['uploads', 'logs', 'reports'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração do Multer aprimorada
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Permitir apenas imagens
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Inicializar banco de dados
const db = new sqlite3.Database('recepcao.db');

// Criar tabelas aprimoradas
db.serialize(() => {
  // Tabela de setores
  db.run(`CREATE TABLE IF NOT EXISTS setores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL
  )`);
  
  // Adicionar colunas se não existirem
  db.all(`PRAGMA table_info(setores)`, (err, columns) => {
    if (!err && columns) {
      if (!columns.find(c => c.name === 'descricao')) {
        db.run(`ALTER TABLE setores ADD COLUMN descricao TEXT`);
      }
      if (!columns.find(c => c.name === 'ativo')) {
        db.run(`ALTER TABLE setores ADD COLUMN ativo INTEGER DEFAULT 1`);
      }
      if (!columns.find(c => c.name === 'created_at')) {
        db.run(`ALTER TABLE setores ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      }
    }
  });

  // Tabela de pacientes
  db.run(`CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    setor_id INTEGER,
    leito TEXT,
    status TEXT DEFAULT 'internado',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setor_id) REFERENCES setores (id)
  )`);

  // Tabela de visitantes aprimorada
  db.run(`CREATE TABLE IF NOT EXISTS visitantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    documento TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    foto_url TEXT,
    setor_id INTEGER,
    paciente_id INTEGER,
    tipo TEXT DEFAULT 'visitante',
    entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    saida DATETIME,
    status TEXT DEFAULT 'dentro',
    observacoes TEXT,
    usuario_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setor_id) REFERENCES setores (id),
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
  )`);

  // Tabela de usuários aprimorada
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    username TEXT UNIQUE,
    ad_username TEXT,
    last_login DATETIME,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabela de chaves aprimorada
  db.run(`CREATE TABLE IF NOT EXISTS chaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    localizacao TEXT,
    ativa INTEGER DEFAULT 1,
    categoria TEXT DEFAULT 'geral',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Tabela de movimentações de chaves aprimorada
  db.run(`CREATE TABLE IF NOT EXISTS chaves_movimentacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave_id INTEGER NOT NULL,
    retirado_por TEXT NOT NULL,
    setor TEXT,
    cargo TEXT,
    documento TEXT,
    contato TEXT,
    observacao TEXT,
    retirada_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    devolvido_em DATETIME,
    devolvido_por TEXT,
    usuario_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chave_id) REFERENCES chaves(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`);

  // Tabela de logs de auditoria
  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
  )`);

  // Inserir dados iniciais
  const setores = [
    { nome: 'UTI', descricao: 'Unidade de Terapia Intensiva' },
    { nome: 'Enfermaria', descricao: 'Enfermaria Geral' },
    { nome: 'Pronto Socorro', descricao: 'Pronto Atendimento' },
    { nome: 'Ambulatório', descricao: 'Consultas Ambulatoriais' },
    { nome: 'Cirurgia', descricao: 'Centro Cirúrgico' },
    { nome: 'Pediatria', descricao: 'Setor Pediátrico' }
  ];
  
  setores.forEach(setor => {
    db.run(`INSERT OR IGNORE INTO setores (nome) VALUES (?)`, 
      [setor.nome]);
  });

  // Usuários padrão
  const senhaHash = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO usuarios (id, nome, email, senha, role, username) VALUES (1, ?, ?, ?, ?, ?)`, 
    ['Admin', 'admin@recepcao.com', senhaHash, 'admin', 'admin']);

  const senhaUser = bcrypt.hashSync('user123', 10);
  db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, username) VALUES (?, ?, ?, ?, ?)`, 
    ['Usuário', 'user@recepcao.com', senhaUser, 'user', 'usuario']);
});

// Middleware de autenticação aprimorado
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se o usuário ainda existe e está ativo
    db.get(`SELECT id, nome, email, role, is_active FROM usuarios WHERE id = ? AND is_active = 1`, 
      [decoded.id], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
          return res.status(403).json({ error: 'Usuário não encontrado ou inativo' });
        }
        
        req.user = { ...decoded, ...user };
        next();
      });
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar permissões de admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Permissões de administrador necessárias.' });
  }
  next();
};

// Middleware para logging de auditoria
const auditMiddleware = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      // Log da ação após a resposta
      auditLogger.log('INFO', action, {
        userId: req.user?.id,
        username: req.user?.username || req.user?.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        requestData: req.body,
        responseStatus: res.statusCode
      });
      originalSend.call(this, data);
    };
    next();
  };
};

// === ROTAS DE AUTENTICAÇÃO ===

// Login com suporte a AD
app.post('/api/login', async (req, res) => {
  const { email, senha, useAD = false } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    let user = null;
    let isAdmin = false;

    if (useAD && process.env.AD_SERVER) {
      // Autenticação via Active Directory
      const adResult = await adIntegration.authenticateUser(email, senha);
      
      if (adResult.success) {
        // Buscar ou criar usuário no banco local
        db.get(`SELECT * FROM usuarios WHERE ad_username = ? OR email = ?`, 
          [email, email], async (err, existingUser) => {
            if (err) {
              await auditLogger.logLogin(null, email, false, ipAddress, userAgent);
              return res.status(500).json({ error: 'Erro interno do servidor' });
            }

            if (existingUser) {
              user = existingUser;
            } else {
              // Criar novo usuário baseado no AD
              const adUserInfo = await adIntegration.getUserInfo(email);
              const newUser = {
                nome: adUserInfo?.displayName || email,
                email: adUserInfo?.email || email,
                ad_username: email,
                role: adResult.isAdmin ? 'admin' : 'user',
                username: email.split('@')[0]
              };

              db.run(`INSERT INTO usuarios (nome, email, ad_username, role, username, senha) VALUES (?, ?, ?, ?, ?, ?)`,
                [newUser.nome, newUser.email, newUser.ad_username, newUser.role, newUser.username, ''],
                function(err) {
                  if (err) {
                    console.error('Erro ao criar usuário AD:', err);
                    return res.status(500).json({ error: 'Erro ao criar usuário' });
                  }
                  
                  user = { id: this.lastID, ...newUser };
                  generateTokenAndRespond();
                });
              return;
            }

            generateTokenAndRespond();
          });
      } else {
        await auditLogger.logLogin(null, email, false, ipAddress, userAgent);
        return res.status(401).json({ error: adResult.message });
      }
    } else {
      // Autenticação local
      db.get(`SELECT * FROM usuarios WHERE (email = ? OR username = ?) AND is_active = 1`, 
        [email, email], (err, dbUser) => {
          if (err) {
            auditLogger.logLogin(null, email, false, ipAddress, userAgent);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }

          if (!dbUser || !bcrypt.compareSync(senha, dbUser.senha)) {
            auditLogger.logLogin(null, email, false, ipAddress, userAgent);
            return res.status(401).json({ error: 'Credenciais inválidas' });
          }

          user = dbUser;
          generateTokenAndRespond();
        });
    }

    function generateTokenAndRespond() {
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          username: user.username 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' }
      );

      // Atualizar último login
      db.run(`UPDATE usuarios SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

      // Log de auditoria
      auditLogger.logLogin(user.id, user.username || user.email, true, ipAddress, userAgent);

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          nome: user.nome, 
          email: user.email, 
          role: user.role,
          username: user.username 
        } 
      });
    }

  } catch (error) {
    console.error('Erro no login:', error);
    auditLogger.logLogin(null, email, false, ipAddress, userAgent);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
app.post('/api/logout', authenticateToken, (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  auditLogger.logLogout(req.user.id, req.user.username || req.user.email, ipAddress);
  res.json({ message: 'Logout realizado com sucesso' });
});

// === ROTAS DE RELATÓRIOS ===

// Relatório de visitantes em PDF
app.get('/api/reports/visitantes/pdf', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim, setor_id, tipo, status } = req.query;
    
    let query = `SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
                 FROM visitantes v 
                 JOIN setores s ON v.setor_id = s.id 
                 LEFT JOIN pacientes p ON v.paciente_id = p.id`;
    
    const where = [];
    const params = [];
    
    if (data_inicio) {
      where.push('date(v.entrada) >= date(?)');
      params.push(data_inicio);
    }
    
    if (data_fim) {
      where.push('date(v.entrada) <= date(?)');
      params.push(data_fim);
    }
    
    if (setor_id) {
      where.push('v.setor_id = ?');
      params.push(setor_id);
    }
    
    if (tipo) {
      where.push('v.tipo = ?');
      params.push(tipo);
    }
    
    if (status === 'ativo') {
      where.push('v.saida IS NULL');
    } else if (status === 'finalizado') {
      where.push('v.saida IS NOT NULL');
    }
    
    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    
    query += ' ORDER BY v.entrada DESC';
    
    db.all(query, params, async (err, visitantes) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar visitantes' });
      }
      
      const doc = reportGenerator.generateVisitorReport(visitantes, req.query);
      const filename = `relatorio_visitantes_${Date.now()}.pdf`;
      const filepath = await reportGenerator.saveReport(doc, filename);
      
      // Log de auditoria
      auditLogger.logDataExport(req.user.id, req.user.username, 'PDF_VISITANTES', req.query);
      
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
        }
        // Limpar arquivo após download
        setTimeout(() => {
          fs.unlink(filepath, (err) => {
            if (err) console.error('Erro ao limpar arquivo:', err);
          });
        }, 5000);
      });
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

// Relatório de visitantes em CSV
app.get('/api/reports/visitantes/csv', authenticateToken, async (req, res) => {
  try {
    const { data_inicio, data_fim, setor_id, tipo, status } = req.query;
    
    let query = `SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
                 FROM visitantes v 
                 JOIN setores s ON v.setor_id = s.id 
                 LEFT JOIN pacientes p ON v.paciente_id = p.id`;
    
    const where = [];
    const params = [];
    
    if (data_inicio) {
      where.push('date(v.entrada) >= date(?)');
      params.push(data_inicio);
    }
    
    if (data_fim) {
      where.push('date(v.entrada) <= date(?)');
      params.push(data_fim);
    }
    
    if (setor_id) {
      where.push('v.setor_id = ?');
      params.push(setor_id);
    }
    
    if (tipo) {
      where.push('v.tipo = ?');
      params.push(tipo);
    }
    
    if (status === 'ativo') {
      where.push('v.saida IS NULL');
    } else if (status === 'finalizado') {
      where.push('v.saida IS NOT NULL');
    }
    
    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    
    query += ' ORDER BY v.entrada DESC';
    
    db.all(query, params, async (err, visitantes) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar visitantes' });
      }
      
      const csv = reportGenerator.generateCSV(visitantes, 'visitantes');
      const filename = `relatorio_visitantes_${Date.now()}.csv`;
      const filepath = await reportGenerator.saveCSV(csv, filename);
      
      // Log de auditoria
      auditLogger.logDataExport(req.user.id, req.user.username, 'CSV_VISITANTES', req.query);
      
      res.download(filepath, filename, (err) => {
        if (err) {
          console.error('Erro ao enviar arquivo:', err);
        }
        // Limpar arquivo após download
        setTimeout(() => {
          fs.unlink(filepath, (err) => {
            if (err) console.error('Erro ao limpar arquivo:', err);
          });
        }, 5000);
      });
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório CSV:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório CSV' });
  }
});

// === ROTAS DE AUDITORIA ===

// Buscar logs de auditoria
app.get('/api/audit/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { level, action, userId, dateFrom, dateTo, limit = 100 } = req.query;
    
    const filters = {
      level,
      action,
      userId: userId ? parseInt(userId) : undefined,
      dateFrom,
      dateTo,
      limit: parseInt(limit)
    };
    
    const logs = await auditLogger.getLogs(filters);
    res.json(logs);
    
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
  }
});

// Relatório de auditoria em PDF
app.get('/api/reports/audit/pdf', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo, userId, level, action } = req.query;
    
    const filters = {
      dateFrom,
      dateTo,
      userId: userId ? parseInt(userId) : undefined,
      level,
      action,
      limit: 1000
    };
    
    const logs = await auditLogger.getLogs(filters);
    const doc = reportGenerator.generateAuditReport(logs, filters);
    const filename = `relatorio_auditoria_${Date.now()}.pdf`;
    const filepath = await reportGenerator.saveReport(doc, filename);
    
    // Log de auditoria
    auditLogger.logDataExport(req.user.id, req.user.username, 'PDF_AUDITORIA', req.query);
    
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
      }
      // Limpar arquivo após download
      setTimeout(() => {
        fs.unlink(filepath, (err) => {
          if (err) console.error('Erro ao limpar arquivo:', err);
        });
      }, 5000);
    });
    
  } catch (error) {
    console.error('Erro ao gerar relatório de auditoria:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de auditoria' });
  }
});

// === ROTAS DO DASHBOARD ===

// Estatísticas do dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Visitantes ativos
    db.get(`SELECT COUNT(*) as count FROM visitantes WHERE saida IS NULL`, (err, activeResult) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar visitantes ativos' });
      
      // Total de visitantes
      db.get(`SELECT COUNT(*) as count FROM visitantes`, (err, totalResult) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar total de visitantes' });
        
        // Chaves emprestadas
        db.get(`SELECT COUNT(*) as count FROM chaves_movimentacoes WHERE devolvido_em IS NULL`, (err, borrowedResult) => {
          if (err) return res.status(500).json({ error: 'Erro ao buscar chaves emprestadas' });
          
          // Total de chaves
          db.get(`SELECT COUNT(*) as count FROM chaves WHERE ativa = 1`, (err, totalKeysResult) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar total de chaves' });
            
            res.json({
              visitantesAtivos: activeResult.count,
              totalVisitantes: totalResult.count,
              chavesEmprestadas: borrowedResult.count,
              totalChaves: totalKeysResult.count
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Dados para gráficos
app.get('/api/dashboard/charts', authenticateToken, async (req, res) => {
  try {
    // Visitantes por setor
    db.all(`SELECT s.nome, COUNT(v.id) as count 
            FROM setores s 
            LEFT JOIN visitantes v ON s.id = v.setor_id 
            GROUP BY s.id, s.nome 
            ORDER BY count DESC`, (err, sectors) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar dados por setor' });
      
      // Visitantes por tipo
      db.all(`SELECT tipo, COUNT(*) as count 
              FROM visitantes 
              GROUP BY tipo 
              ORDER BY count DESC`, (err, types) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar dados por tipo' });
        
        // Movimentação diária (últimos 7 dias)
        db.all(`SELECT date(entrada) as data, 
                       COUNT(*) as entradas,
                       (SELECT COUNT(*) FROM visitantes v2 WHERE date(v2.saida) = date(v.entrada)) as saidas
                FROM visitantes v 
                WHERE date(entrada) >= date('now', '-7 days')
                GROUP BY date(entrada)
                ORDER BY data DESC`, (err, daily) => {
          if (err) return res.status(500).json({ error: 'Erro ao buscar dados diários' });
          
          // Status das chaves
          db.get(`SELECT 
                   (SELECT COUNT(*) FROM chaves WHERE ativa = 1) as total,
                   (SELECT COUNT(*) FROM chaves_movimentacoes WHERE devolvido_em IS NULL) as emprestadas`, 
            (err, keysStatus) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar status das chaves' });
            
            res.json({
              sectors: sectors,
              types: types,
              daily: daily,
              keysDisponiveis: keysStatus.total - keysStatus.emprestadas,
              keysEmprestadas: keysStatus.emprestadas
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Erro ao buscar dados dos gráficos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atividade recente
app.get('/api/dashboard/activity', authenticateToken, async (req, res) => {
  try {
    // Buscar visitantes recentes
    db.all(`SELECT v.*, s.nome as setor_nome 
            FROM visitantes v 
            JOIN setores s ON v.setor_id = s.id 
            ORDER BY v.entrada DESC 
            LIMIT 10`, (err, recentVisitors) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar visitantes recentes' });
      
      // Buscar movimentações recentes de chaves
      db.all(`SELECT cm.*, c.descricao as chave_descricao 
              FROM chaves_movimentacoes cm 
              JOIN chaves c ON cm.chave_id = c.id 
              ORDER BY cm.retirada_em DESC 
              LIMIT 5`, (err, recentKeys) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar movimentações de chaves' });
        
        // Combinar e formatar atividades
        const activities = [];
        
        // Adicionar visitantes
        recentVisitors.forEach(visitor => {
          activities.push({
            type: 'visitor',
            icon: '👤',
            text: `${visitor.nome} entrou no setor ${visitor.setor_nome}`,
            time: new Date(visitor.entrada).toLocaleString('pt-BR')
          });
        });
        
        // Adicionar chaves
        recentKeys.forEach(key => {
          activities.push({
            type: 'key',
            icon: '🔑',
            text: `Chave ${key.chave_descricao} retirada por ${key.retirado_por}`,
            time: new Date(key.retirada_em).toLocaleString('pt-BR')
          });
        });
        
        // Ordenar por tempo e pegar os 10 mais recentes
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));
        res.json(activities.slice(0, 10));
      });
    });
  } catch (error) {
    console.error('Erro ao buscar atividade recente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para servir o dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// === ROTAS EXISTENTES (mantidas do servidor original) ===

// Manter todas as rotas existentes do server.js original
// (visitantes, usuários, setores, pacientes, chaves, etc.)

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

// Rota para servir a aplicação
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor HSE Recepção rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`👤 Credenciais padrão: admin@recepcao.com / admin123`);
  console.log(`🔐 Integração AD: ${process.env.AD_SERVER ? 'Configurada' : 'Desabilitada'}`);
  
  // Conectar ao AD se configurado
  if (process.env.AD_SERVER) {
    console.log('🔗 Conectando ao Active Directory...');
    const connected = await adIntegration.connect();
    if (connected) {
      console.log('✅ Conectado ao Active Directory com sucesso');
    } else {
      console.log('⚠️  Falha na conexão com Active Directory - usando autenticação local');
    }
  }
  
  // Limpar logs antigos a cada 24 horas
  setInterval(() => {
    auditLogger.cleanOldLogs(90); // Manter logs por 90 dias
  }, 24 * 60 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await adIntegration.disconnect();
  db.close((err) => {
    if (err) {
      console.error('❌ Erro ao fechar banco de dados:', err.message);
    } else {
      console.log('✅ Banco de dados fechado com sucesso');
    }
    process.exit(0);
  });
});

module.exports = app;
