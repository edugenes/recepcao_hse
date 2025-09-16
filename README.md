# 🏥 Sistema de Recepção de Visitantes

Sistema web para controle de entrada e saída de visitantes em hospitais, clínicas e instituições de saúde.

## 🚀 Funcionalidades

### MVP (Versão Atual)
- ✅ Cadastro de visitantes com dados pessoais
- ✅ Seleção de setor de destino
- ✅ Seleção de paciente a ser visitado
- ✅ Captura de foto via webcam
- ✅ Registro automático de horário de entrada
- ✅ Listagem de visitantes ativos
- ✅ Registro de saída com horário
- ✅ Interface responsiva e moderna

### Próximas Versões
- 📊 Dashboard com estatísticas
- 📋 Histórico completo de visitas
- 📄 Relatórios em PDF/CSV
- 🏷️ Impressão de crachás com QR Code
- 🔔 Notificações para setores
- 📅 Agendamento de visitas

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** com Express
- **SQLite** para banco de dados
- **Multer** para upload de imagens
- **JWT** para autenticação
- **bcryptjs** para hash de senhas

### Frontend
- **React** 18
- **TailwindCSS** para estilização
- **React Router** para navegação
- **Axios** para requisições HTTP
- **React Webcam** para captura de fotos

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Navegador web moderno com suporte a WebRTC

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd recepcao-visitantes
```

### 2. Instale as dependências do backend
```bash
npm install
```

### 3. (Front embutido)
O frontend está embutido em `public/index.html` e servido pelo Express. Não há `client/` separado.

### 4. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
PORT=3000
JWT_SECRET=altere_este_valor_em_producao
NODE_ENV=development
```

## 🚀 Executando o Sistema

### Desenvolvimento

1. **Inicie o servidor:**
```bash
npm run dev
```

2. **Acesse a aplicação:**
- Aplicação: http://localhost:3000
- API: http://localhost:3000

### Produção

1. **Inicie o servidor:**
```bash
npm start
```

## 👤 Credenciais Padrão

- **Email:** admin@recepcao.com
- **Senha:** admin123

## 📁 Estrutura do Projeto

```
recepcao-visitantes/
├── client/                 # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── services/      # Serviços e API
│   │   └── utils/         # Utilitários
│   └── package.json
├── uploads/               # Fotos dos visitantes
├── server.js             # Servidor Express
├── package.json          # Dependências do backend
└── README.md
```

## 🗄️ Banco de Dados

O sistema utiliza SQLite com as seguintes tabelas:

- **setores** - Setores da instituição
- **pacientes** - Pacientes internados
- **visitantes** - Registro de visitantes
- **usuarios** - Usuários do sistema (recepcionistas)

## 🔐 Segurança

- Autenticação JWT
- Hash de senhas com bcrypt
- Validação de dados no backend
- Upload seguro de imagens
- CORS configurado

## 📱 Responsividade

A interface é totalmente responsiva e funciona em:
- 💻 Desktop
- 📱 Tablets
- 📱 Smartphones

## 🎯 Como Usar

### 1. Login
- Acesse o sistema com as credenciais padrão
- Altere a senha padrão em produção

### 2. Cadastrar Visitante
- Clique em "Cadastrar Visitante"
- Preencha os dados pessoais
- Selecione o setor e paciente
- Capture uma foto via webcam
- Confirme o cadastro

### 3. Gerenciar Visitantes
- Visualize visitantes ativos
- Registre saídas
- Consulte histórico completo

## 🚧 Próximos Passos

1. **Configurar banco PostgreSQL** para produção
2. **Implementar relatórios** em PDF/CSV
3. **Adicionar impressão** de crachás
4. **Criar dashboard** com estatísticas
5. **Implementar notificações** para setores

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte ou dúvidas, entre em contato através dos issues do GitHub.

---

**Desenvolvido com ❤️ para melhorar o controle de visitantes em instituições de saúde.**

