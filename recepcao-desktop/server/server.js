const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false // Desabilitado para Electron
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// Inicializar banco de dados
const dbPath = path.join(__dirname, '..', 'data', 'recepcao.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar com banco de dados:', err.message);
    } else {
        console.log('✅ Conectado ao banco de dados SQLite');
        initializeDatabase();
    }
});

// Inicializar tabelas
function initializeDatabase() {
    // Tabela de visitantes
    db.run(`
        CREATE TABLE IF NOT EXISTS visitantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cpf TEXT,
            setor TEXT NOT NULL,
            paciente TEXT NOT NULL,
            foto TEXT,
            digital_template TEXT,
            digital_quality INTEGER,
            data_entrada DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_saida DATETIME,
            status TEXT DEFAULT 'ativo'
        )
    `);

    // Tabela de setores
    db.run(`
        CREATE TABLE IF NOT EXISTS setores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL,
            descricao TEXT,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, () => {
        // Inserir setores padrão
        const setores = [
            'UTI', 'Emergência', 'Cirurgia', 'Cardiologia', 
            'Neurologia', 'Pediatria', 'Oncologia', 'Outros'
        ];
        
        setores.forEach(setor => {
            db.run('INSERT OR IGNORE INTO setores (nome) VALUES (?)', [setor]);
        });
    });

    // Tabela de chaves
    db.run(`
        CREATE TABLE IF NOT EXISTS chaves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT UNIQUE NOT NULL,
            descricao TEXT,
            setor TEXT,
            status TEXT DEFAULT 'disponivel',
            visitante_id INTEGER,
            data_emprestimo DATETIME,
            data_devolucao DATETIME,
            FOREIGN KEY (visitante_id) REFERENCES visitantes (id)
        )
    `);

    // Tabela de templates biométricos
    db.run(`
        CREATE TABLE IF NOT EXISTS biometric_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitante_id INTEGER,
            template_data TEXT NOT NULL,
            quality_score INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (visitante_id) REFERENCES visitantes (id)
        )
    `);

    console.log('📊 Tabelas do banco de dados inicializadas');
}

// Rotas da API

// Dashboard - Estatísticas
app.get('/api/dashboard', (req, res) => {
    const queries = {
        visitantesHoje: `
            SELECT COUNT(*) as count FROM visitantes 
            WHERE DATE(data_entrada) = DATE('now') AND status = 'ativo'
        `,
        chavesEmprestadas: `
            SELECT COUNT(*) as count FROM chaves 
            WHERE status = 'emprestada'
        `,
        digitaisCapturadas: `
            SELECT COUNT(*) as count FROM biometric_templates 
            WHERE DATE(created_at) = DATE('now')
        `
    };

    const results = {};
    let completed = 0;
    const total = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.get(query, (err, row) => {
            if (err) {
                console.error(`❌ Erro na query ${key}:`, err);
                results[key] = 0;
            } else {
                results[key] = row.count;
            }
            
            completed++;
            if (completed === total) {
                res.json(results);
            }
        });
    });
});

// Listar visitantes
app.get('/api/visitantes', (req, res) => {
    const query = `
        SELECT v.*, s.descricao as setor_descricao 
        FROM visitantes v 
        LEFT JOIN setores s ON v.setor = s.nome 
        ORDER BY v.data_entrada DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar visitantes:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            res.json(rows);
        }
    });
});

// Cadastrar visitante
app.post('/api/visitantes', (req, res) => {
    const { nome, cpf, setor, paciente, foto, digital_template, digital_quality } = req.body;
    
    const query = `
        INSERT INTO visitantes (nome, cpf, setor, paciente, foto, digital_template, digital_quality)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [nome, cpf, setor, paciente, foto, digital_template, digital_quality], function(err) {
        if (err) {
            console.error('❌ Erro ao cadastrar visitante:', err);
            res.status(500).json({ error: 'Erro ao cadastrar visitante' });
        } else {
            const visitanteId = this.lastID;
            
            // Salvar template biométrico se fornecido
            if (digital_template) {
                const biometricQuery = `
                    INSERT INTO biometric_templates (visitante_id, template_data, quality_score)
                    VALUES (?, ?, ?)
                `;
                db.run(biometricQuery, [visitanteId, digital_template, digital_quality || 0]);
            }
            
            res.json({ 
                success: true, 
                id: visitanteId, 
                message: 'Visitante cadastrado com sucesso!' 
            });
        }
    });
});

// Listar setores
app.get('/api/setores', (req, res) => {
    db.all('SELECT * FROM setores WHERE ativo = 1 ORDER BY nome', (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar setores:', err);
            res.status(500).json({ error: 'Erro interno do servidor' });
        } else {
            res.json(rows);
        }
    });
});

// Verificar leitor biométrico
app.get('/api/biometric/check-reader', (req, res) => {
    // Simular verificação (será substituído pelo SDK real)
    setTimeout(() => {
        res.json({
            success: true,
            detected: true,
            message: 'Leitor DigitalPersona 4500 detectado!',
            device: {
                name: 'DigitalPersona 4500',
                status: 'connected',
                driver: 'installed'
            }
        });
    }, 1000);
});

// Capturar impressão digital
app.post('/api/biometric/capture', (req, res) => {
    // Simular captura (será substituído pelo SDK real)
    setTimeout(() => {
        res.json({
            success: true,
            template: 'simulated_template_' + Date.now(),
            quality: 95,
            message: 'Captura biométrica realizada com sucesso!'
        });
    }, 2000);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        platform: process.platform
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor HSE Recepção Desktop v3.0 rodando na porta ${PORT}`);
    console.log(`📱 API disponível em: http://localhost:${PORT}/api`);
    console.log(`🖐️ Captura biométrica: HABILITADA`);
    console.log(`📊 Versão: 3.0 - Aplicativo Desktop com DigitalPersona`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Finalizando servidor...');
    db.close((err) => {
        if (err) {
            console.error('❌ Erro ao fechar banco de dados:', err.message);
        } else {
            console.log('✅ Banco de dados fechado');
        }
        process.exit(0);
    });
});

module.exports = app;
