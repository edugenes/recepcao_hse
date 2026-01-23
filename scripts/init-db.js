const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === `--${name}` && typeof args[i + 1] !== 'undefined') {
      return args[i + 1];
    }
    if (arg.startsWith(`--${name}=`)) {
      return arg.split('=')[1];
    }
  }
  return defaultValue;
}

const dbPath = path.resolve(getArg('db', './recepcao.db'));
const adminLogin = getArg('admin-login', 'admin');
const adminEmail = getArg('admin-email', 'admin@recepcao.com');
const adminPassword = getArg('admin-password', 'admin123');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  await run(`CREATE TABLE IF NOT EXISTS setores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL
  )`);

  await run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_setores_nome ON setores(nome)`);

  await run(`CREATE TABLE IF NOT EXISTS pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    setor_id INTEGER,
    FOREIGN KEY (setor_id) REFERENCES setores (id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS visitantes (
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

  const visitantesCols = await all(`PRAGMA table_info(visitantes)`);
  const visitantesColNames = visitantesCols.map(c => c.name);
  if (!visitantesColNames.includes('status')) {
    await run(`ALTER TABLE visitantes ADD COLUMN status TEXT DEFAULT 'dentro'`);
  }
  if (!visitantesColNames.includes('usuario_id')) {
    await run(`ALTER TABLE visitantes ADD COLUMN usuario_id INTEGER`);
  }

  await run('DELETE FROM pacientes');
  await run('DELETE FROM setores');

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

  for (const nome of setores) {
    await run(`INSERT OR IGNORE INTO setores (nome) VALUES (?)`, [nome]);
  }

  await run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    username TEXT UNIQUE
  )`);

  const usuariosCols = await all(`PRAGMA table_info(usuarios)`);
  const usuariosColNames = usuariosCols.map(c => c.name);
  if (!usuariosColNames.includes('role')) {
    await run(`ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'user'`);
  }
  if (!usuariosColNames.includes('username')) {
    await run(`ALTER TABLE usuarios ADD COLUMN username TEXT UNIQUE`);
  }

  const senhaHash = bcrypt.hashSync(adminPassword, 10);
  await run(`INSERT OR IGNORE INTO usuarios (id, nome, email, senha, role, username) VALUES (1, ?, ?, ?, ?, ?)`,
    ['Admin', adminEmail, senhaHash, 'admin', adminLogin]);
  await run(`UPDATE usuarios SET role='admin', username=?, senha=? WHERE id=1 OR email=?`,
    [adminLogin, senhaHash, adminEmail]);
}

main()
  .then(() => {
    db.close(() => {
      console.log('Banco preparado com sucesso.');
    });
  })
  .catch((err) => {
    console.error('Falha ao preparar banco:', err && err.message ? err.message : err);
    db.close(() => process.exit(1));
  });
