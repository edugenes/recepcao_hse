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
const os = require('os');

const safeParse = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
};

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

const WEAK_SECRETS = ['change_me_in_env', 'altere_este_valor_em_producao', '', undefined];
const JWT_SECRET = process.env.JWT_SECRET;
if (WEAK_SECRETS.includes(JWT_SECRET)) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[ERRO CRÍTICO] JWT_SECRET não configurado. Defina JWT_SECRET no arquivo .env antes de iniciar em produção.');
    process.exit(1);
  } else {
    console.warn('[AVISO] JWT_SECRET não configurado corretamente. Defina um valor seguro no arquivo .env antes de ir para produção.');
  }
}
const JWT_SECRET_VALUE = JWT_SECRET || 'dev_only_secret_change_in_env';

// Middleware - Helmet desabilitado para evitar problemas com HTTPS
// Adicionar headers básicos manualmente
app.use((req, res, next) => {
  // PREVENIR UPGRADE PARA HTTPS - CRÍTICO
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Upgrade-Insecure-Requests');
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  
  // CSP que PERMITE HTTP (sem upgrade-insecure-requests)
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  res.header('Content-Security-Policy', 
    `script-src 'self' 'unsafe-inline' http://cdn.jsdelivr.net https://cdn.jsdelivr.net ${protocol}://${host}; ` +
    `style-src 'self' 'unsafe-inline' http://cdn.jsdelivr.net https://cdn.jsdelivr.net; ` +
    `img-src 'self' data: http: https:; ` +
    `connect-src 'self' ${protocol}://${host} http: https:; ` +
    `font-src 'self' data: http: https:; ` +
    `default-src 'self' ${protocol}://${host} http: https:;`
  );
  
  next();
});
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true;
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Criar diretório uploads se não existir
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '-' + safeName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas'));
    }
    cb(null, true);
  }
});

// Inicializar banco de dados
const DB_PATH = path.join(__dirname, 'recepcao.db');
const db = new sqlite3.Database(DB_PATH);

// Criar tabelas
db.serialize(() => {
  // Tabela de setores
  db.run(`CREATE TABLE IF NOT EXISTS setores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    tipo TEXT DEFAULT 'Outro',
    observacoes TEXT
  )`);

  // Evitar duplicações futuras de nomes de setores
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_setores_nome ON setores(nome)`, (err) => {
    // Ignorar erro caso já existam duplicidades; a API retorna nomes únicos
    // e o índice será criado assim que o banco estiver limpo.
  });

  // Tabela de pacientes
  db.run(`CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    setor_id INTEGER,
    FOREIGN KEY (setor_id) REFERENCES setores (id)
  )`);

  // Tabela de visitantes
  db.run(`CREATE TABLE IF NOT EXISTS visitantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    documento TEXT NOT NULL,
    telefone TEXT,
    foto_url TEXT,
    setor_id INTEGER,
    paciente_id INTEGER,
    tipo TEXT DEFAULT 'visitante',
    entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
    saida DATETIME,
    FOREIGN KEY (setor_id) REFERENCES setores (id),
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
  )`);

  // Garantir existência das colunas na tabela visitantes (para bases antigas)
  db.all(`PRAGMA table_info(visitantes)`, (err, columns) => {
    if (!err && columns) {
      if (!columns.find(c => c.name === 'tipo')) {
        db.run(`ALTER TABLE visitantes ADD COLUMN tipo TEXT DEFAULT 'visitante'`);
      }

      if (!columns.find(c => c.name === 'status')) {
        db.run(`ALTER TABLE visitantes ADD COLUMN status TEXT DEFAULT 'dentro'`);
      }
      if (!columns.find(c => c.name === 'usuario_id')) {
        db.run(`ALTER TABLE visitantes ADD COLUMN usuario_id INTEGER`);
      }
    }
  });

  // Garantir colunas novas em setores para hotelaria
  db.all(`PRAGMA table_info(setores)`, (err, columns) => {
    if (!err && columns) {
      if (!columns.find(c => c.name === 'status')) {
        db.run(`ALTER TABLE setores ADD COLUMN status TEXT DEFAULT 'ativo'`);
      }
      if (!columns.find(c => c.name === 'tipo')) {
        db.run(`ALTER TABLE setores ADD COLUMN tipo TEXT DEFAULT 'Outro'`);
      }
      if (!columns.find(c => c.name === 'observacoes')) {
        db.run(`ALTER TABLE setores ADD COLUMN observacoes TEXT`);
      }
    }
    // Normalizar status/tipo para setores já existentes
    db.run(`UPDATE setores SET status = 'ativo' WHERE status IS NULL OR TRIM(status) = ''`);
    db.run(`UPDATE setores SET tipo = COALESCE(NULLIF(TRIM(tipo), ''), 'Outro')`);
  });


  // Inserir setores padrão apenas se a tabela estiver vazia (não apagar dados existentes)
  db.get('SELECT COUNT(*) as total FROM setores', (err, row) => {
    if (err) {
      console.error('Erro ao contar setores:', err.message);
      return;
    }
    if (row && row.total === 0) {
      const setores = [
        'Assessoria de Ensino e Pesquisa do HSE (HSE-AEPH)',
        'Assessoria de Pessoas/Recursos Humanos (APES-RH)',
        'Assessoria de Relações Institucionais do HSE (HSE-ARIH)',
        'ASSESSORIA GERAL (HSE AGHSE)',
        'Centro de Reabilitação Funcional e Cognitiva (HSE-CRFC)',
        'CLÍNICA VASCULAR CIRÚRGICA E AMBULATORIAL (HSE-CVAS)',
        'Comissão de Compra Direta (HSE-CCD)',
        'Diretoria do Hospital do Servidor (HSE-DHSE)',
        'Gerência Administrativa e Financeira do HSE (HSE-GAFH)',
        'Gerência de Engenharia e Manutenção do HSE (HSE-GEMH)',
        'Gestão de Materiais Especiais e de Alto Custo (HSE-GMEAC)',
        'Gestão de Material Médico Hospitalar (HSE-GMMH)',
        'Gerência Técnica de Enfermagem do HSE (HSE-GTENFH)',
        'Núcleo de Análises Clinicas (HSE-NACL)',
        'Núcleo de Assistência Domiciliar (HSE-NAD)',
        'Núcleo de Farmácia (HSE-NAFA)',
        'Núcleo de Agência Transfusional (HSE-NAGTR)',
        'Núcleo de Limpeza e Conservação (HSE-NALC)',
        'Núcleo de Apoio de Almoxarifado (HSE-NALM)',
        'Núcleo de Nutrição (HSE-NANU)',
        'Núcleo de Apoio aos Serviços de Terceiros (HSE-NAST)',
        'Núcleo de Transporte (HSE-NATR)',
        'Núcleo de Bloco Cirúrgico (HSE-NBC)',
        'Núcleo de Clínica Médica (HSE-NCMED)',
        'NÚCLEO DE CLINICA MÉDICA GERIATRICA (HSE-NCMGER)',
        'Núcleo de Compras (HSE-NCOMP)',
        'Núcleo de Enfermagem do Ambulatório (HSE-NEAMB)',
        'Núcleo de Enfermagem do Bloco Cirúrgico e CME (HSE-NEBC)',
        'Núcleo de Enfermagem da Clinica Cirúrgica (HSE - NECC)',
        'Núcleo de Enfermagem do CEMPRE (HSE NECEMPRE)',
        'Núcleo de Enfermagem de Clinica Médica (HSE-NECM)',
        'Núcleo de Enfermagem da Clinica Vascular (HSE-NECV)',
        'Núcleo de Enfermagem da Emergência (HSE-NEEME)',
        'Núcleo de Enfermagem aos Meios de Diagnósticos (HSE NEMD)',
        'Núcleo de Engenharia Clinica (HSE-NENGCL)',
        'Núcleo de Enfermagem de Oncologia (HSE-NEONCO)',
        'Núcleo de Epidemiologia (HSE-NEPI)',
        'Núcleo de Enfermagem de Quimioterapia (HSE-NEQUIM)',
        'Núcleo de Enfermagem da UTI 1 Pós Operatória (HSE-NEUTI1)',
        'Núcleo de Enfermagem de UTI 2 3 (HSE NEUTI23)',
        'Núcleo de Faturamento e Custos (HSE-NFATC)',
        'Núcleo de Gestão de Acesso (HSE-NGA)',
        'Núcleo de Hotelaria (HSE-NHOTE)',
        'Núcleo de Oncologia (HSE-NONC)',
        'Núcleo de Patrimônio (HSE-NPAT)',
        'Núcleo de Planejamento e Gestão Financeira (HSE-NPGF)',
        'Núcleo de Psicologia (HSE-NPSIC)',
        'Núcleo de Rouparia (HSE-NROU)',
        'Núcleo de Serviço de Imagem (HSE-NSIMG)',
        'Núcleo de Serviço de Imagem de Tomografia Computadoriza (HSE-NSITC)',
        'Núcleo de Serviço Social (HSE-NSSOC)',
        'Núcleo de Tecnologia da Informação (HSE-NTI)',
        'Núcleo de Adesão (HSE-NUAD)',
        'Núcleo de Contratos (HSE-NUCON)',
        'Núcleo de Fase Preparatória (HSE-NUFAP)',
        'Núcleo de UTI 1 Pós Operatória (HSE-NUTI1)',
        'Núcleo de UTI 23 (HSE-NUTI23)',
        'Núcleo de UTI 2 e 3 (HSE-NUTI23)',
        'Núcleo de Servido de Arquivo Médico (HSE-SAME)',
        'Serviço de Controle de Infecção Hospitalar (HSE-SCIH)',
        'Superintendencia Médica do HSE (HSE-SMED)',
        'Superintendência Multiprofissional do HSE (HSE-SMPH)',
        'Setor de Saúde Ocupacional (HSE-SSO)',
        'Superintendência de Compras Publicas (HSE-SUCOP)',
        'Superintendente da Saúde Funcional e Cognitiva (HSE-SUP-CRFC)',
        'Unidade de Apoio Assistencial - 2 (HSE-UAA)',
        'Unidade de Apoio Administrativo (HSE-UAAD)',
        'Unidade de Apoio Ambulatorial (HSE-UAAM)',
        'Unidade de Apoio Assistencial I (HSE-UAAS)',
        'Unidade de Assistência Clínica (HSE-UACL)',
        'Unidade de Assistência Cirúrgica (HSE-UACR)',
        'Unidade de Pronto Atendimento (HSE-UPA)',
        'Unidade de Pacientes Externos (HSE-UPE)',
        'Unidade de Pacientes Internos (HSE - UPI)',
        'Unidade de Qualidade e Segurança do Paciente (HSE-UQSP)'
      ];

      setores.forEach(nome => {
        db.run(`INSERT OR IGNORE INTO setores (nome) VALUES (?)`, [nome]);
      });
    }
  });

  // Tabela de usuários
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    username TEXT UNIQUE
  )`);

  // Garantir colunas existentes
  db.all(`PRAGMA table_info(usuarios)`, (err, columns) => {
    if (!err && columns) {
      if (!columns.find(c => c.name === 'role')) {
        db.run(`ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'user'`);
      }
      if (!columns.find(c => c.name === 'username')) {
        db.run(`ALTER TABLE usuarios ADD COLUMN username TEXT UNIQUE`);
      }
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@recepcao.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const senhaHash = bcrypt.hashSync(adminPassword, 10);
    db.run(`INSERT OR IGNORE INTO usuarios (id, nome, email, senha, role, username) VALUES (1, ?, ?, ?, ?, ?)`,
      ['Admin', adminEmail, senhaHash, 'admin', 'admin']);
    db.run(`UPDATE usuarios SET role = 'admin', username = 'admin' WHERE (email = ? OR id = 1)`, [adminEmail]);
  });
});

// === Chaves: Tabelas ===
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS chaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    localizacao TEXT,
    ativa INTEGER DEFAULT 1
  )`);

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
    FOREIGN KEY (chave_id) REFERENCES chaves(id)
  )`);
  // Garantir colunas novas em bases existentes
  db.all(`PRAGMA table_info(chaves_movimentacoes)`, (err, cols) => {
    if (!err && cols) {
      if (!cols.find(c => c.name === 'setor')) {
        db.run(`ALTER TABLE chaves_movimentacoes ADD COLUMN setor TEXT`);
      }
      if (!cols.find(c => c.name === 'cargo')) {
        db.run(`ALTER TABLE chaves_movimentacoes ADD COLUMN cargo TEXT`);
      }
    }
  });

  // Tabela de enfermarias (Hotelaria)
  db.run(`CREATE TABLE IF NOT EXISTS enfermarias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    FOREIGN KEY (setor_id) REFERENCES setores(id)
  )`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_enfermarias_setor ON enfermarias(setor_id)`);

  // Tabela de leitos (Hotelaria)
  db.run(`CREATE TABLE IF NOT EXISTS leitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_id INTEGER,
    enfermaria_id INTEGER,
    identificacao TEXT NOT NULL,
    status TEXT DEFAULT 'ativo',
    FOREIGN KEY (setor_id) REFERENCES setores(id),
    FOREIGN KEY (enfermaria_id) REFERENCES enfermarias(id)
  )`, (err) => {
    if (err) {
      console.error('Erro ao criar tabela leitos:', err);
      return;
    }
    
    // Garantir coluna enfermaria_id em bases antigas (executado após criação da tabela)
    db.all(`PRAGMA table_info(leitos)`, (err2, cols) => {
      if (err2) {
        console.error('Erro ao verificar colunas da tabela leitos:', err2);
        return;
      }
      
      const hasEnfermariaId = cols && cols.find(c => c.name === 'enfermaria_id');
      
      if (!hasEnfermariaId) {
        db.run(`ALTER TABLE leitos ADD COLUMN enfermaria_id INTEGER`, (err3) => {
          if (err3) {
            console.error('Erro ao adicionar coluna enfermaria_id:', err3);
          } else {
            console.log('Coluna enfermaria_id adicionada à tabela leitos');
            // Criar índice após adicionar a coluna
            db.run(`CREATE INDEX IF NOT EXISTS idx_leitos_enfermaria ON leitos(enfermaria_id)`, (err4) => {
              if (err4) console.error('Erro ao criar índice idx_leitos_enfermaria:', err4);
            });
          }
        });
      } else {
        // Coluna já existe, criar índice normalmente
        db.run(`CREATE INDEX IF NOT EXISTS idx_leitos_enfermaria ON leitos(enfermaria_id)`, (err4) => {
          if (err4) console.error('Erro ao criar índice idx_leitos_enfermaria:', err4);
        });
      }
    });
  });
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_leitos_setor ON leitos(setor_id)`);
  
  // Garantir coluna enfermaria_id na tabela hotelaria_checklists
  db.all(`PRAGMA table_info(hotelaria_checklists)`, (err, cols) => {
    if (!err && cols && !cols.find(c => c.name === 'enfermaria_id')) {
      db.run(`ALTER TABLE hotelaria_checklists ADD COLUMN enfermaria_id INTEGER`, (err2) => {
        if (err2) console.error('Erro ao adicionar coluna enfermaria_id em checklists:', err2);
      });
    }
  });

  // Tabela de checklists de hotelaria
  db.run(`CREATE TABLE IF NOT EXISTS hotelaria_checklists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setor_id INTEGER NOT NULL,
    leito_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    colaborador TEXT NOT NULL,
    itens TEXT NOT NULL, -- JSON string com ids dos itens marcados
    observacoes TEXT,
    criado_por INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (setor_id) REFERENCES setores(id),
    FOREIGN KEY (leito_id) REFERENCES leitos(id),
    FOREIGN KEY (criado_por) REFERENCES usuarios(id)
  )`);
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET_VALUE, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido - faça login novamente' });
    }
    req.user = user;
    next();
  });
};

// Helpers de permissão
const isAdminRole = (role) => role === 'admin';
const isHotelariaGestorRole = (role) => role === 'hotelaria_gestor';
const isHotelariaColabRole = (role) => role === 'hotelaria_colab';

const ensureGestorHotelariaOrAdmin = (userRow) => {
  if (!userRow) return false;
  const role = (userRow.role || '').toLowerCase();
  return isAdminRole(role) || isHotelariaGestorRole(role);
};

const ensureHotelariaUser = (userRow) => {
  if (!userRow) return false;
  const role = (userRow.role || '').toLowerCase();
  return isAdminRole(role) || isHotelariaGestorRole(role) || isHotelariaColabRole(role);
};

// Middleware CORS customizado para garantir acesso pela rede
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Expose-Headers', 'Content-Type, Authorization');
  
  // Prevenir cache em respostas de API
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  
  // PREVENIR UPGRADE PARA HTTPS - CRÍTICO
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Upgrade-Insecure-Requests');
  res.header('X-Content-Type-Options', 'nosniff');
  
  next();
};

// Aplicar middleware CORS a todas as rotas
app.use(corsMiddleware);

// Handler para requisições OPTIONS (preflight CORS)
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Rotas
app.post('/api/login', (req, res) => {
  const { login, email, senha } = req.body;
  
  // Aceitar tanto 'login' quanto 'email' para compatibilidade
  const loginValue = login || email;

  if (!loginValue || !senha) {
    return res.status(400).json({ error: 'Login e senha são obrigatórios' });
  }

  // Detectar existência da coluna username para compatibilidade com bases antigas
  db.all(`PRAGMA table_info(usuarios)`, (err, cols) => {
    if (err) return res.status(500).json({ error: 'Erro interno' });
    const hasUsername = cols && cols.find(c => c.name === 'username');
    
    // Buscar por email, username ou login "admin" simplificado
    let query, params;
    if (loginValue.toLowerCase() === 'admin') {
      // Login simplificado: buscar usuário admin (username='admin' ou email='admin@recepcao.com' ou id=1)
      query = hasUsername 
        ? 'SELECT * FROM usuarios WHERE (username = ? OR email = ? OR id = 1) AND role = ?'
        : 'SELECT * FROM usuarios WHERE (email = ? OR id = 1) AND role = ?';
      params = hasUsername 
        ? ['admin', 'admin@recepcao.com', 'admin']
        : ['admin@recepcao.com', 'admin'];
    } else {
      query = hasUsername 
        ? 'SELECT * FROM usuarios WHERE email = ? OR username = ?' 
        : 'SELECT * FROM usuarios WHERE email = ?';
      params = hasUsername ? [loginValue, loginValue] : [loginValue];
    }

    db.get(query, params, (err2, user) => {
      if (err2) return res.status(500).json({ error: 'Erro interno' });
      if (!user || !bcrypt.compareSync(senha, user.senha)) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET_VALUE, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role || 'user' } });
    });
  });
});

const HOTELARIA_ROLES = new Set(['hotelaria_gestor', 'hotelaria_colab']);
const isAllowedRole = (role) => {
  const r = (role || '').toLowerCase();
  return r === 'admin' || r === 'user' || HOTELARIA_ROLES.has(r);
};

// Rota para criar usuário (apenas admin)
app.post('/api/usuarios', authenticateToken, (req, res) => {
  // Verificar permissão no banco para evitar inconsistência de token
  db.get(`SELECT id, email, role FROM usuarios WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    const isAdmin = row && ((row.role === 'admin') || (row.email && row.email.toLowerCase() === 'admin@recepcao.com') || row.id === 1);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, email, senha, role } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha' });
    }
    const roleFinalRaw = (role || 'user').toLowerCase();
    const roleFinal = isAllowedRole(roleFinalRaw) ? roleFinalRaw : 'user';

    // Gerar username a partir de "primeiro.último" de nome
    const gerarUsername = (nomeCompleto) => {
      const partes = (nomeCompleto || '').toLowerCase().trim().split(/\s+/);
      if (partes.length === 0) return '';
      const primeiro = partes[0];
      const ultimo = partes.length > 1 ? partes[partes.length - 1] : '';
      return ultimo ? `${primeiro}.${ultimo}` : primeiro;
    };
    let base = gerarUsername(nome);
    if (!base) base = email.split('@')[0];
    // Garantir username único
    const gerarDisponivel = (cb) => {
      let n = 0;
      const tentar = () => {
        const u = n === 0 ? base : `${base}${n}`;
        db.get(`SELECT 1 FROM usuarios WHERE username = ?`, [u], (e, r) => {
          if (e) return cb(u);
          if (r) { n++; tentar(); } else { cb(u); }
        });
      };
      tentar();
    };

    gerarDisponivel((username) => {
      const senhaHash = bcrypt.hashSync(senha, 10);
      db.run(`INSERT INTO usuarios (nome, email, senha, role, username) VALUES (?, ?, ?, ?, ?)`,
        [nome, email, senhaHash, roleFinal, username], function(err2) {
          if (err2) {
            return res.status(500).json({ error: 'Erro ao criar usuário' });
          }
          res.status(201).json({ id: this.lastID, nome, email, role: roleFinal, username });
        });
    });
  });
});

// Listar usuários (apenas admin)
app.get('/api/usuarios', authenticateToken, (req, res) => {
  db.get(`SELECT id, email, role FROM usuarios WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    const isAdmin = row && ((row.role === 'admin') || (row.email && row.email.toLowerCase() === 'admin@recepcao.com') || row.id === 1);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });
    db.all(`SELECT id, nome, email, COALESCE(username,'') as username, COALESCE(role,'user') as role FROM usuarios ORDER BY nome`, (err2, rows) => {
      if (err2) {
        return res.status(500).json({ error: 'Erro ao listar usuários' });
      }
      res.json(rows);
    });
  });
});

// Atualizar usuário (apenas admin) - sem alteração de senha por aqui
app.put('/api/usuarios/:id', authenticateToken, (req, res) => {
  const alvoId = parseInt(req.params.id, 10);
  if (!alvoId) return res.status(400).json({ error: 'ID inválido' });
  db.get(`SELECT id, email, role FROM usuarios WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    const isAdmin = row && ((row.role === 'admin') || (row.email && row.email.toLowerCase() === 'admin@recepcao.com') || row.id === 1);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, email, role } = req.body || {};
    if (!nome || !email) return res.status(400).json({ error: 'Campos obrigatórios: nome e email' });

    const roleFinalRaw = (role || 'user').toLowerCase();
    const roleFinal = isAllowedRole(roleFinalRaw) ? roleFinalRaw : 'user';

    db.run(`UPDATE usuarios SET nome = ?, email = ?, role = ? WHERE id = ?`,
      [nome, email, roleFinal, alvoId], function(err2) {
        if (err2) return res.status(500).json({ error: 'Erro ao atualizar usuário' });
        res.json({ success: true, id: alvoId });
      });
  });
});

// Remover usuário (apenas admin)
app.delete('/api/usuarios/:id', authenticateToken, (req, res) => {
  const alvoId = parseInt(req.params.id, 10);
  const userId = req.user.id;
  
  if (!alvoId) return res.status(400).json({ error: 'ID inválido' });
  
  // Verificar se não está tentando remover a si mesmo
  if (alvoId === userId) {
    return res.status(400).json({ error: 'Você não pode remover sua própria conta' });
  }

  db.get(`SELECT id, email, role FROM usuarios WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    const isAdmin = row && ((row.role === 'admin') || (row.email && row.email.toLowerCase() === 'admin@recepcao.com') || row.id === 1);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });

    // Verificar se é o último admin
    db.get('SELECT COUNT(*) as count FROM usuarios WHERE role = "admin"', [], (err2, result) => {
      if (err2) {
        return res.status(500).json({ error: 'Erro ao verificar permissões' });
      }

      if (result.count <= 1) {
        return res.status(400).json({ error: 'Não é possível remover o último administrador' });
      }

      db.run('DELETE FROM usuarios WHERE id = ?', [alvoId], function(err3) {
        if (err3) {
          return res.status(500).json({ error: 'Erro ao remover usuário' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ message: 'Usuário removido com sucesso' });
      });
    });
  });
});

app.get('/api/setores', (req, res) => {
  // Retornar setores únicos por nome para evitar duplicações no front-end
  db.all('SELECT MIN(id) as id, nome FROM setores GROUP BY nome ORDER BY nome', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar setores' });
    }
    res.json(rows);
  });
});

// === HOTELARIA: Setores ===
app.get('/api/hotelaria/setores', authenticateToken, (req, res) => {
  const somenteAtivos = (req.query.somenteAtivos || req.query.status) === 'ativo';
  const filtro = somenteAtivos ? `WHERE status = 'ativo'` : '';
  db.all(`SELECT id, nome, status, tipo, observacoes FROM setores ${filtro} ORDER BY nome`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar setores' });
    }
    res.json(rows || []);
  });
});

app.post('/api/hotelaria/setores', authenticateToken, (req, res) => {
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureGestorHotelariaOrAdmin(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, status, tipo, observacoes } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
    const statusFinal = (status || 'ativo').toLowerCase();
    const tipoFinal = tipo || 'Outro';

    db.run(`INSERT INTO setores (nome, status, tipo, observacoes) VALUES (?, ?, ?, ?)`, 
      [nome.trim(), statusFinal, tipoFinal, observacoes || null], function(err2) {
      if (err2) {
        return res.status(500).json({ error: 'Erro ao criar setor', detail: err2.message });
      }
      res.status(201).json({ id: this.lastID, nome, status: statusFinal, tipo: tipoFinal, observacoes });
    });
  });
});

app.put('/api/hotelaria/setores/:id', authenticateToken, (req, res) => {
  const setorId = parseInt(req.params.id, 10);
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureGestorHotelariaOrAdmin(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, status, tipo, observacoes } = req.body;
    const updates = [];
    const params = [];
    if (nome) { updates.push('nome = ?'); params.push(nome.trim()); }
    if (status) { updates.push('status = ?'); params.push(status.toLowerCase()); }
    if (tipo) { updates.push('tipo = ?'); params.push(tipo); }
    if (observacoes !== undefined) { updates.push('observacoes = ?'); params.push(observacoes || null); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(setorId);

    db.run(`UPDATE setores SET ${updates.join(', ')} WHERE id = ?`, params, function(err2) {
      if (err2) {
        return res.status(500).json({ error: 'Erro ao atualizar setor', detail: err2.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'Setor não encontrado' });
      res.json({ message: 'Setor atualizado' });
    });
  });
});

// === HOTELARIA: Enfermarias ===
app.get('/api/hotelaria/enfermarias', authenticateToken, (req, res) => {
  const { setor_id } = req.query;
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureHotelariaUser(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    let query = `SELECT e.*, s.nome as setor_nome 
                 FROM enfermarias e 
                 JOIN setores s ON s.id = e.setor_id`;
    const params = [];
    if (setor_id) {
      query += ' WHERE e.setor_id = ?';
      params.push(setor_id);
    }
    query += ' ORDER BY e.nome';

    db.all(query, params, (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Erro ao buscar enfermarias' });
      res.json(rows || []);
    });
  });
});

app.post('/api/hotelaria/enfermarias', authenticateToken, (req, res) => {
  const { setor_id, nome, status } = req.body || {};
  if (!setor_id || !nome) return res.status(400).json({ error: 'Setor e nome são obrigatórios' });

  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureGestorHotelariaOrAdmin(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    const st = (status || 'ativo').toLowerCase();
    db.run(`INSERT INTO enfermarias (setor_id, nome, status) VALUES (?, ?, ?)`,
      [setor_id, nome.trim(), st], function(err2) {
        if (err2) return res.status(500).json({ error: 'Erro ao criar enfermaria', detail: err2.message });
        res.status(201).json({ id: this.lastID, setor_id, nome: nome.trim(), status: st });
      });
  });
});

app.put('/api/hotelaria/enfermarias/:id', authenticateToken, (req, res) => {
  const enfId = parseInt(req.params.id, 10);
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureGestorHotelariaOrAdmin(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, status, setor_id } = req.body || {};
    const updates = [];
    const params = [];
    if (nome) { updates.push('nome = ?'); params.push(nome.trim()); }
    if (status) { updates.push('status = ?'); params.push(status.toLowerCase()); }
    if (setor_id) { updates.push('setor_id = ?'); params.push(setor_id); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(enfId);

    db.run(`UPDATE enfermarias SET ${updates.join(', ')} WHERE id = ?`, params, function(err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao atualizar enfermaria', detail: err2.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Enfermaria não encontrada' });
      res.json({ message: 'Enfermaria atualizada' });
    });
  });
});

// === HOTELARIA: Leitos ===
app.get('/api/hotelaria/leitos', authenticateToken, (req, res) => {
  const { setor_id, enfermaria_id } = req.query;
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureHotelariaUser(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    // Verificar se a coluna enfermaria_id existe antes de usar
    db.all(`PRAGMA table_info(leitos)`, (err1, cols) => {
      if (err1) return res.status(500).json({ error: 'Erro ao verificar schema' });
      
      const hasEnfermariaId = cols && cols.find(c => c.name === 'enfermaria_id');
      
      let query = `SELECT l.*, s.nome as setor_nome`;
      if (hasEnfermariaId) {
        query += `, e.nome as enfermaria_nome 
                 FROM leitos l 
                 LEFT JOIN enfermarias e ON e.id = l.enfermaria_id
                 LEFT JOIN setores s ON s.id = COALESCE(e.setor_id, l.setor_id)`;
      } else {
        query += ` FROM leitos l 
                 LEFT JOIN setores s ON s.id = l.setor_id`;
      }
      
      const params = [];
      if (setor_id) {
        query += hasEnfermariaId 
          ? ' WHERE COALESCE(e.setor_id, l.setor_id) = ?'
          : ' WHERE l.setor_id = ?';
        params.push(setor_id);
      }
      if (enfermaria_id && hasEnfermariaId) {
        query += setor_id ? ' AND' : ' WHERE';
        query += ' l.enfermaria_id = ?';
        params.push(enfermaria_id);
      }
      query += ' ORDER BY l.identificacao';

      db.all(query, params, (err2, rows) => {
        if (err2) return res.status(500).json({ error: 'Erro ao buscar leitos', detail: err2.message });
        res.json(rows || []);
      });
    });
  });
});

app.post('/api/hotelaria/leitos', authenticateToken, (req, res) => {
  const { setor_id, enfermaria_id, identificacao, status } = req.body;
  if (!identificacao || (!setor_id && !enfermaria_id)) {
    return res.status(400).json({ error: 'Setor ou enfermaria e identificação são obrigatórios' });
  }

  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureGestorHotelariaOrAdmin(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    const insertWithSetor = (resolvedSetorId) => {
      db.run(`INSERT INTO leitos (setor_id, enfermaria_id, identificacao, status) VALUES (?, ?, ?, ?)`,
        [resolvedSetorId, enfermaria_id || null, identificacao.trim(), (status || 'ativo').toLowerCase()], function(err2) {
          if (err2) return res.status(500).json({ error: 'Erro ao criar leito', detail: err2.message });
          res.status(201).json({
            id: this.lastID,
            setor_id: resolvedSetorId,
            enfermaria_id: enfermaria_id || null,
            identificacao: identificacao.trim(),
            status: (status || 'ativo').toLowerCase()
          });
        });
    };

    if (enfermaria_id && !setor_id) {
      db.get(`SELECT setor_id FROM enfermarias WHERE id = ?`, [enfermaria_id], (e2, enf) => {
        if (e2) return res.status(500).json({ error: 'Erro ao buscar enfermaria' });
        if (!enf) return res.status(400).json({ error: 'Enfermaria inválida' });
        insertWithSetor(enf.setor_id);
      });
    } else {
      insertWithSetor(setor_id);
    }
  });
});

app.put('/api/hotelaria/leitos/:id', authenticateToken, (req, res) => {
  const leitoId = parseInt(req.params.id, 10);
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureGestorHotelariaOrAdmin(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    const { identificacao, status, setor_id, enfermaria_id } = req.body;
    const updates = [];
    const params = [];
    if (identificacao) { updates.push('identificacao = ?'); params.push(identificacao.trim()); }
    if (status) { updates.push('status = ?'); params.push(status.toLowerCase()); }
    if (setor_id) { updates.push('setor_id = ?'); params.push(setor_id); }
    if (typeof enfermaria_id !== 'undefined') { updates.push('enfermaria_id = ?'); params.push(enfermaria_id || null); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    params.push(leitoId);

    db.run(`UPDATE leitos SET ${updates.join(', ')} WHERE id = ?`, params, function(err2) {
      if (err2) return res.status(500).json({ error: 'Erro ao atualizar leito', detail: err2.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Leito não encontrado' });
      res.json({ message: 'Leito atualizado' });
    });
  });
});

// === HOTELARIA: Checklists ===
app.post('/api/hotelaria/checklists', authenticateToken, (req, res) => {
  const { setor_id, leito_id, data, colaborador, itens, observacoes } = req.body;
  if (!setor_id || !leito_id || !data || !colaborador) {
    return res.status(400).json({ error: 'Campos obrigatórios: setor_id, leito_id, data, colaborador' });
  }

  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureHotelariaUser(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    db.get(`SELECT id, setor_id FROM leitos WHERE id = ?`, [leito_id], (err2, leitoRow) => {
      if (err2) return res.status(500).json({ error: 'Erro ao validar leito' });
      if (!leitoRow) return res.status(404).json({ error: 'Leito não encontrado' });
      if (parseInt(leitoRow.setor_id, 10) !== parseInt(setor_id, 10)) {
        return res.status(400).json({ error: 'Leito não pertence ao setor informado' });
      }

      const itensJson = JSON.stringify(itens || []);
      db.run(`INSERT INTO hotelaria_checklists (setor_id, leito_id, data, colaborador, itens, observacoes, criado_por)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [setor_id, leito_id, data, colaborador.trim(), itensJson, observacoes || null, req.user.id],
        function(err3) {
          if (err3) return res.status(500).json({ error: 'Erro ao salvar checklist', detail: err3.message });
          res.status(201).json({ id: this.lastID });
        });
    });
  });
});

app.get('/api/hotelaria/checklists', authenticateToken, (req, res) => {
  const { setor_id, leito_id, data, data_inicio, data_fim, enfermaria_id, colaborador } = req.query;
  db.get(`SELECT id, role FROM usuarios WHERE id = ?`, [req.user.id], (err, userRow) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    if (!ensureHotelariaUser(userRow)) return res.status(403).json({ error: 'Acesso negado' });

    let query = `SELECT hc.*, 
                        l.identificacao as leito_identificacao, 
                        l.enfermaria_id,
                        s.nome as setor_nome, 
                        e.nome as enfermaria_nome,
                        u.nome as criado_por_nome
                 FROM hotelaria_checklists hc
                 JOIN leitos l ON l.id = hc.leito_id
                 JOIN setores s ON s.id = hc.setor_id
                 LEFT JOIN enfermarias e ON e.id = l.enfermaria_id
                 LEFT JOIN usuarios u ON u.id = hc.criado_por
                 WHERE 1=1`;
    const params = [];
    if (setor_id) { query += ' AND hc.setor_id = ?'; params.push(setor_id); }
    if (leito_id) { query += ' AND hc.leito_id = ?'; params.push(leito_id); }
    if (data) { query += ' AND hc.data = ?'; params.push(data); }
    if (data_inicio) { query += ' AND hc.data >= ?'; params.push(data_inicio); }
    if (data_fim) { query += ' AND hc.data <= ?'; params.push(data_fim); }
    if (enfermaria_id) { query += ' AND l.enfermaria_id = ?'; params.push(enfermaria_id); }
    if (colaborador) { query += ' AND hc.colaborador LIKE ?'; params.push(`%${colaborador}%`); }
    query += ' ORDER BY hc.created_at DESC LIMIT 1000';

    db.all(query, params, (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Erro ao buscar checklists', detail: err2.message });
      res.json((rows || []).map(r => ({
        ...r,
        itens: safeParse(r.itens, []),
      })));
    });
  });
});

app.get('/api/pacientes', (req, res) => {
  const { setor_id } = req.query;
  let query = 'SELECT * FROM pacientes';
  let params = [];

  if (setor_id) {
    query += ' WHERE setor_id = ?';
    params.push(setor_id);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar pacientes' });
    }
    res.json(rows);
  });
});

app.post('/api/visitantes', upload.single('foto'), (req, res) => {
  const { nome, documento, telefone, setor_id, paciente_id, paciente_nome, tipo } = req.body;
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

  const tipoRegistro = (tipo === 'fornecedor') ? 'fornecedor' : 'visitante';

  if (!nome || !documento || !setor_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, documento e setor' });
  }

  const precisaPaciente = (tipoRegistro === 'visitante' || tipoRegistro === 'acompanhante');

  const inserirRegistro = (pacienteFinalId) => {
    db.run(`INSERT INTO visitantes (nome, documento, telefone, foto_url, setor_id, paciente_id, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      [nome, documento, telefone || null, foto_url, setor_id, precisaPaciente ? pacienteFinalId : null, tipoRegistro], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao cadastrar visitante' });
      }

      db.get(`SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
              FROM visitantes v 
              JOIN setores s ON v.setor_id = s.id 
              LEFT JOIN pacientes p ON v.paciente_id = p.id 
              WHERE v.id = ?`, [this.lastID], (err, visitante) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar dados do visitante' });
        }
        res.status(201).json(visitante);
      });
    });
  };

  if (!precisaPaciente) {
    return inserirRegistro(null);
  }

  // Para visitante/acompanhante: permitir informar paciente por nome
  const nomePaciente = paciente_id ? null : (paciente_nome || req.body.paciente || req.body.pacienteNome || '').trim();
  if (paciente_id) {
    return inserirRegistro(paciente_id);
  }

  if (!nomePaciente) {
    return res.status(400).json({ error: 'Informe o nome do paciente' });
  }

  // Buscar paciente por nome e setor; criar se não existir
  db.get(`SELECT id FROM pacientes WHERE LOWER(nome) = LOWER(?) AND setor_id = ?`, [nomePaciente, setor_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar paciente' });
    }
    if (row) {
      return inserirRegistro(row.id);
    }
    db.run(`INSERT INTO pacientes (nome, setor_id) VALUES (?, ?)`, [nomePaciente, setor_id], function(err2) {
      if (err2) {
        return res.status(500).json({ error: 'Erro ao criar paciente' });
      }
      inserirRegistro(this.lastID);
    });
  });
});

app.get('/api/visitantes', (req, res) => {
  const {
    ativo,
    data_inicio,
    data_fim,
    setor_id,
    tipo,
    status,
    nome,
    documento,
    paciente,
    ordenar
  } = req.query;

  let query = `SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
               FROM visitantes v 
               JOIN setores s ON v.setor_id = s.id 
               LEFT JOIN pacientes p ON v.paciente_id = p.id`;

  const where = [];
  const params = [];

  if (ativo === 'true') {
    where.push('v.saida IS NULL');
  }

  if (status === 'ativo') {
    where.push('v.saida IS NULL');
  } else if (status === 'finalizado') {
    where.push('v.saida IS NOT NULL');
  }

  if (setor_id) {
    where.push('v.setor_id = ?');
    params.push(setor_id);
  }

  if (tipo === 'visitante' || tipo === 'fornecedor' || tipo === 'acompanhante') {
    where.push('v.tipo = ?');
    params.push(tipo);
  }

  if (nome) {
    where.push('LOWER(v.nome) LIKE ?');
    params.push(`%${nome.toLowerCase()}%`);
  }

  if (documento) {
    where.push('v.documento LIKE ?');
    params.push(`%${documento}%`);
  }

  if (paciente) {
    where.push('p.nome IS NOT NULL AND LOWER(p.nome) LIKE ?');
    params.push(`%${paciente.toLowerCase()}%`);
  }

  if (data_inicio) {
    where.push('date(v.entrada) >= date(?)');
    params.push(data_inicio);
  }

  if (data_fim) {
    where.push('date(v.entrada) <= date(?)');
    params.push(data_fim);
  }

  if (where.length > 0) {
    query += ' WHERE ' + where.join(' AND ');
  }

  // Ordenação
  let orderBy = 'v.entrada DESC';
  switch (ordenar) {
    case 'entrada_asc':
      orderBy = 'v.entrada ASC';
      break;
    case 'nome_asc':
      orderBy = 'v.nome ASC';
      break;
    case 'nome_desc':
      orderBy = 'v.nome DESC';
      break;
    default:
      orderBy = 'v.entrada DESC';
  }
  query += ` ORDER BY ${orderBy}`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar visitantes' });
    }
    res.json(rows);
  });
});

// Buscar visitante específico por ID
app.get('/api/visitantes/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  
  if (!id) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  
  const query = `
    SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
    FROM visitantes v 
    LEFT JOIN setores s ON v.setor_id = s.id 
    LEFT JOIN pacientes p ON v.paciente_id = p.id
    WHERE v.id = ?
  `;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Visitante não encontrado' });
    }
    
    res.json(row);
  });
});

// === Chaves: Helpers ===
const ensureAdmin = (req, res, next) => {
  db.get(`SELECT id, email, role FROM usuarios WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    const isAdmin = row && ((row.role === 'admin') || (row.email && row.email.toLowerCase() === 'admin@recepcao.com') || row.id === 1);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });
    next();
  });
};

// === Chaves: Endpoints ===
// Listar chaves e status atual
app.get('/api/chaves', authenticateToken, (req, res) => {
  const sql = `
    SELECT c.id, c.descricao, c.localizacao, c.ativa,
           CASE WHEN m.id IS NULL THEN 0 ELSE 1 END AS emprestada,
           m.retirado_por, m.setor, m.cargo, m.retirada_em
    FROM chaves c
    LEFT JOIN (
      SELECT * FROM chaves_movimentacoes WHERE devolvido_em IS NULL
    ) m ON m.chave_id = c.id
    ORDER BY c.descricao
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar chaves' });
    res.json(rows);
  });
});

// Criar chave (admin)
app.post('/api/chaves', authenticateToken, ensureAdmin, (req, res) => {
  const { descricao, localizacao, ativa } = req.body || {};
  if (!descricao) return res.status(400).json({ error: 'Descrição é obrigatória' });
  db.run(`INSERT INTO chaves (descricao, localizacao, ativa) VALUES (?, ?, ?)`,
    [descricao, localizacao || null, ativa === 0 ? 0 : 1], function(err){
      if (err) return res.status(500).json({ error: 'Erro ao criar chave' });
      res.status(201).json({ id: this.lastID, descricao, localizacao: localizacao || null, ativa: ativa === 0 ? 0 : 1 });
    });
});

// Retirar chave (registrar empréstimo)
app.post('/api/chaves/:id/retirar', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { retirado_por, setor, cargo, documento, contato, observacao } = req.body || {};
  if (!id || !retirado_por) return res.status(400).json({ error: 'ID e retirado_por são obrigatórios' });
  db.get(`SELECT 1 FROM chaves WHERE id = ? AND ativa = 1`, [id], (e1, r1) => {
    if (e1) return res.status(500).json({ error: 'Erro ao validar chave' });
    if (!r1) return res.status(404).json({ error: 'Chave não encontrada ou inativa' });
    db.get(`SELECT 1 FROM chaves_movimentacoes WHERE chave_id = ? AND devolvido_em IS NULL`, [id], (e2, r2) => {
      if (e2) return res.status(500).json({ error: 'Erro ao verificar status' });
      if (r2) return res.status(409).json({ error: 'Chave já está emprestada' });
      db.run(`INSERT INTO chaves_movimentacoes (chave_id, retirado_por, setor, cargo, documento, contato, observacao) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, retirado_por, setor || null, cargo || null, documento || null, contato || null, observacao || null], function(e3){
          if (e3) return res.status(500).json({ error: 'Erro ao registrar retirada' });
          res.status(201).json({ id: this.lastID, chave_id: id, retirado_por, setor: setor || null, cargo: cargo || null, documento: documento || null, contato: contato || null, observacao: observacao || null });
        });
    });
  });
});

// Devolver chave (finalizar empréstimo)
app.post('/api/chaves/:id/devolver', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { devolvido_por } = req.body || {};
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  db.get(`SELECT id FROM chaves_movimentacoes WHERE chave_id = ? AND devolvido_em IS NULL`, [id], (e1, r1) => {
    if (e1) return res.status(500).json({ error: 'Erro ao buscar empréstimo aberto' });
    if (!r1) return res.status(404).json({ error: 'Chave não está emprestada' });
    db.run(`UPDATE chaves_movimentacoes SET devolvido_em = CURRENT_TIMESTAMP, devolvido_por = ? WHERE id = ?`,
      [devolvido_por || null, r1.id], function(e2){
        if (e2) return res.status(500).json({ error: 'Erro ao registrar devolução' });
        res.json({ success: true });
      });
  });
});

// Histórico de movimentações da chave
app.get('/api/chaves/:id/historico', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  db.all(`SELECT * FROM chaves_movimentacoes WHERE chave_id = ? ORDER BY retirada_em DESC`, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar histórico' });
    res.json(rows);
  });
});

app.put('/api/visitantes/:id/saida', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE visitantes SET saida = CURRENT_TIMESTAMP WHERE id = ? AND saida IS NULL', 
    [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao registrar saída' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Visitante não encontrado ou já registrou saída' });
    }

    res.json({ message: 'Saída registrada com sucesso' });
  });
});

// Atualizar visitante (apenas admin)
app.put('/api/visitantes/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  // Verificar permissão admin direto no banco
  db.get(`SELECT id, email, role FROM usuarios WHERE id = ?`, [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Erro ao verificar permissão' });
    const isAdmin = row && ((row.role === 'admin') || (row.email && row.email.toLowerCase() === 'admin@recepcao.com') || row.id === 1);
    if (!isAdmin) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, documento, telefone, setor_id, paciente_id, paciente_nome, tipo } = req.body || {};

    if (!nome || !documento || !setor_id) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, documento e setor' });
    }

    const tipoRegistro = (tipo === 'fornecedor') ? 'fornecedor' : (tipo === 'acompanhante' ? 'acompanhante' : 'visitante');
    const precisaPaciente = (tipoRegistro === 'visitante' || tipoRegistro === 'acompanhante');

    const aplicarAtualizacao = (pacienteFinalId) => {
      db.run(`UPDATE visitantes 
              SET nome = ?, documento = ?, telefone = ?, setor_id = ?, paciente_id = ?, tipo = ?
              WHERE id = ?`,
        [nome, documento, telefone || null, setor_id, precisaPaciente ? pacienteFinalId : null, tipoRegistro, id], function(err2) {
          if (err2) {
            return res.status(500).json({ error: 'Erro ao atualizar visitante' });
          }
          db.get(`SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
                  FROM visitantes v 
                  JOIN setores s ON v.setor_id = s.id 
                  LEFT JOIN pacientes p ON v.paciente_id = p.id 
                  WHERE v.id = ?`, [id], (err3, visitante) => {
            if (err3) return res.status(500).json({ error: 'Erro ao buscar visitante atualizado' });
            res.json(visitante);
          });
        });
    };

    if (!precisaPaciente) {
      return aplicarAtualizacao(null);
    }

    if (paciente_id) {
      return aplicarAtualizacao(paciente_id);
    }

    const nomePaciente = (paciente_nome || '').trim();
    if (!nomePaciente) {
      return res.status(400).json({ error: 'Informe o nome do paciente' });
    }

    db.get(`SELECT id FROM pacientes WHERE LOWER(nome) = LOWER(?) AND setor_id = ?`, [nomePaciente, setor_id], (e1, r1) => {
      if (e1) return res.status(500).json({ error: 'Erro ao buscar paciente' });
      if (r1) return aplicarAtualizacao(r1.id);
      db.run(`INSERT INTO pacientes (nome, setor_id) VALUES (?, ?)`, [nomePaciente, setor_id], function(e2) {
        if (e2) return res.status(500).json({ error: 'Erro ao criar paciente' });
        aplicarAtualizacao(this.lastID);
      });
    });
  });
});

// Middleware para prevenir upgrade HTTPS em arquivos estáticos
const preventHttpsUpgrade = (req, res, next) => {
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Upgrade-Insecure-Requests');
  next();
};

// Servir arquivos estáticos
app.use('/uploads', preventHttpsUpgrade, express.static(UPLOADS_DIR));
app.use(preventHttpsUpgrade, express.static(path.join(__dirname, 'public')));

// Proxy local para carregar bibliotecas de CDN e evitar ORB
app.get('/vendor/qrcode.min.js', (req, res) => {
  const https = require('https');
  const url = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
  res.setHeader('Content-Type', 'application/javascript');
  https.get(url, (r) => {
    if (r.statusCode !== 200) {
      res.status(r.statusCode || 500);
    }
    r.pipe(res);
  }).on('error', (err) => {
    res.status(500).send('// Erro ao carregar QRCode: ' + (err && err.message || 'erro desconhecido'));
  });
});

app.get('/vendor/jspdf.umd.min.js', (req, res) => {
  const https = require('https');
  const url = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  res.setHeader('Content-Type', 'application/javascript');
  https.get(url, (r) => {
    if (r.statusCode !== 200) {
      res.status(r.statusCode || 500);
    }
    r.pipe(res);
  }).on('error', (err) => {
    res.status(500).send('// Erro ao carregar jsPDF: ' + (err && err.message || 'erro desconhecido'));
  });
});

app.get('/vendor/jspdf.plugin.autotable.min.js', (req, res) => {
  const https = require('https');
  const url = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
  res.setHeader('Content-Type', 'application/javascript');
  https.get(url, (r) => {
    if (r.statusCode !== 200) {
      res.status(r.statusCode || 500);
    }
    r.pipe(res);
  }).on('error', (err) => {
    res.status(500).send('// Erro ao carregar jsPDF Autotable: ' + (err && err.message || 'erro desconhecido'));
  });
});

// Proxy local para Chart.js
app.get('/vendor/chart.min.js', (req, res) => {
  const https = require('https');
  const url = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
  res.setHeader('Content-Type', 'application/javascript');
  https.get(url, (r) => {
    if (r.statusCode !== 200) {
      res.status(r.statusCode || 500);
    }
    r.pipe(res);
  }).on('error', (err) => {
    res.status(500).send('// Erro ao carregar Chart.js: ' + (err && err.message || 'erro desconhecido'));
  });
});

// Rota para servir a aplicação (fallback SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index_old.html'));
});

const USE_HTTPS = String(process.env.HTTPS_ENABLE || '').toLowerCase() === 'true';
if (USE_HTTPS) {
  const https = require('https');
  const opts = {};
  try {
    if (process.env.SSL_PFX_PATH && fs.existsSync(process.env.SSL_PFX_PATH)) {
      opts.pfx = fs.readFileSync(process.env.SSL_PFX_PATH);
      if (process.env.SSL_PFX_PASSWORD) opts.passphrase = process.env.SSL_PFX_PASSWORD;
    } else if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH && fs.existsSync(process.env.SSL_KEY_PATH) && fs.existsSync(process.env.SSL_CERT_PATH)) {
      opts.key = fs.readFileSync(process.env.SSL_KEY_PATH);
      opts.cert = fs.readFileSync(process.env.SSL_CERT_PATH);
    } else {
      console.warn('HTTPS_ENABLE=true, mas certificados nao foram encontrados. Caindo para HTTP.');
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando na porta ${PORT}`);
        console.log(`Acesse: http://localhost:${PORT} ou http://[IP_DO_SERVIDOR]:${PORT}`);
      });
      return;
    }
    https.createServer(opts, app).listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor HTTPS rodando na porta ${PORT}`);
      console.log(`Acesse: https://localhost:${PORT} ou https://[IP_DO_SERVIDOR]:${PORT}`);
    });
  } catch (e) {
    console.error('Falha ao iniciar HTTPS, caindo para HTTP:', e && e.message);
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse: http://localhost:${PORT} ou http://[IP_DO_SERVIDOR]:${PORT}`);
    });
  }
} else {
  app.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    let serverIP = 'localhost';
    for (const interfaceName in networkInterfaces) {
      const addresses = networkInterfaces[interfaceName];
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          serverIP = addr.address;
          break;
        }
      }
      if (serverIP !== 'localhost') break;
    }
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse localmente: http://localhost:${PORT}`);
    if (serverIP !== 'localhost') {
      console.log(`Acesse pela rede: http://${serverIP}:${PORT}`);
    }
  });
}