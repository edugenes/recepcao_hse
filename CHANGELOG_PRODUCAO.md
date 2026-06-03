# Changelog - Preparação para Produção

## [1.0.0] - 2025-01-12

### ✅ Adicionado

#### Backup
- Backup completo do estado atual criado em `backup_estado_atual_20260112_110558`
- Preservação de todos os arquivos essenciais do projeto

#### Configuração
- **`.env.example`** - Template completo de configurações de produção
  - Variáveis de servidor (PORT, NODE_ENV)
  - Configurações de segurança (JWT_SECRET)
  - Suporte a HTTPS
  - Configurações opcionais de Active Directory
  - Rate limiting configurável

- **`.gitignore`** - Proteção de arquivos sensíveis
  - Exclusão de node_modules
  - Proteção de arquivos .env
  - Exclusão de logs e arquivos temporários
  - Proteção de certificados SSL
  - Exclusão de backups

#### Scripts
- **`scripts/prepare-production.ps1`** - Script automatizado de preparação
  - Verificação de pré-requisitos (Node.js)
  - Instalação de dependências de produção
  - Criação de diretórios necessários
  - Configuração automática de .env
  - Geração segura de JWT_SECRET
  - Inicialização do banco de dados
  - Verificação de porta disponível

#### Documentação
- **`README_PRODUCAO.md`** - Guia completo de deploy
  - Instruções de instalação passo a passo
  - Configuração de segurança
  - Opções de execução (direta, serviço Windows, PM2)
  - Monitoramento e logs
  - Troubleshooting
  - Checklist de deploy

- **`BACKUP_E_PRODUCAO.md`** - Resumo do processo
  - Localização do backup
  - Arquivos criados/atualizados
  - Instruções de uso
  - Próximos passos

#### Package.json
- Script `production` adicionado para execução em modo produção
- Script `postinstall` para inicialização automática do banco

### 🔒 Segurança

- Template de configurações seguras
- Geração automática de JWT_SECRET seguro
- Proteção de arquivos sensíveis no .gitignore
- Documentação de boas práticas de segurança

### 📦 Estrutura

- Organização clara de arquivos de produção
- Separação entre desenvolvimento e produção
- Backup preservado para referência futura

---

## [1.0.1] - 2026-06-03

### Corrigido

#### Segurança Crítica
- **init-db.js**: Removidos `DELETE FROM pacientes` e `DELETE FROM setores` que eram executados a cada `npm install`, destruindo todos os dados de pacientes e setores existentes em produção
- **server.js**: `JWT_SECRET` fraco ou padrão agora causa erro e impede a inicialização em `NODE_ENV=production`; em desenvolvimento emite aviso
- **server.js**: Senha do administrador não é mais redefinida para `admin123` a cada restart do servidor — alterações de senha feitas pela interface são preservadas
- **server.js**: Credenciais padrão (`admin@recepcao.com / admin123`) removidas dos logs de inicialização

#### Caminhos e Arquivos
- **server.js**: Caminhos relativos (`'uploads/'`, `'recepcao.db'`, `'public'`) substituídos por caminhos absolutos usando `__dirname`, garantindo funcionamento correto independente do diretório de trabalho ao iniciar o servidor
- **server.js**: Upload de arquivos agora valida tipo MIME (somente imagens) e limita tamanho a 5 MB; nome de arquivo sanitizado para evitar caracteres especiais

#### Configuração
- **package.json**: Script `production` corrigido para Windows (`set NODE_ENV=production&& node server.js`) — o formato anterior (`NODE_ENV=...`) era incompatível com PowerShell/cmd
- **package.json**: Dependências `ldapts` e `ws` removidas (módulos de integração AD e biometria descontinuados, nunca utilizados no código ativo)
- **package.json**: Dependências `jspdf`, `jspdf-autotable` e `chart.js` removidas — são carregadas via CDN no frontend, não pertencem ao backend
- **package.json**: `sqlite3` atualizado para versão mais recente, corrigindo 7 vulnerabilidades de segurança (2 baixas, 5 altas); resultado: **0 vulnerabilidades** no `npm audit`
- **server.js**: CORS agora configurável via variável de ambiente `CORS_ORIGIN` (lista de origens separadas por vírgula); padrão: qualquer origem (compatível com rede intranet fechada)
- **server.js**: Senha e e-mail do admin configuráveis via `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`
- **.env.example**: Criado com documentação de todas as variáveis de ambiente suportadas
- **.env**: Atualizado com as novas variáveis `CORS_ORIGIN`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`

---

## Próximas Versões Planejadas

### [1.1.0] - Planejado
- [ ] Suporte a PostgreSQL
- [ ] Sistema de backup automático integrado
- [ ] Dashboard de monitoramento
- [ ] Integração com Active Directory completa

### [1.2.0] - Planejado
- [ ] API RESTful melhorada
- [ ] Testes automatizados
- [ ] Docker para deploy
- [ ] CI/CD pipeline

---

**Nota:** Este changelog documenta as mudanças feitas na preparação para produção. O backup do estado anterior está disponível em `backup_estado_atual_20260112_110558`.
