# 🖥️ Sistema de Recepção HSE v3.0 - Desktop App

## 🎯 **Descrição**

Aplicativo Windows nativo para sistema de recepção de visitantes com integração biométrica DigitalPersona 4500.

## ✨ **Funcionalidades**

### **✅ Sistema de Recepção**
- 📝 Cadastro completo de visitantes
- 🏢 Gestão de setores e pacientes
- 📸 Captura de fotos
- 🔑 Controle de chaves
- 📊 Dashboard com estatísticas

### **✅ Integração Biométrica**
- 🖐️ Captura de impressão digital real
- 🔒 Armazenamento seguro de templates
- ✅ Verificação de identidade
- 📈 Indicadores de qualidade

### **✅ Interface Moderna**
- 🎨 Design responsivo e intuitivo
- ⚡ Performance nativa Windows
- 🔄 Sincronização em tempo real
- 💾 Modo offline funcional

## 🚀 **Instalação**

### **Pré-requisitos**
- Windows 10/11
- Node.js 18+ 
- DigitalPersona 4500 conectado
- Drivers do DigitalPersona instalados

### **Instalação Rápida**
```bash
# 1. Clonar repositório
git clone https://github.com/edugenes/recepcao_hse.git
cd recepcao_hse

# 2. Instalar dependências
npm install

# 3. Executar aplicativo
npm start
```

### **Build para Produção**
```bash
# Gerar executável
npm run build

# Instalador Windows (.exe)
npm run dist
```

## 🏗️ **Arquitetura**

```
📁 recepcao-desktop/
├── 📄 main.js              # Processo principal Electron
├── 📄 preload.js           # Script de preload seguro
├── 📁 renderer/            # Interface do usuário
│   ├── 📄 index.html       # Interface principal
│   └── 📄 app.js           # Lógica da interface
├── 📁 server/              # Backend API
│   ├── 📄 server.js        # Servidor Express
│   └── 📁 data/            # Banco de dados SQLite
├── 📁 assets/              # Recursos (ícones, etc.)
└── 📄 package.json         # Configurações do projeto
```

## 🔧 **Configuração**

### **Variáveis de Ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
NODE_ENV=production
PORT=3000
DB_PATH=./data/recepcao.db
BIOMETRIC_ENABLED=true
```

### **Configuração do DigitalPersona**
1. Instalar drivers do DigitalPersona 4500
2. Conectar o leitor via USB
3. Verificar detecção no Windows
4. Testar captura no aplicativo

## 📱 **Uso**

### **1. Iniciar Aplicativo**
- Executar `npm start` ou clicar no ícone
- Aguardar inicialização do servidor
- Verificar conexão do leitor biométrico

### **2. Cadastrar Visitante**
- Preencher dados básicos (nome, CPF, setor, paciente)
- Clicar em "Capturar Digital"
- Posicionar dedo no leitor DigitalPersona
- Confirmar captura ou pular
- Salvar cadastro

### **3. Dashboard**
- Visualizar estatísticas em tempo real
- Monitorar visitantes do dia
- Acompanhar chaves emprestadas
- Ver taxa de sucesso biométrica

## 🖐️ **Integração DigitalPersona**

### **SDK Integration**
```javascript
// Exemplo de captura biométrica
const result = await window.electronAPI.captureBiometric({
    quality: 95,
    timeout: 10000
});

if (result.success) {
    console.log('Template capturado:', result.template);
}
```

### **Verificação de Leitor**
```javascript
// Verificar status do leitor
const status = await window.electronAPI.checkReader();
console.log('Leitor detectado:', status.detected);
```

## 🔒 **Segurança**

- ✅ **Context Isolation** habilitado
- ✅ **Node Integration** desabilitado
- ✅ **CSP** configurado
- ✅ **Rate Limiting** implementado
- ✅ **Helmet** para headers seguros
- ✅ **Templates biométricos** criptografados

## 📊 **Banco de Dados**

### **Tabelas Principais**
- `visitantes` - Dados dos visitantes
- `setores` - Setores do hospital
- `chaves` - Controle de chaves
- `biometric_templates` - Templates biométricos

### **Backup**
```bash
# Backup automático
cp data/recepcao.db backup/recepcao_$(date +%Y%m%d).db
```

## 🐛 **Troubleshooting**

### **Leitor não detectado**
1. Verificar conexão USB
2. Instalar drivers atualizados
3. Reiniciar aplicativo
4. Verificar permissões

### **Erro de captura**
1. Limpar sensor do leitor
2. Verificar posicionamento do dedo
3. Testar com dedo diferente
4. Verificar qualidade da impressão

### **Performance lenta**
1. Fechar outros aplicativos
2. Verificar recursos do sistema
3. Atualizar drivers
4. Reiniciar aplicativo

## 📈 **Roadmap**

### **v3.1 - Próximas Funcionalidades**
- [ ] Relatórios PDF/Excel
- [ ] Sincronização com servidor remoto
- [ ] Backup automático
- [ ] Notificações push

### **v3.2 - Melhorias**
- [ ] Interface dark mode
- [ ] Múltiplos leitores
- [ ] API REST completa
- [ ] Logs de auditoria

## 🤝 **Contribuição**

1. Fork o projeto
2. Criar branch para feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📄 **Licença**

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 **Suporte**

- 📧 Email: suporte@hse.com.br
- 📱 WhatsApp: (11) 99999-9999
- 🌐 Website: https://hse.com.br
- 📚 Documentação: https://docs.hse.com.br

---

**🎉 Sistema de Recepção HSE v3.0 - Desktop App com DigitalPersona 4500**
