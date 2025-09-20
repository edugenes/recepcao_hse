# 🚀 Como Executar o Sistema de Recepção HSE

## 📋 **Opções de Execução**

### **Opção 1: Arquivo Batch (Mais Simples)**
1. **Clique duplo** em `executar-projeto.bat`
2. O sistema irá:
   - Verificar se o Node.js está instalado
   - Instalar dependências automaticamente
   - Iniciar o servidor
   - Abrir no navegador

### **Opção 2: PowerShell (Mais Avançado)**
1. **Clique duplo** em `executar-projeto.ps1`
2. O sistema irá:
   - Verificar Node.js
   - Instalar dependências
   - Verificar e liberar porta 3000 se necessário
   - Iniciar servidor
   - Abrir navegador automaticamente

### **Opção 3: Manual (Terminal)**
```bash
# Instalar dependências (primeira vez)
npm install

# Executar servidor
node server.js
```

## 🌐 **Acesso ao Sistema**
- **URL:** http://localhost:3000
- **Porta:** 3000
- **Interface:** Web responsiva

## ⚠️ **Requisitos**
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Windows 10/11**
- **Porta 3000** disponível

## 🛠️ **Solução de Problemas**

### **Erro: "Node.js não encontrado"**
- Instale o Node.js em: https://nodejs.org/
- Reinicie o terminal

### **Erro: "Porta 3000 em uso"**
- O PowerShell tentará liberar automaticamente
- Ou feche outros programas usando a porta 3000

### **Erro: "Dependências não instaladas"**
- Execute: `npm install`
- Ou use os arquivos de execução automática

## 📱 **Funcionalidades**
- ✅ Cadastro de visitantes
- ✅ Captura de foto
- ✅ Gerenciamento de setores
- ✅ Relatórios
- ✅ Interface responsiva
- ✅ Banco de dados SQLite

## 🎯 **Pronto para Usar!**
Basta executar um dos arquivos e o sistema estará funcionando! 🚀
