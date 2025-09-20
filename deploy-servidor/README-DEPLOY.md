# 🚀 Deploy do Sistema HSE no Servidor

## 📋 **Instalação no Servidor**

### **Requisitos do Servidor:**
- **Windows Server 2016+** ou **Windows 10/11**
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Acesso de administrador**
- **Porta 3000 liberada** no firewall

---

## 🛠️ **Passo a Passo da Instalação:**

### **1. Preparar o Servidor:**
```bash
# Copie toda a pasta do projeto para o servidor
# Exemplo: C:\SistemaHSE\
```

### **2. Executar Instalação:**
```bash
# Execute como administrador:
deploy-servidor\install-servidor.bat
```

### **3. Configurar Rede:**
```bash
# Execute como administrador:
deploy-servidor\configurar-rede.bat
```

---

## 🌐 **Configuração de Acesso:**

### **Acesso Local:**
- **URL:** `http://localhost:3000`
- **Credenciais:** `admin@recepcao.com` / `admin123`

### **Acesso das Recepções:**
- **URL:** `http://[IP_DO_SERVIDOR]:3000`
- **Exemplo:** `http://192.168.1.100:3000`

---

## 📊 **Gerenciamento do Servidor:**

### **Comandos PM2:**
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Reiniciar
pm2 restart recepcao-hse

# Parar
pm2 stop recepcao-hse

# Iniciar
pm2 start recepcao-hse

# Monitorar
pm2 monit
```

### **Logs do Sistema:**
- **Erros:** `logs/err.log`
- **Saída:** `logs/out.log`
- **Combinado:** `logs/combined.log`

---

## 🔧 **Configurações Avançadas:**

### **Alterar Porta:**
1. Edite `ecosystem.config.js`
2. Mude `PORT: 3000` para a porta desejada
3. Execute `pm2 restart recepcao-hse`

### **Backup do Banco:**
```bash
# Backup automático (criar script)
copy recepcao.db backup\recepcao_%date%.db
```

### **Atualização:**
```bash
# Parar servidor
pm2 stop recepcao-hse

# Fazer backup
copy recepcao.db recepcao_backup.db

# Atualizar arquivos
# (copiar novos arquivos)

# Reiniciar
pm2 start recepcao-hse
```

---

## 🚨 **Troubleshooting:**

### **Servidor não inicia:**
```bash
# Verificar logs
pm2 logs recepcao-hse

# Verificar porta
netstat -an | findstr 3000
```

### **Acesso externo não funciona:**
```bash
# Verificar firewall
netsh advfirewall firewall show rule name="Sistema HSE"

# Verificar IP
ipconfig
```

### **Reiniciar tudo:**
```bash
pm2 delete recepcao-hse
pm2 start ecosystem.config.js
```

---

## 📱 **Acesso das Recepções:**

### **Configuração nas Recepções:**
1. **Abrir navegador**
2. **Digitar:** `http://[IP_DO_SERVIDOR]:3000`
3. **Fazer login** com as credenciais
4. **Usar normalmente**

### **Exemplo de URLs:**
- **Servidor local:** `http://192.168.1.100:3000`
- **Servidor remoto:** `http://servidor-empresa.com:3000`
- **IP público:** `http://200.100.50.25:3000`

---

## 🎯 **Vantagens do Deploy:**

### **✅ Centralizado:**
- **Um servidor** para todas as recepções
- **Dados centralizados** em um local
- **Backup único** e seguro

### **✅ 24/7:**
- **Sempre disponível** via PM2
- **Reinício automático** em caso de falha
- **Monitoramento** contínuo

### **✅ Escalável:**
- **Múltiplas recepções** simultâneas
- **Sem limite** de usuários
- **Performance otimizada**

---

## 🎉 **Resultado Final:**

**✅ Servidor rodando 24/7**
**✅ Todas as recepções acessando**
**✅ Dados centralizados**
**✅ Sistema estável e confiável**

**Perfeito para uso em produção!** 🚀


