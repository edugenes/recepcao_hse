// Arquivo de configuração de exemplo
// Copie este arquivo para .env e ajuste as configurações

module.exports = {
  // Configurações do Servidor
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT Secret (ALTERE EM PRODUÇÃO!)
  JWT_SECRET: process.env.JWT_SECRET || 'recepcao_hse_jwt_secret_2024_production_change_me',
  
  // Configurações do Active Directory
  AD_SERVER: process.env.AD_SERVER || 'ldap://seu-servidor-ad.com:389',
  AD_BASE_DN: process.env.AD_BASE_DN || 'DC=empresa,DC=com',
  AD_ADMIN_GROUP: process.env.AD_ADMIN_GROUP || 'WebApp-AD-Admins',
  AD_USER_DN: process.env.AD_USER_DN || 'CN=usuario,OU=Users,DC=empresa,DC=com',
  AD_PASSWORD: process.env.AD_PASSWORD || 'senha_do_usuario_ad',
  
  // Configurações de Segurança
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT) || 86400000, // 24 horas
  
  // Configurações de Banco de Dados (para futura migração para PostgreSQL)
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || 'recepcao_hse',
  DB_USER: process.env.DB_USER || 'recepcao_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'senha_do_banco'
};


