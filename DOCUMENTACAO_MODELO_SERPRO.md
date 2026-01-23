---
title: "Documentação Técnica - Sistema de Recepção HSE"
author:
  - "Eduardo Genes Vieira"
institute:
  - "Hospital dos Servidores de Pernambuco"
  - "Setor de Tecnologia da Informação"
date: "2025"
lang: "pt-BR"
toc: true
toc-depth: 3
geometry: "a4paper,margin=3cm"
fontsize: 12pt
---

## 1. Visão Geral

O **Sistema de Recepção HSE** é uma aplicação web utilizada para controle de visitantes, gestão de pacientes/setores, controle de chaves físicas e apoio às rotinas de hotelaria (enfermarias, leitos e checklists de limpeza) do Hospital do Servidor do Estado.  

Principais objetivos:
- Registrar e acompanhar **entrada e saída de visitantes**, fornecedores e acompanhantes.
- Manter cadastro de **setores** e **pacientes** associados às visitas.
- Controlar a **movimentação de chaves físicas** (quem retirou, quando e quando devolveu).
- Apoiar a **hotelaria** com cadastro de enfermarias, leitos e checklists por leito.
- Oferecer uma interface única, simples e responsiva para uso em recepção e hotelaria.

O sistema opera em ambiente interno (rede do hospital), com backend em **Node.js/Express** e banco de dados **SQLite**.

---

## 2. Arquitetura e Funcionamento

### 2.1 Componentes Principais

| Componente         | Função                                                                                  |
|--------------------|-----------------------------------------------------------------------------------------|
| Node.js + Express  | Servidor HTTP principal, API REST e roteamento.                                        |
| SQLite             | Banco de dados local para visitantes, usuários, chaves, setores, hotelaria etc.       |
| Frontend HTML/JS   | Interface web única (`public/index_old.html`) servida diretamente pelo Express.       |
| JWT (jsonwebtoken) | Autenticação baseada em token para proteger rotas administrativas e de hotelaria.      |
| Multer             | Upload e armazenamento de fotos de visitantes.                                         |
| Helmet / Headers   | Endurecimento básico de segurança HTTP (XSS, framing, content-type, CSP).              |
| Express-rate-limit | Limitação de requisições por IP para reduzir risco de abuso / força bruta.            |
| Scripts PowerShell | Automação de instalação, seed de banco, criação de serviço Windows e start/stop.      |

### 2.2 Fluxo de Execução

1. O servidor Node.js é iniciado (`npm start` ou `scripts/start-server.bat`) e expõe a aplicação em `http://<host>:PORT`.
2. O navegador acessa a página principal (`/`, servindo `public/index_old.html`).
3. Usuário faz login:
   - Envia credenciais para `POST /api/login`.
   - Backend valida usuário na tabela `usuarios` e retorna um JWT.
   - Token e perfil do usuário são armazenados no `localStorage`.
4. A partir do JWT, a interface libera as seções permitidas:
   - **Admin Geral (admin)**: vê e gerencia todos os módulos (visitantes, usuários, chaves, hotelaria).
   - **Usuário (user)**: operações de recepção/visitantes e consultas permitidas.
   - **Admin Hotelaria (hotelaria_gestor)** / **Colab Hotelaria (hotelaria_colab)**: acesso focado na hotelaria.
5. As ações do usuário (cadastrar visitante, registrar saída, cadastrar chave, registrar checklist, etc.) chamam a API:
   - A API realiza validações, persiste dados no SQLite e retorna o resultado.
6. Fotos de visitantes são recebidas via `multer` e gravadas em `./uploads`, com referência no banco.
7. Funcionalidades de hotelaria utilizam as tabelas `setores`, `enfermarias`, `leitos` e `hotelaria_checklists` para organizar os registros.
8. Logs básicos (mensagens de inicialização, erros de schema, etc.) são emitidos no console/serviço do Node.

---

## 3. Estrutura de Diretórios

```txt
recepcao_hse/
├── server.js                         # Servidor Express principal
├── package.json                      # Dependências e scripts NPM
├── package-lock.json
├── recepcao.db                       # Banco SQLite (produção)
├── DOCUMENTACAO_SISTEMA_RECEPCAO_HSE.md
├── DOCUMENTACAO_MODELO_SERPRO.md     # ESTE DOCUMENTO
├── BACKUP_E_PRODUCAO.md
├── README_PRODUCAO.md
├── CHANGELOG_PRODUCAO.md
├── public/
│   ├── index_old.html                # Interface principal (SPA tradicional)
│   ├── dashboard.html                # Dashboard (estatísticas, opcional)
│   └── vendor/                       # Libs JS (Chart.js, jsPDF, QRCode, etc.)
├── uploads/
│   ├── hse-logo.png
│   └── <timestamp>-foto.jpg          # Fotos de visitantes
├── scripts/
│   ├── init-db.js                    # Seed / migrações iniciais para o banco
│   ├── start-server.bat              # Inicia servidor como processo em background
│   ├── stop-server.bat               # Para servidor
│   ├── install-service.bat           # Instala como serviço Windows (via nssm)
│   ├── uninstall-service.bat         # Remove serviço Windows
│   ├── post-install.ps1              # Gera .env e inicializa banco (instalador)
│   └── prepare-production.ps1        # Script de preparação para produção
├── installer/                        # Arquivos do instalador Windows (Inno Setup)
└── cleanup_backup_*/                 # Backups de versões anteriores / biometria
```

---

## 4. Tecnologias Utilizadas

| Camada            | Tecnologia          | Função                                               |
|-------------------|---------------------|------------------------------------------------------|
| Backend           | Node.js + Express   | API REST e servidor HTTP estático                    |
| Banco de Dados    | SQLite              | Persistência local (arquivo `recepcao.db`)           |
| Autenticação      | JWT (jsonwebtoken)  | Tokens de acesso (24h)                               |
| Segurança HTTP    | Headers + helmet    | X-Content-Type-Options, X-Frame-Options, CSP etc.    |
| Rate Limiting     | express-rate-limit  | Proteção contra abuso / força bruta                  |
| Uploads           | multer              | Upload e armazenamento de fotos                      |
| Frontend          | HTML5/CSS3/JS       | Interface única responsiva                           |
| Gráficos          | Chart.js            | Dashboard e estatísticas visuais                     |
| Relatórios        | jsPDF + Autotable   | Geração de PDFs (relatórios, guias)                 |
| Scripts Windows   | PowerShell / BAT    | Instalação, start/stop e serviço Windows             |

---

## 5. Medidas de Segurança Adotadas

- **JWT**:
  - Token assinado com `JWT_SECRET` configurado em `.env`.
  - Expiração padrão de 24h.
- **Perfis de acesso (roles)**:
  - `admin` (Admin Geral): acesso total, inclusive gestão de usuários.
  - `user` (Usuário): funções operacionais.
  - `hotelaria_gestor` (Admin Hotelaria): gestão de setores/enfermarias/leitos/checklists.
  - `hotelaria_colab` (Colaborador Hotelaria): registro e consulta de checklists.
- **Proteção de rotas**:
  - Middleware `authenticateToken` garante que rotas sensíveis exigem JWT válido.
  - Middlewares auxiliares (`ensureAdmin`, `ensureGestorHotelariaOrAdmin`, `ensureHotelariaUser`) reforçam regra de acesso no banco.
- **Headers de segurança**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
  - Política de `Content-Security-Policy` ajustada para o cenário on-premise.
- **Rate limiting**:
  - Janela de 15 minutos, limite padrão de 1000 requisições por IP.
- **Proteção do ambiente**:
  - Arquivo `.env` não versionado (apenas `.env.example`).
  - `.gitignore` configurado para excluir `recepcao.db`, `uploads/`, logs, `.env` e certificados.
- **Banco de dados**:
  - Uso de parâmetros nas queries (evitando SQL injection).
  - Índices e colunas adicionais criadas via `PRAGMA table_info(...)` e `ALTER TABLE` sob demanda.

---

## 6. Ambiente de Desenvolvimento e Testes

- **Desenvolvimento**:
  - Node.js 18+.
  - `npm install` na pasta `recepcao_hse`.
  - Execução local via `npm start` (ou `node server.js`).
  - Banco SQLite local (`recepcao.db`) com seed automático pelo `init-db.js`.
- **Configuração via `.env`**:
  - `PORT` (padrão 3000).
  - `JWT_SECRET` (obrigatória em produção).
  - `NODE_ENV` (`development`/`production`).
  - Variáveis de HTTPS (opcional) e AD (para integrações futuras).
- **Testes básicos**:
  - Scripts de verificação de conexão, PowerShell e WMI nas pastas de backup.
  - GUIA_TESTE_COMPLETO.md e outros manuais descrevem cenários de teste manual (visitas, chaves, hotelaria, biometria).
  - Para uso institucional, recomenda-se adicionar testes automatizados com **Jest** (API) e cenários de fluxo completos.

---

## 7. Monitoramento e Healthcheck

O sistema não possui, atualmente, um endpoint dedicado de healthcheck (ex.: `/health`).  
O monitoramento é realizado principalmente por:
- Verificação de acesso HTTP à aplicação (`/`).
- Testes de login (`/api/login`) e consultas simples (`/api/setores`, `/api/visitantes?ativo=true`).

**Recomendação de evolução**:
- Implementar `GET /health` retornando `{ "status": "ok" }` com:
  - Verificação de conexão ao SQLite.
  - Verificação de permissões de escrita em `uploads/` e `logs/`.

---

## 8. Integração Contínua (CI) e Deploy (CD)

Atualmente o projeto é distribuído principalmente via **instalador Windows** (Inno Setup), não havendo pipeline de CI/CD formalizado.  

Fluxo típico:
1. Ajustes de código em desenvolvimento.
2. Build do instalador via scripts em `installer/`.
3. Instalação/atualização no servidor Windows:
   - Executa `recepcao_hse_setup.exe`.
   - Scripts `post-install.ps1` geram `.env`, configuram logs e inicializam banco.
   - `install-service.bat` cria serviço Windows para o Node.js (via `nssm`).

**Sugestão de CI/CD futura**:
- Repositório Git com:
  - Lint + testes automáticos.
  - Build do instalador em pipeline.
  - Publicação do instalador assinado para ambientes de homologação e produção.

---

## 9. Governança e Versionamento

- Versionamento principal é descrito em:
  - `VERSION_LOG.md`
  - `CHANGELOG_PRODUCAO.md`
  - Pastas `cleanup_backup_YYYYMMDD_*` com estados anteriores.
- Recomenda-se a adoção formal de branches:

| Branch    | Função                | Deploy   |
|-----------|-----------------------|----------|
| `dev`     | Desenvolvimento       | ✗        |
| `homolog` | Homologação interna  | ✓ (teste)|
| `main`    | Produção              | ✓        |
| `hotfix/*`| Correções urgentes    | ✓ após revisão |

---

## 10. Objetivo e Impacto

O Sistema de Recepção HSE:
- **Reduz o trabalho manual** de controle de visitantes, com registros padronizados.
- Fornece **rastreabilidade** sobre quem entrou, quando, para qual setor/paciente e com qual tipo de vínculo (visitante/fornecedor/acompanhante).
- Melhora o controle de **chaves físicas**, reduzindo perdas e melhorando a segurança patrimonial.
- Dá suporte à **hotelaria** com histórico de checklists por leito, permitindo auditorias e melhoria contínua da qualidade.
- Centraliza informações em uma **interface única**, facilitando treinamento e uso diário.

---

## 11. Próximas Evoluções

Alguns pontos de evolução já mapeados:
- Implementar healthcheck dedicado (`/health`) com status detalhado.
- Migrar o banco de dados de SQLite para PostgreSQL em ambiente multiusuário.
- Adicionar testes automatizados (Jest) e pipeline de CI/CD.
- Aprimorar relatórios (PDF/CSV) e dashboards de hotelaria.
- Integração com Active Directory (LDAP) para login corporativo.
- Logs estruturados (JSON) e centralização via ferramenta de observabilidade.

---

## 12. Dicionário de Dados

### 12.1 Tabela: setores

| Campo       | Tipo    | Descrição                                 | Restrições                         |
|------------|---------|--------------------------------------------|------------------------------------|
| id         | INTEGER | Identificador único do setor               | PK, AUTOINCREMENT                  |
| nome       | TEXT    | Nome do setor                             | NOT NULL, índice único por nome    |
| status     | TEXT    | Status (`ativo` / `inativo` etc.)         | Default: `ativo`                   |
| tipo       | TEXT    | Tipo de setor (UTI, Enfermaria, Outro...) | Default: `Outro`                   |
| observacoes| TEXT    | Observações gerais                         | Opcional                           |

### 12.2 Tabela: pacientes

| Campo    | Tipo    | Descrição                      | Restrições                       |
|---------|---------|---------------------------------|----------------------------------|
| id      | INTEGER | Identificador do paciente       | PK, AUTOINCREMENT                |
| nome    | TEXT    | Nome do paciente                | NOT NULL                         |
| setor_id| INTEGER | Setor de internação             | FK → setores(id), pode ser nulo |

### 12.3 Tabela: visitantes

| Campo        | Tipo     | Descrição                                        | Restrições                                      |
|-------------|----------|---------------------------------------------------|-------------------------------------------------|
| id          | INTEGER  | Identificador do visitante                        | PK, AUTOINCREMENT                               |
| nome        | TEXT     | Nome do visitante                                 | NOT NULL                                        |
| documento   | TEXT     | Documento (RG, CPF, etc.)                         | NOT NULL                                        |
| telefone    | TEXT     | Telefone de contato                               | Opcional                                        |
| foto_url    | TEXT     | Caminho da foto em `uploads/`                     | Opcional                                        |
| setor_id    | INTEGER  | Setor a ser visitado                              | FK → setores(id)                                |
| paciente_id | INTEGER  | Paciente associado (se aplicável)                | FK → pacientes(id)                              |
| tipo        | TEXT     | `visitante`, `acompanhante` ou `fornecedor`      | Default: `visitante`                            |
| entrada     | DATETIME | Data/hora de entrada                              | Default: CURRENT_TIMESTAMP                      |
| saida       | DATETIME | Data/hora de saída                                | Pode ser nulo enquanto o visitante estiver dentro|
| status      | TEXT     | Status lógico (`dentro`, etc.)                    | Pode ser adicionado em migrações                |
| usuario_id  | INTEGER  | Usuário responsável pelo registro (futuro uso)   | Opcional                                        |

### 12.4 Tabela: usuarios

| Campo    | Tipo    | Descrição                                   | Restrições                          |
|---------|---------|----------------------------------------------|-------------------------------------|
| id      | INTEGER | Identificador do usuário                     | PK, AUTOINCREMENT                   |
| nome    | TEXT    | Nome completo                                | NOT NULL                            |
| email   | TEXT    | Email de login                               | NOT NULL, UNIQUE                    |
| senha   | TEXT    | Hash bcrypt da senha                         | NOT NULL                            |
| role    | TEXT    | Papel (`admin`, `user`, `hotelaria_gestor`, `hotelaria_colab`)| Default `user`          |
| username| TEXT    | Login amigável (`nome.sobrenome`)            | UNIQUE, gerado automaticamente      |

### 12.5 Tabelas de Hotelaria

#### enfermarias

| Campo    | Tipo    | Descrição                        | Restrições                 |
|---------|---------|-----------------------------------|----------------------------|
| id      | INTEGER | Identificador da enfermaria       | PK, AUTOINCREMENT          |
| setor_id| INTEGER | Setor ao qual pertence            | FK → setores(id)           |
| nome    | TEXT    | Nome da enfermaria (ex.: UTI 1)   | NOT NULL                   |
| status  | TEXT    | Status (`ativo`/`inativo`)        | Default `ativo`            |

#### leitos

| Campo         | Tipo    | Descrição                            | Restrições                |
|--------------|---------|---------------------------------------|---------------------------|
| id           | INTEGER | Identificador do leito                | PK, AUTOINCREMENT         |
| setor_id     | INTEGER | Setor (fallback / compatibilidade)    | FK → setores(id)          |
| enfermaria_id| INTEGER | Enfermaria à qual o leito pertence    | FK → enfermarias(id)      |
| identificacao| TEXT    | Código do leito (ex.: 301A, UTI-2)    | NOT NULL                  |
| status       | TEXT    | Status lógico (`ativo`/`inativo`)     | Default `ativo`           |

#### hotelaria_checklists

| Campo       | Tipo     | Descrição                                 | Restrições                |
|------------|----------|--------------------------------------------|---------------------------|
| id         | INTEGER  | Identificador do checklist                 | PK, AUTOINCREMENT         |
| setor_id   | INTEGER  | Setor do leito                             | FK → setores(id)          |
| leito_id   | INTEGER  | Leito inspecionado                         | FK → leitos(id)           |
| data       | TEXT     | Data da execução (YYYY-MM-DD)              | NOT NULL                  |
| colaborador| TEXT     | Nome do colaborador responsável            | NOT NULL                  |
| itens      | TEXT     | JSON com ids dos itens marcados            | NOT NULL                  |
| observacoes| TEXT     | Observações adicionais                     | Opcional                   |
| criado_por | INTEGER  | Usuário que registrou o checklist          | FK → usuarios(id), opcional|
| created_at | DATETIME | Data/hora de criação                       | Default CURRENT_TIMESTAMP |

### 12.6 Tabelas de Chaves

#### chaves

| Campo      | Tipo    | Descrição                                | Restrições        |
|-----------|---------|-------------------------------------------|-------------------|
| id        | INTEGER | Identificador da chave                    | PK, AUTOINCREMENT |
| descricao | TEXT    | Descrição da chave (ex.: Porta UTI 1)    | NOT NULL          |
| localizacao| TEXT   | Localização física                        | Opcional          |
| ativa     | INTEGER | 1 = ativa, 0 = inativa                    | Default 1         |

#### chaves_movimentacoes

| Campo        | Tipo     | Descrição                                  | Restrições             |
|-------------|----------|---------------------------------------------|------------------------|
| id          | INTEGER  | Identificador da movimentação               | PK, AUTOINCREMENT      |
| chave_id    | INTEGER  | Chave associada                             | FK → chaves(id)        |
| retirado_por| TEXT     | Nome de quem retirou                        | NOT NULL               |
| setor       | TEXT     | Setor do responsável                        | Opcional               |
| cargo       | TEXT     | Cargo/função                                | Opcional               |
| documento   | TEXT     | Documento de identificação                  | Opcional               |
| contato     | TEXT     | Telefone/contato                            | Opcional               |
| observacao  | TEXT     | Observações                                 | Opcional               |
| retirada_em | DATETIME | Data/hora da retirada                       | Default CURRENT_TIMESTAMP |
| devolvido_em| DATETIME | Data/hora da devolução                      | Nulo enquanto emprestada |
| devolvido_por|TEXT     | Quem efetuou a devolução                    | Opcional               |

---

## 13. Especificação de Requisitos

### 13.1 Requisitos Funcionais (RF)

- **RF01 – Autenticação**
  - Permitir login por email/username e senha.
  - Gerar token JWT para acesso às rotas protegidas.

- **RF02 – Gestão de Usuários (Admin Geral)**
  - Cadastrar, listar, editar e remover usuários.
  - Não permitir a remoção do último administrador.
  - Gerar `username` automaticamente a partir do nome.

- **RF03 – Cadastro de Visitantes**
  - Registrar visitantes com nome, documento, telefone, setor e, quando aplicável, paciente associado.
  - Permitir upload de foto via webcam/arquivo.
  - Suportar tipos: visitante, acompanhante, fornecedor.

- **RF04 – Consulta de Visitantes**
  - Listar visitantes com filtros por período, setor, tipo, status (ativo/finalizado), nome, documento e paciente.
  - Diferenciar visitantes ativos (sem saída registrada).

- **RF05 – Registro de Saída**
  - Registrar data/hora de saída de um visitante específico.
  - Impedir novas saídas para o mesmo registro.

- **RF06 – Gestão de Setores e Pacientes**
  - Listar e cadastrar setores.
  - Manter relação visitante ↔ paciente ↔ setor.
  - Criar pacientes automaticamente, quando informados via nome e inexistentes para o setor.

- **RF07 – Gestão de Chaves**
  - Cadastrar chaves (Admin Geral).
  - Registrar retirada (com dados do responsável).
  - Registrar devolução.
  - Listar status atual das chaves (disponível/emprestada) e histórico.

- **RF08 – Gestão de Hotelaria**
  - Cadastrar enfermarias por setor.
  - Cadastrar leitos por enfermaria.
  - Registrar checklist de hotelaria por leito/data/colaborador/itens.
  - Consultar checklists com filtros (setor, leito, enfermaria, período, colaborador).

- **RF09 – Perfis de Acesso**
  - Admin Geral vê e gerencia todos os módulos.
  - Admin Hotelaria vê e gerencia apenas módulo de hotelaria.
  - Colab Hotelaria registra e consulta checklists.
  - Usuário comum utiliza fluxo de visitas (conforme configuração da instituição).

### 13.2 Requisitos Não Funcionais (RNF)

- **RNF01 – Disponibilidade**
  - Sistema deve estar disponível durante o horário de funcionamento do hospital.
  - Em caso de falha, o serviço deve ser reinicializado automaticamente (serviço Windows / monitor externo).

- **RNF02 – Segurança**
  - Autenticação via JWT com chave secreta forte.
  - Perfis de acesso separados por função.
  - Proteção contra ataques básicos (XSS refletido, clickjacking, brute force em login).

- **RNF03 – Desempenho**
  - Resposta média < 1s para operações CRUD em rede local.
  - Banco SQLite adequado ao volume atual de acessos (uso interno).

- **RNF04 – Usabilidade**
  - Interface responsiva, adequada a telas HD/Full HD em balcões de atendimento.
  - Fluxos simples, com feedback visual (mensagens de sucesso/erro e carregamento).

- **RNF05 – Manutenibilidade**
  - Código organizado em único backend Node.js com documentação interna.
  - Scripts de instalação e preparação de produção versionados em `scripts/`.

- **RNF06 – Auditabilidade**
  - Possibilidade de rastrear quais usuários criaram ou alteraram registros (especialmente hotelaria e chaves).
  - Registros permanentes de movimentação de chaves e checklists.

---

## 14. Modelo de Entidade-Relacionamento (MER)

### 14.1 Entidades e Relacionamentos (descrição textual)

- **setores**
  - Um setor pode possuir vários pacientes, enfermarias, leitos e checklists.

- **pacientes**
  - Cada paciente pertence a um único setor.
  - Um paciente pode estar associado a vários registros de visitantes.

- **visitantes**
  - Cada visitante está associado a um setor e, opcionalmente, a um paciente.
  - Relação: **setores 1:N visitantes**, **pacientes 1:N visitantes**.

- **usuarios**
  - Administração de acesso.  
  - Relação com `hotelaria_checklists` via campo `criado_por` (1:N).

- **enfermarias**
  - Cada enfermaria pertence a um setor.
  - Um setor pode ter várias enfermarias (1:N).

- **leitos**
  - Cada leito pertence a uma enfermaria (e, por compatibilidade, a um setor).
  - Uma enfermaria pode ter vários leitos (1:N).

- **hotelaria_checklists**
  - Cada checklist é associado a um leito e a um setor.
  - Relações: **setores 1:N hotelaria_checklists**, **leitos 1:N hotelaria_checklists**, **usuarios 1:N hotelaria_checklists (criado_por)**.

- **chaves**
  - Cadastro das chaves controladas.

- **chaves_movimentacoes**
  - Cada movimentação pertence a uma chave.
  - Relação: **chaves 1:N chaves_movimentacoes**.

---

## 15. Manual do Usuário

### 15.1 Introdução

Este manual descreve o uso da interface web do Sistema de Recepção HSE para:
- Recepcionistas;
- Equipe de segurança / controle de chaves;
- Equipe de hotelaria (admin e colaboradores);
- Administradores de sistema.

O acesso padrão é feito pelo navegador em `http://<servidor>:3000`.

### 15.2 Login

1. Acesse a URL do sistema (`http://servidor:3000`).
2. Informe **login** (email ou username) e **senha**.
3. Clique em **Entrar**.
4. Em caso de sucesso, você será direcionado para:
   - Tela de **Cadastro de Visitantes** (usuário comum/admin).
   - Tela de **Hotelaria** (perfis exclusivos de hotelaria).

### 15.3 Cadastro de Visitante

1. Acesse o menu **Cadastro de Visitantes**.
2. Preencha:
   - Nome do visitante.
   - Documento.
   - Telefone (opcional).
   - Setor a ser visitado.
   - Tipo (visitante, acompanhante, fornecedor).
   - Paciente associado (se aplicável).
3. (Opcional) Capture ou envie uma **foto**.
4. Clique em **Salvar**.
5. O visitante passa a constar na lista de visitantes, com status **dentro**.

### 15.4 Registro de Saída

1. Acesse a lista de visitantes.
2. Filtre por **ativos** ou pela data do dia.
3. Localize o visitante e clique em **Registrar Saída**.
4. Confirme a operação.  
   A coluna de saída será preenchida com data/hora atual.

### 15.5 Gestão de Chaves

#### Cadastro de Chaves (Admin Geral)

1. Acesse o módulo **Chaves** com um usuário **Admin Geral**.
2. Cadastre novas chaves informando:
   - Descrição (ex.: Chave UTI Sala 1).
   - Localização (opcional).
   - Status (ativa/inativa).

#### Retirada de Chave

1. Na lista de chaves, selecione uma chave **disponível**.
2. Clique em **Retirar**.
3. Preencha:
   - Nome de quem está retirando.
   - Setor, cargo, documento e contato (quando aplicável).
4. Confirme.  
   A chave passa a ser exibida como **emprestada**.

#### Devolução de Chave

1. Na lista de chaves, selecione uma chave **emprestada**.
2. Clique em **Devolver**.
3. (Opcional) Informe quem está devolvendo.
4. Confirme.  
   A chave volta a ficar **disponível** e o histórico é atualizado.

### 15.6 Hotelaria – Checklists por Leito

#### Registro de Checklist

1. Acesse o menu **Hotelaria**.
2. Preencha:
   - Setor.
   - Enfermaria.
   - Leito.
   - Data.
   - Nome do colaborador.
3. Marque os **itens de hotelaria** (cama, poltrona, cortina, banheiro, etc.).
4. Adicione observações quando necessário.
5. Clique em **Salvar checklist**.

#### Consulta de Checklists

1. Na aba de relatórios de hotelaria, aplique filtros:
   - Período (data inicial/final).
   - Setor, enfermaria e/ou leito.
   - Colaborador.
2. Visualize a lista de registros, com identificação do leito, setor, enfermaria e colaborador.
3. (Opcional) Gere guias/relatórios em PDF, conforme opções disponíveis.

### 15.7 Dashboard (quando habilitado)

O arquivo `dashboard.html` oferece:
- Visão geral de **visitantes ativos**, **total de visitantes**, **chaves emprestadas** e **total de chaves**.
- Gráficos por setor, tipo de visitante e movimentação diária.
- Lista de atividade recente (visitas, chaves, etc.).

O acesso ao dashboard depende das rotas `/api/dashboard/*` estarem habilitadas na versão em uso.

### 15.8 Solução de Problemas (FAQ)

- **Não consigo acessar o sistema**
  - Verifique se o servidor está ligado.
  - Confirme com a TI se o serviço de recepção está em execução na porta configurada.

- **Erro de login**
  - Verifique se digitou corretamente login e senha.
  - Confirme com o administrador se o usuário está ativo e com papel correto.

- **Visitante não aparece na lista**
  - Verifique filtros de data e status (ativos/finalizados).
  - Certifique-se de ter salvo o cadastro com sucesso.

- **Chave não pode ser retirada**
  - Verifique se já existe movimentação em aberto para esta chave.
  - Em caso de erro, revise os dados da chave com um Admin Geral.

- **Erro ao salvar checklist de hotelaria**
  - Confirme se todos os campos obrigatórios (setor, enfermaria, leito, data, colaborador) foram preenchidos.
  - Verifique se o leito está corretamente vinculado a uma enfermaria e setor.

### 15.9 Contato para Suporte (a definir pela instituição)

- **Responsável técnico interno (TI HSE)**  
- **Email de suporte**: (configurado pela instituição)  
- **Telefone/ramal**: (configurado pela instituição)

---

Este documento segue a estrutura inspirada no modelo de documentação do projeto Consulta_SERPRO, adaptado para o contexto do **Sistema de Recepção HSE**.

