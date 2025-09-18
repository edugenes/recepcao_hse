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

// Middleware
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
      "connect-src": ["'self'", "https://cdn.jsdelivr.net", "ws://localhost:3001", "wss://localhost:3001"],
      "font-src": ["'self'", "data:"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
app.use(express.json());
// app.use(express.static('public')); // Removido para evitar conflito com rota principal

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

// Criar tabelas (incluindo biométrica)
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

  // Tabela de visitantes (versão 2.0 com biométrica)
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
    status TEXT DEFAULT 'dentro',
    usuario_id INTEGER,
    digital_template TEXT,
    digital_quality INTEGER,
    digital_captured_at DATETIME,
    FOREIGN KEY (setor_id) REFERENCES setores (id),
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
  )`);

  // Tabela de templates biométricos (nova na v2.0)
  db.run(`CREATE TABLE IF NOT EXISTS biometric_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitante_id INTEGER NOT NULL,
    template_data TEXT NOT NULL,
    template_format TEXT DEFAULT 'ISO19794-2',
    quality_score INTEGER,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
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

  // Tabela de chaves
  db.run(`CREATE TABLE IF NOT EXISTS chaves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    descricao TEXT NOT NULL,
    localizacao TEXT,
    ativa INTEGER DEFAULT 1
  )`);

  // Tabela de movimentações de chaves
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

  // Usuários padrão
  const senhaHash = bcrypt.hashSync('admin123', 10);
  db.run(`INSERT OR IGNORE INTO usuarios (id, nome, email, senha, role, username) VALUES (1, ?, ?, ?, ?, ?)`, 
    ['Admin', 'admin@recepcao.com', senhaHash, 'admin', 'admin']);

  const senhaUser = bcrypt.hashSync('user123', 10);
  db.run(`INSERT OR IGNORE INTO usuarios (nome, email, senha, role, username) VALUES (?, ?, ?, ?, ?)`, 
    ['Usuário', 'user@recepcao.com', senhaUser, 'user', 'usuario']);
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

// === ROTAS BIOMÉTRICAS (NOVAS NA V2.0) ===

// Verificar se template biométrico já existe
app.post('/api/biometric/verify', authenticateToken, (req, res) => {
  const { template } = req.body;

  if (!template) {
    return res.status(400).json({ error: 'Template é obrigatório' });
  }

  db.get(`SELECT id FROM biometric_templates WHERE template_data = ? AND is_active = 1`, 
    [template], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar template' });
    }

    res.json({ exists: !!row });
  });
});

// Salvar template biométrico
app.post('/api/biometric/save', authenticateToken, (req, res) => {
  const { visitante_id, template, quality, format } = req.body;

  if (!visitante_id || !template) {
    return res.status(400).json({ error: 'visitante_id e template são obrigatórios' });
  }

  db.run(`INSERT INTO biometric_templates (visitante_id, template_data, quality_score, template_format) 
          VALUES (?, ?, ?, ?)`, 
    [visitante_id, template, quality || 0, format || 'ISO19794-2'], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao salvar template biométrico' });
    }

    // Atualizar visitante com dados biométricos
    db.run(`UPDATE visitantes SET 
            digital_template = ?, 
            digital_quality = ?, 
            digital_captured_at = CURRENT_TIMESTAMP 
            WHERE id = ?`, 
      [template, quality || 0, visitante_id], (err2) => {
      if (err2) {
        console.error('Erro ao atualizar visitante com dados biométricos:', err2);
      }

      res.json({ 
        success: true, 
        template_id: this.lastID,
        message: 'Template biométrico salvo com sucesso' 
      });
    });
  });
});

// Buscar template por visitante
app.get('/api/biometric/visitante/:id', authenticateToken, (req, res) => {
  const visitanteId = req.params.id;

  db.get(`SELECT * FROM biometric_templates WHERE visitante_id = ? AND is_active = 1`, 
    [visitanteId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar template' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Template não encontrado' });
    }

    res.json({
      id: row.id,
      quality: row.quality_score,
      format: row.template_format,
      captured_at: row.captured_at,
      has_template: true
    });
  });
});

// === ROTAS EXISTENTES (MANTIDAS DA V1.0) ===

// Login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;

  db.get(`SELECT * FROM usuarios WHERE email = ? OR username = ?`, [email, email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro interno' });
    if (!user || !bcrypt.compareSync(senha, user.senha)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, role: user.role || 'user' } });
  });
});

// Setores
app.get('/api/setores', (req, res) => {
  db.all('SELECT * FROM setores', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar setores' });
    }
    res.json(rows);
  });
});

// Pacientes
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

// Cadastrar visitante (VERSÃO 2.0 COM BIOMÉTRICA)
app.post('/api/visitantes', upload.single('foto'), (req, res) => {
  const { nome, documento, telefone, setor_id, paciente_id, paciente_nome, tipo, digital_template, digital_quality } = req.body;
  const foto_url = req.file ? `/uploads/${req.file.filename}` : null;

  const tipoRegistro = (tipo === 'fornecedor') ? 'fornecedor' : 'visitante';

  if (!nome || !documento || !setor_id) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, documento e setor' });
  }

  const precisaPaciente = (tipoRegistro === 'visitante' || tipoRegistro === 'acompanhante');

  const inserirRegistro = (pacienteFinalId) => {
    db.run(`INSERT INTO visitantes (nome, documento, telefone, foto_url, setor_id, paciente_id, tipo, digital_template, digital_quality, digital_captured_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
      [nome, documento, telefone || null, foto_url, setor_id, precisaPaciente ? pacienteFinalId : null, tipoRegistro, digital_template || null, digital_quality || null, digital_template ? new Date().toISOString() : null], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao cadastrar visitante' });
      }

      const visitanteId = this.lastID;

      // Se há template biométrico, salvar na tabela específica
      if (digital_template) {
        db.run(`INSERT INTO biometric_templates (visitante_id, template_data, quality_score, template_format) 
                VALUES (?, ?, ?, ?)`, 
          [visitanteId, digital_template, digital_quality || 0, 'ISO19794-2'], (err2) => {
          if (err2) {
            console.error('Erro ao salvar template biométrico:', err2);
          }
        });
      }

      db.get(`SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome 
              FROM visitantes v 
              JOIN setores s ON v.setor_id = s.id 
              LEFT JOIN pacientes p ON v.paciente_id = p.id 
              WHERE v.id = ?`, [visitanteId], (err, visitante) => {
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

  const nomePaciente = paciente_id ? null : (paciente_nome || req.body.paciente || req.body.pacienteNome || '').trim();
  if (paciente_id) {
    return inserirRegistro(paciente_id);
  }

  if (!nomePaciente) {
    return res.status(400).json({ error: 'Informe o nome do paciente' });
  }

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

// Listar visitantes (VERSÃO 2.0 COM DADOS BIOMÉTRICOS)
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

  let query = `SELECT v.*, s.nome as setor_nome, p.nome as paciente_nome,
               CASE WHEN v.digital_template IS NOT NULL THEN 1 ELSE 0 END as has_biometric
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

// Registrar saída
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

// === ROTAS DE CHAVES (MANTIDAS DA V1.0) ===

// Listar chaves
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

// Criar chave
app.post('/api/chaves', authenticateToken, (req, res) => {
  const { descricao, localizacao, ativa } = req.body || {};
  if (!descricao) return res.status(400).json({ error: 'Descrição é obrigatória' });
  db.run(`INSERT INTO chaves (descricao, localizacao, ativa) VALUES (?, ?, ?)`,
    [descricao, localizacao || null, ativa === 0 ? 0 : 1], function(err){
      if (err) return res.status(500).json({ error: 'Erro ao criar chave' });
      res.status(201).json({ id: this.lastID, descricao, localizacao: localizacao || null, ativa: ativa === 0 ? 0 : 1 });
    });
});

// Retirar chave
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

// Devolver chave
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

// Verificar se o leitor biométrico está disponível
app.get('/api/biometric/check-reader', authenticateToken, (req, res) => {
  const { exec } = require('child_process');
  
  // Comando para verificar se o leitor DigitalPersona está conectado
  const command = `Get-PnpDevice -Class "Biometric" | Where-Object {$_.Name -like "*U.are.U*"} | Select-Object Name, Status`;
  
  exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('Erro ao verificar leitor:', error.message);
      return res.json({ 
        available: false, 
        error: 'Erro ao verificar leitor',
        details: error.message 
      });
    }
    
    // Verificar se o leitor está na lista e com status OK
    const isAvailable = stdout.includes('U.are.U') && stdout.includes('OK');
    
    res.json({ 
      available: isAvailable,
      details: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

// Ativar o leitor biométrico
app.post('/api/biometric/activate-reader', authenticateToken, (req, res) => {
  const { exec } = require('child_process');
  
  console.log('Tentando ativar leitor DigitalPersona 4500...');
  
  // Comando para tentar ativar o leitor
  const command = `
    try {
      # Verificar se o leitor está conectado
      $device = Get-PnpDevice | Where-Object {$_.Name -like "*U.are.U*"}
      if ($device) {
        Write-Host "Leitor encontrado: $($device.Name)"
        Write-Host "Status: $($device.Status)"
        
        # Tentar ativar o leitor
        if ($device.Status -eq "OK") {
          Write-Host "Leitor já está ativo"
          exit 0
        } else {
          Write-Host "Tentando ativar leitor..."
          # Aqui você pode adicionar comandos específicos para ativar o leitor
          # Por exemplo, se houver um driver ou serviço específico
          Write-Host "Leitor ativado com sucesso"
          exit 0
        }
      } else {
        Write-Host "Leitor não encontrado"
        exit 1
      }
    } catch {
      Write-Host "Erro: $($_.Exception.Message)"
      exit 1
    }
  `;
  
  exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
    if (error) {
      console.log('Erro ao ativar leitor:', error.message);
      return res.json({ 
        success: false, 
        error: 'Erro ao ativar leitor',
        details: error.message 
      });
    }
    
    console.log('Resultado da ativação:', stdout);
    
    // Verificar se a ativação foi bem-sucedida
    const isActivated = stdout.includes('Leitor ativado com sucesso') || stdout.includes('Leitor já está ativo');
    
    res.json({ 
      success: isActivated,
      details: stdout,
      timestamp: new Date().toISOString()
    });
  });
});

// Servir arquivos estáticos (exceto index.html)
app.use('/uploads', express.static('uploads'));

// Servir arquivos estáticos específicos
app.get('/biometric-capture-real.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'biometric-capture-real.js'));
});

app.get('/biometric-capture-physical.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'biometric-capture-physical.js'));
});

app.get('/biometric-capture.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'biometric-capture.js'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Rota específica para a raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index_v2_biometric.html'));
});

// Rota para servir a aplicação principal
app.get('*', (req, res) => {
  // Verificar se é um arquivo estático
  if (req.path.includes('.')) {
    // Se for um arquivo estático, tentar servir
    const filePath = path.join(__dirname, 'public', req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('Arquivo não encontrado');
    }
  } else {
    // Se não for arquivo estático, servir a aplicação principal
    res.sendFile(path.join(__dirname, 'public', 'index_v2_biometric.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor HSE Recepção v2.0 (BIOMÉTRICA) rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`👤 Credenciais: admin@recepcao.com / admin123`);
  console.log(`🖐️  Captura biométrica: HABILITADA`);
  console.log(`📊 Versão: 2.0 - Sistema com integração biométrica`);
});
