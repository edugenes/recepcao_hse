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

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_env';

// Biometria removida

// Middleware
// Ajuste de segurança: em desenvolvimento, permitir inline scripts/styles para a SPA funcionar
// e desabilitar COEP. Em produção, configure CSP estrita.
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
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
app.use(express.static('public'));

// Criar diretório uploads se não existir
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Inicializar banco de dados
const db = new sqlite3.Database('recepcao.db');

// Criar tabelas
db.serialize(() => {
  // Tabela de setores
  db.run(`CREATE TABLE IF NOT EXISTS setores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL
  )`);

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
      // Colunas relacionadas à biometria mantidas apenas para compatibilidade com bancos existentes
      // (não serão mais utilizadas)
      if (!columns.find(c => c.name === 'digital_template')) {
        db.run(`ALTER TABLE visitantes ADD COLUMN digital_template TEXT`);
      }
      if (!columns.find(c => c.name === 'status')) {
        db.run(`ALTER TABLE visitantes ADD COLUMN status TEXT DEFAULT 'dentro'`);
      }
      if (!columns.find(c => c.name === 'usuario_id')) {
        db.run(`ALTER TABLE visitantes ADD COLUMN usuario_id INTEGER`);
      }
    }
  });

  // Tabela de digitais mantida apenas para compatibilidade (não utilizada)
  db.run(`CREATE TABLE IF NOT EXISTS digitais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitante_id INTEGER,
    template TEXT NOT NULL,
    data_captura DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitante_id) REFERENCES visitantes (id)
  )`);

  // Tabela de usuários
  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    username TEXT UNIQUE
  )`);

  // Garantir existência das colunas e só então prosseguir com inserts/updates
  db.all(`PRAGMA table_info(usuarios)`, (err, columns) => {
    const hasRole = (!err && columns && columns.find(c => c.name === 'role')) ? true : false;
    const hasUsername = (!err && columns && columns.find(c => c.name === 'username')) ? true : false;

    const ensureRole = (cb) => {
      if (!hasRole) { db.run(`ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'user'`, cb); } else { cb(); }
    };
    const ensureUsername = (cb) => {
      if (!hasUsername) { db.run(`ALTER TABLE usuarios ADD COLUMN username TEXT UNIQUE`, cb); } else { cb(); }
    };

    const proceed = () => {
      const senhaHash = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT OR IGNORE INTO usuarios (id, nome, email, senha) VALUES (1, ?, ?, ?)`, 
        ['Admin', 'admin@recepcao.com', senhaHash]);

      const senhaUser = bcrypt.hashSync('user123', 10);
      db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha) VALUES (?, ?, ?)`, 
        ['Usuário', 'user@recepcao.com', senhaUser]);

      db.run(`UPDATE usuarios SET role = 'admin' WHERE (email = 'admin@recepcao.com' OR id = 1)`);
      db.run(`UPDATE usuarios SET role = 'user' WHERE (role IS NULL OR role = '') AND email <> 'admin@recepcao.com'`);

      // Apenas se a coluna username existir, faça ajustes
      db.all(`PRAGMA table_info(usuarios)`, (e2, cols2) => {
        const hasUserCol = (!e2 && cols2 && cols2.find(c => c.name === 'username')) ? true : false;
        if (hasUserCol) {
          db.run(`UPDATE usuarios SET username = 'admin' WHERE (email = 'admin@recepcao.com' OR id = 1)`);
          db.run(`UPDATE usuarios SET username = 'usuario' WHERE (username IS NULL OR username = '') AND (email = 'user@recepcao.com')`);
        }
        // Garantir senha do admin (id=1)
        db.run(`UPDATE usuarios SET senha = ? WHERE (email = 'admin@recepcao.com' OR id = 1)`, [senhaHash]);
      });
    };

    ensureRole(() => ensureUsername(proceed));
  });

  // Inserir setores
  const setores = ['UTI', 'Enfermaria', 'Pronto Socorro', 'Ambulatório', 'Cirurgia', 'Pediatria'];
  setores.forEach(setor => {
    db.run(`INSERT OR IGNORE INTO setores (nome) VALUES (?)`, [setor]);
  });

  // Inserir pacientes de exemplo
  const pacientes = [
    { nome: 'João Silva', setor_id: 1 },
    { nome: 'Maria Santos', setor_id: 2 },
    { nome: 'Pedro Oliveira', setor_id: 1 },
    { nome: 'Ana Costa', setor_id: 3 }
  ];
  pacientes.forEach(paciente => {
    db.run(`INSERT OR IGNORE INTO pacientes (nome, setor_id) VALUES (?, ?)`, 
      [paciente.nome, paciente.setor_id]);
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
});

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido - faça login novamente' });
    }
    req.user = user;
    next();
  });
};

// Rotas
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  // Detectar existência da coluna username para compatibilidade com bases antigas
  db.all(`PRAGMA table_info(usuarios)`, (err, cols) => {
    if (err) return res.status(500).json({ error: 'Erro interno' });
    const hasUsername = cols && cols.find(c => c.name === 'username');
    const query = hasUsername ? 'SELECT * FROM usuarios WHERE email = ? OR username = ?' : 'SELECT * FROM usuarios WHERE email = ?';
    const params = hasUsername ? [email, email] : [email];

    db.get(query, params, (err2, user) => {
      if (err2) return res.status(500).json({ error: 'Erro interno' });
      if (!user || !bcrypt.compareSync(senha, user.senha)) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role || 'user' } });
    });
  });
});

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
        [nome, email, senhaHash, role === 'admin' ? 'admin' : 'user', username], function(err2) {
          if (err2) {
            return res.status(500).json({ error: 'Erro ao criar usuário' });
          }
          res.status(201).json({ id: this.lastID, nome, email, role: role === 'admin' ? 'admin' : 'user', username });
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

    db.run(`UPDATE usuarios SET nome = ?, email = ?, role = ? WHERE id = ?`,
      [nome, email, role === 'admin' ? 'admin' : 'user', alvoId], function(err2) {
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
  db.all('SELECT * FROM setores', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar setores' });
    }
    res.json(rows);
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

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

// Rotas de biometria removidas

// Rota para servir a aplicação
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log('Credenciais: admin@recepcao.com / admin123');
});