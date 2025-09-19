# 🏥 Sistema de Recepção HSE v1.0

## 📋 **APLICATIVO WINDOWS SIMPLES E FUNCIONAL**

Sistema de recepção de visitantes para hospitais - **Aplicativo Windows nativo**.

---

## ✨ **FUNCIONALIDADES**

### **✅ Sistema Completo**
- 🖥️ **Aplicativo Windows nativo** (.exe)
- 📊 **Dashboard** com estatísticas em tempo real
- 📝 **Cadastro completo** de visitantes
- 💾 **Banco SQLite** integrado
- 🎨 **Interface moderna** e responsiva

### **✅ Funcionalidades Principais**
- 👥 **Cadastro de visitantes** com dados completos
- 🏥 **Gestão de setores** (UTI, Emergência, Cirurgia, etc.)
- 📊 **Dashboard** com estatísticas
- 📋 **Lista de visitantes** cadastrados
- 🔒 **Sistema seguro** com confirmação de saída

---

## 🚀 **INSTALAÇÃO E EXECUÇÃO**

### **Instalação Automática**
```bash
# Execute o arquivo:
install.bat
```

### **Instalação Manual**
```bash
# 1. Instalar dependências
npm install

# 2. Executar aplicativo
npm start
```

---

## 🏗️ **ARQUITETURA**

```
📁 recepcao-app/
├── 📄 main.js                    # Processo principal Electron
├── 📄 preload.js                 # Comunicação segura
├── 📄 index.html                 # Interface principal
├── 📄 app.js                     # Lógica da aplicação
├── 📄 package.json               # Configurações
├── 📄 install.bat                # Script de instalação
└── 📄 README.md                  # Documentação
```

---

## 📊 **BANCO DE DADOS**

### **Tabelas Criadas Automaticamente**
- `visitantes` - Dados dos visitantes
- `setores` - Setores do hospital

### **Dados Iniciais**
- ✅ **Setores padrão** inseridos (UTI, Emergência, Cirurgia, etc.)
- ✅ **Banco SQLite** criado automaticamente

---

## 🎨 **INTERFACE**

### **Dashboard**
- 📊 **3 cartões** com estatísticas
- 📈 **Visitantes hoje**
- 👥 **Visitantes ativos**
- 🏥 **Total de setores**

### **Cadastro de Visitantes**
- 📝 **Formulário completo**
- 🏥 **Seleção de setor**
- 👤 **Dados do paciente**
- 💾 **Salvamento automático**

### **Lista de Visitantes**
- 📋 **Tabela responsiva**
- 🔍 **Últimos 10 visitantes**
- 📅 **Data e hora de entrada**
- 🟢 **Status do visitante**

---

## 🔧 **CONFIGURAÇÃO**

### **Requisitos**
- ✅ **Node.js** (versão 16 ou superior)
- ✅ **Windows** 10/11
- ✅ **Electron** (instalado automaticamente)

---

## 📱 **USO**

### **1. Iniciar Aplicativo**
- Executar `install.bat`
- Aguardar inicialização completa
- Interface carrega automaticamente

### **2. Cadastrar Visitante**
- Preencher dados básicos
- Selecionar setor
- Clicar em "Cadastrar Visitante"
- Confirmar cadastro

### **3. Dashboard**
- Visualizar estatísticas
- Monitorar visitantes
- Acompanhar setores

---

## 🔒 **SEGURANÇA**

- ✅ **Context Isolation** habilitado
- ✅ **Node Integration** desabilitado
- ✅ **Confirmação de saída** implementada
- ✅ **Dados locais** seguros

---

## 🐛 **TROUBLESHOOTING**

### **Erro de instalação**
1. Verificar Node.js instalado
2. Executar como administrador
3. Verificar conexão com internet

### **Aplicativo não abre**
1. Verificar dependências instaladas
2. Executar `npm install` novamente
3. Verificar logs no console

---

## 📈 **ROADMAP**

### **v1.1 - Próximas Funcionalidades**
- [ ] Relatórios PDF
- [ ] Backup automático
- [ ] Múltiplos usuários
- [ ] Logs de auditoria

### **v1.2 - Melhorias**
- [ ] Interface dark mode
- [ ] Notificações
- [ ] Sincronização remota
- [ ] API REST

---

## 🤝 **CONTRIBUIÇÃO**

1. Fork o projeto
2. Criar branch para feature
3. Commit mudanças
4. Push para branch
5. Abrir Pull Request

---

## 📄 **LICENÇA**

Este projeto está licenciado sob a Licença MIT.

---

## 📞 **SUPORTE**

- 📧 Email: suporte@hse.com.br
- 📱 WhatsApp: (11) 99999-9999
- 🌐 Website: https://hse.com.br

---

**🎉 Sistema de Recepção HSE v1.0 - Aplicativo Windows Simples e Funcional**
