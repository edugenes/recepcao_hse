# 🚀 Guia de Deploy em Produção - Sistema de Recepção HSE

## 📋 Pré-requisitos

- **Node.js** 18.x ou superior
- **NPM** ou **Yarn**
- **Windows Server** (recomendado) ou Linux
- **Firewall** configurado para permitir a porta do servidor (padrão: 3000)

---

## 🔧 Instalação

### 1. Preparar o Ambiente

```powershell
# Navegar até o diretório do projeto
cd C:\caminho\para\recepcao_hse

# Instalar dependências
npm install --production
```

### 2. Configurar Variáveis de Ambiente

```powershell
# Copiar arquivo de exemplo
Copy-Item .env.example .env

# Editar o arquivo .env com suas configurações
notepad .env
```

**Configurações obrigatórias no `.env`:**
- `PORT`: Porta do servidor (padrão: 3000)
- `JWT_SECRET`: Chave secreta para JWT (use um valor aleatório forte!)
- `NODE_ENV`: Deve ser `production`

**Gerar JWT_SECRET seguro:**
```powershell
# No PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Inicializar Banco de Dados

```powershell
# Executar script de inicialização
node scripts/init-db.js
```

Isso criará:
- Tabelas necessárias
- Usuário admin padrão (admin@recepcao.com / admin123)
- Setores padrão do HSE

**⚠️ IMPORTANTE:** Altere a senha do admin após o primeiro login!

---

## 🚀 Executando em Produção

### Opção 1: Execução Direta (Teste)

```powershell
npm start
```

### Opção 2: Serviço Windows (Recomendado)

```powershell
# Instalar como serviço Windows
.\scripts\install-service.bat

# Iniciar serviço
net start RecepcaoHSE

# Parar serviço
net stop RecepcaoHSE
```

### Opção 3: PM2 (Node.js Process Manager)

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name recepcao-hse

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

---

## 🔒 Segurança em Produção

### 1. Alterar Senha Padrão do Admin

Após o primeiro login, acesse:
- **Configurações** → **Usuários** → **Editar Admin**
- Altere a senha padrão `admin123`

### 2. Configurar HTTPS (Recomendado)

No arquivo `.env`:
```env
HTTPS_ENABLE=true
SSL_PFX_PATH=C:\caminho\para\certificado.pfx
SSL_PFX_PASSWORD=senha_do_certificado
```

### 3. Firewall

Configure o firewall para permitir apenas a porta do servidor:
```powershell
# Permitir porta 3000 (ajuste conforme necessário)
New-NetFirewallRule -DisplayName "Recepcao HSE" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 4. Backup do Banco de Dados

Configure backup automático do arquivo `recepcao.db`:

```powershell
# Script de backup simples (agendar no Task Scheduler)
$backupPath = "C:\Backups\RecepcaoHSE"
$date = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item "recepcao.db" "$backupPath\recepcao_$date.db"
```

---

## 📊 Monitoramento

### Logs

Os logs são salvos em:
- `logs/server.out.log` - Saída padrão
- `logs/server.err.log` - Erros

### Verificar Status

```powershell
# Verificar se o servidor está rodando
Get-Process node

# Ver últimas linhas do log
Get-Content logs\server.out.log -Tail 50
```

---

## 🔄 Atualização

### 1. Fazer Backup

```powershell
# Backup do banco de dados
Copy-Item recepcao.db "backup_recepcao_$(Get-Date -Format 'yyyyMMdd').db"

# Backup dos uploads
Copy-Item uploads "backup_uploads_$(Get-Date -Format 'yyyyMMdd')" -Recurse
```

### 2. Atualizar Código

```powershell
# Parar o servidor
net stop RecepcaoHSE
# ou
pm2 stop recepcao-hse

# Atualizar código (git pull, ou copiar novos arquivos)

# Instalar novas dependências
npm install --production

# Reiniciar servidor
net start RecepcaoHSE
# ou
pm2 restart recepcao-hse
```

---

## 🐛 Troubleshooting

### Servidor não inicia

1. Verificar se a porta está livre:
```powershell
netstat -ano | findstr :3000
```

2. Verificar logs de erro:
```powershell
Get-Content logs\server.err.log -Tail 50
```

3. Verificar variáveis de ambiente:
```powershell
Get-Content .env
```

### Erro de banco de dados

1. Verificar permissões do arquivo `recepcao.db`
2. Verificar se o arquivo não está corrompido
3. Restaurar de backup se necessário

### Problemas de conexão

1. Verificar firewall
2. Verificar se o servidor está escutando na interface correta
3. Verificar logs para erros de CORS

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs em `logs/`
2. Consultar documentação em `DOCUMENTACAO_SISTEMA_RECEPCAO_HSE.md`
3. Verificar configurações em `.env`

---

## ✅ Checklist de Deploy

- [ ] Node.js instalado (versão 18+)
- [ ] Dependências instaladas (`npm install --production`)
- [ ] Arquivo `.env` configurado
- [ ] `JWT_SECRET` alterado para valor seguro
- [ ] Banco de dados inicializado
- [ ] Senha do admin alterada
- [ ] Servidor testado localmente
- [ ] Firewall configurado
- [ ] Backup configurado
- [ ] Serviço Windows instalado (ou PM2 configurado)
- [ ] HTTPS configurado (se aplicável)
- [ ] Logs sendo monitorados

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2025
