## 📘 Visão Geral do Sistema

O **Sistema de Recepção HSE** é uma aplicação web para controle de acesso de visitantes, gestão de pacientes e setores, controle de chaves físicas e apoio à hotelaria hospitalar (enfermarias, leitos e checklists).  
Foi desenvolvido em **Node.js/Express** com **SQLite** e frontend em **HTML/CSS/JavaScript** (sem framework SPA), rodando em ambiente on‑premise via navegador.

- **Público‑alvo principal**: Recepção, Hotelaria, Segurança, Administração do HSE.  
- **Acesso padrão**: `http://localhost:3000` ou `http://IP_DO_SERVIDOR:3000`.  
- **Usuário padrão**: `admin@recepcao.com` / senha `admin123`.

---

## 🏗 Arquitetura Geral

- **Backend**
  - `server.js`: servidor HTTP/HTTPS principal, API REST, inicialização do banco SQLite e das tabelas.
  - Banco de dados `recepcao.db` (SQLite) na raiz do projeto.
  - Upload de imagens de visitantes em `uploads/`.
  - Servidor de arquivos estáticos em `public/` (interface web).
  - Proxies locais para bibliotecas externas (`/vendor/*.js`) a fim de evitar bloqueios de CDN.

- **Frontend**
  - `public/index_old.html`: página principal da aplicação (login + painel de operações).
  - `public/dashboard.html`: dashboard gráfico (estatísticas de uso).
  - Assets JS de terceiros em `public/vendor/` (Chart.js, jsPDF, jsPDF Autotable, QRCode).

- **Camadas lógicas principais (no backend)**
  - Autenticação e autorização (JWT + perfis de usuário).
  - Gestão de usuários.
  - Gestão de setores e pacientes.
  - Gestão de visitantes e fluxo de entrada/saída.
  - Módulo de hotelaria (enfermarias, leitos, checklists).
  - Gestão de chaves físicas.
  - Serviços auxiliares (upload de fotos, proxies de bibliotecas, fallback HTTP/HTTPS).

---

## 🗂 Estrutura de Dados (Banco SQLite)

### Tabela `usuarios`
- **Campos principais**:
  - `id` (PK, autoincremento)
  - `nome`
  - `email` (único)
  - `senha` (hash `bcrypt`)
  - `role` (`admin`, `user`, `hotelaria_gestor`, `hotelaria_colab`)
  - `username` (login amigável, geralmente `nome.sobrenome`, único)
- **Usuário padrão**:
  - Inserido automaticamente na inicialização (`id = 1`, `admin@recepcao.com`, `admin123`, role `admin`).

### Tabela `setores`
- **Finalidade**: cadastra todos os setores/unidades do hospital.
- **Campos**:
  - `id` (PK)
  - `nome` (único por índice)
  - `status` (`ativo`/outros)
  - `tipo` (ex.: `Outro`, `Hotelaria`, etc.)
  - `observacoes`
- **Inicialização**:
  - Na primeira execução, é populada com uma lista extensa de setores padrão do HSE.

### Tabela `pacientes`
- **Campos**:
  - `id` (PK)
  - `nome`
  - `setor_id` (FK → `setores.id`)
- **Uso**:
  - Associação entre visitantes e pacientes internados.
  - Pacientes podem ser criados automaticamente a partir do front quando não encontrados.

### Tabela `visitantes`
- **Finalidade**: registro completo de todas as visitas/acessos.
- **Campos principais**:
  - `id` (PK)
  - `nome`
  - `documento`
  - `telefone`
  - `foto_url` (caminho da foto em `/uploads/...`)
  - `setor_id` (FK)
  - `paciente_id` (FK)
  - `tipo` (`visitante`, `acompanhante`, `fornecedor`)
  - `entrada` (data/hora de entrada)
  - `saida` (data/hora de saída, opcional)
  - `status` (ex.: `dentro`)
  - `usuario_id` (FK para `usuarios`, se configurado)

### Tabelas de Hotelaria

#### `enfermarias`
- `id` (PK)  
- `setor_id` (FK → `setores.id`)  
- `nome`  
- `status` (`ativo`/outros)  

#### `leitos`
- `id` (PK)
- `setor_id` (FK)
- `enfermaria_id` (FK → `enfermarias.id`)
- `identificacao` (código do leito, ex.: 101, 202B)
- `status` (`ativo`/outros)

#### `hotelaria_checklists`
- Registro de checklists de limpeza/higienização por leito.
- **Campos**:
  - `id` (PK)
  - `setor_id` (FK)
  - `leito_id` (FK)
  - `data` (dia do checklist)
  - `colaborador` (responsável pela execução)
  - `itens` (JSON com itens marcados)
  - `observacoes`
  - `criado_por` (FK → `usuarios.id`)
  - `created_at` (timestamp de criação)

### Tabelas de Chaves

#### `chaves`
- `id` (PK)
- `descricao`
- `localizacao`
- `ativa` (1 = ativa, 0 = inativa)

#### `chaves_movimentacoes`
- Histórico de retirada/devolução de cada chave.
- **Campos**:
  - `id` (PK)
  - `chave_id` (FK → `chaves.id`)
  - `retirado_por`
  - `setor`
  - `cargo`
  - `documento`
  - `contato`
  - `observacao`
  - `retirada_em` (data/hora)
  - `devolvido_em` (data/hora, nulo enquanto a chave está emprestada)
  - `devolvido_por`

---

## 🔐 Autenticação e Autorização

### Fluxo de Login
- **Endpoint**: `POST /api/login`
- **Entrada**:
  - `login` **ou** `email`
  - `senha`
- **Processo**:
  - Verifica dinamicamente se a coluna `username` existe.
  - Permite login:
    - Pelo e‑mail.
    - Pelo `username`.
    - Pelo alias `admin` (mapeado para o usuário administrador).
  - Validação de senha via `bcrypt`.
  - Gera **JWT** com:
    - `id`
    - `email`
    - `role`
  - Expiração padrão: **24h**.

### Perfis de Usuário (Roles)
- `admin`:
  - Acesso completo à gestão de usuários, chaves, setores, hotelaria e demais recursos.
- `user`:
  - Uso geral (consulta/cadastro de visitantes, etc., conforme frontend).
- `hotelaria_gestor`:
  - Pode gerenciar setores de hotelaria, enfermarias, leitos e checklists.
- `hotelaria_colab`:
  - Pode registrar e consultar checklists de hotelaria e dados relacionados.

### Proteção de Rotas
- Middleware `authenticateToken`:
  - Lê o header `Authorization: Bearer <token>`.
  - Valida o token com `JWT_SECRET`.
  - Armazena o usuário em `req.user`.
- Middlewares auxiliares:
  - `ensureAdmin`: garante que o usuário tenha perfil administrador.
  - `ensureGestorHotelariaOrAdmin`: restringe ações de hotelaria mais sensíveis.
  - `ensureHotelariaUser`: permite acesso a usuários de hotelaria (gestor ou colaborador) e admin.

---

## 👤 Módulo de Usuários

### Criar Usuário
- **Endpoint**: `POST /api/usuarios`  
- **Permissão**: apenas `admin`.
- **Campos**:
  - `nome`, `email`, `senha`, `role` (opcional; default `user`).
- **Lógica**:
  - Gera `username` automaticamente (`primeiro.ultimo`).
  - Garante unicidade de `username` incrementando sufixos se necessário.
  - Armazena senha com hash `bcrypt`.

### Listar Usuários
- **Endpoint**: `GET /api/usuarios`  
- **Permissão**: apenas `admin`.
- Retorna `id`, `nome`, `email`, `username`, `role`.

### Atualizar Usuário
- **Endpoint**: `PUT /api/usuarios/:id`  
- **Permissão**: apenas `admin`.
- Atualiza `nome`, `email`, `role` (sem alterar a senha).

### Remover Usuário
- **Endpoint**: `DELETE /api/usuarios/:id`  
- **Permissão**: apenas `admin`.
- Regras de segurança:
  - Não permite remover a própria conta.
  - Não permite remover o **último administrador** do sistema.

---

## 🧭 Módulo de Setores e Pacientes

### Listar Setores (Geral)
- **Endpoint**: `GET /api/setores`
- Retorna lista única por nome (`GROUP BY nome`) para evitar duplicados na interface.

### Hotelaria – Setores
- **Listar**: `GET /api/hotelaria/setores?somenteAtivos=ativo`
  - Retorna setores com campos `id`, `nome`, `status`, `tipo`, `observacoes`.
- **Criar**: `POST /api/hotelaria/setores`
  - Permissão: `hotelaria_gestor` ou `admin`.
  - Campos obrigatórios: `nome`.
- **Atualizar**: `PUT /api/hotelaria/setores/:id`
  - Permissão: `hotelaria_gestor` ou `admin`.
  - Atualiza `nome`, `status`, `tipo`, `observacoes`.

### Pacientes
- **Listar**: `GET /api/pacientes?setor_id=...`
  - Filtra por setor se fornecido.
- **Criação Automática**:
  - Ao cadastrar/editar visitantes, se o paciente não existir para o setor, o sistema cria um registro em `pacientes` e associa ao visitante.

---

## 👥 Módulo de Visitantes

### Cadastro de Visitantes
- **Endpoint**: `POST /api/visitantes` (multipart/form‑data, com `multer`).
- **Campos principais**:
  - `nome`, `documento`, `telefone` (opcional).
  - `setor_id` (obrigatório).
  - `paciente_id` **ou** `paciente_nome` (para tipos `visitante`/`acompanhante`).
  - `tipo` (`visitante`, `acompanhante`, `fornecedor`).
  - `foto` (arquivo, opcional).
- **Processo**:
  - Arquivo de foto é salvo em `uploads/` com nome `[timestamp]-[original]`.
  - URL pública da foto: `/uploads/<arquivo>`.
  - Se tipo exigir paciente e não houver `paciente_id`, o sistema:
    - Busca paciente pelo nome e setor.
    - Cria novo paciente se não houver.

### Listagem e Filtros de Visitantes
- **Endpoint**: `GET /api/visitantes`
- **Filtros suportados**:
  - `ativo=true` (somente quem está dentro).
  - `status` (`ativo`/`finalizado`).
  - `setor_id`
  - `tipo` (`visitante`, `fornecedor`, `acompanhante`)
  - `nome` (busca parcial, case‑insensitive).
  - `documento`
  - `paciente` (nome do paciente).
  - `data_inicio`, `data_fim` (intervalo pela data de entrada).
  - `ordenar` (`entrada_asc`, `nome_asc`, `nome_desc`, default `entrada DESC`).
- **Retorno**:
  - Dados do visitante + `setor_nome` e `paciente_nome`.

### Detalhe de Visitante
- **Endpoint**: `GET /api/visitantes/:id`  
- **Permissão**: requer `authenticateToken` (rota protegida) para uso interno.
- Retorna um único registro com informações completas de setor e paciente.

### Registro de Saída
- **Endpoint**: `PUT /api/visitantes/:id/saida`
- Marca a hora atual em `saida` do visitante (somente se ainda não tiver saída registrada).

### Atualização de Visitante (Admin)
- **Endpoint**: `PUT /api/visitantes/:id`
- **Permissão**: apenas `admin`.
- Permite alterar:
  - `nome`, `documento`, `telefone`, `setor_id`, `paciente_id`/`paciente_nome`, `tipo`.
- Aplica a mesma lógica de paciente automático (busca + criação, se necessário).

---

## 🏨 Módulo de Hotelaria (Enfermarias, Leitos e Checklists)

### Enfermarias
- **Listar**: `GET /api/hotelaria/enfermarias?setor_id=...`
  - Permissão: `hotelaria_gestor`, `hotelaria_colab` ou `admin`.
  - Retorna enfermarias com o nome do setor associado.
- **Criar**: `POST /api/hotelaria/enfermarias`
  - Permissão: `hotelaria_gestor` ou `admin`.
  - Campos obrigatórios: `setor_id`, `nome`.
- **Atualizar**: `PUT /api/hotelaria/enfermarias/:id`
  - Permissão: `hotelaria_gestor` ou `admin`.
  - Atualiza `nome`, `status`, `setor_id`.

### Leitos
- **Listar**: `GET /api/hotelaria/leitos?setor_id=...&enfermaria_id=...`
  - Permissão: `hotelaria_gestor`, `hotelaria_colab` ou `admin`.
  - Verifica dinamicamente se a coluna `enfermaria_id` existe no schema.
  - Retorna leitos com `setor_nome` e, se aplicável, `enfermaria_nome`.
- **Criar**: `POST /api/hotelaria/leitos`
  - Permissão: `hotelaria_gestor` ou `admin`.
  - Campos:
    - `identificacao` (obrigatório).
    - `setor_id` e/ou `enfermaria_id` (se só vier `enfermaria_id`, o `setor_id` é inferido).
- **Atualizar**: `PUT /api/hotelaria/leitos/:id`
  - Permissão: `hotelaria_gestor` ou `admin`.
  - Atualiza `identificacao`, `status`, `setor_id`, `enfermaria_id`.

### Checklists de Hotelaria

#### Registro de Checklist
- **Endpoint**: `POST /api/hotelaria/checklists`
- **Permissão**: `hotelaria_gestor`, `hotelaria_colab` ou `admin`.
- **Campos obrigatórios**:
  - `setor_id`, `leito_id`, `data`, `colaborador`.
  - `itens` (array de IDs de itens marcados; armazenado como JSON).
- **Regras**:
  - Valida se o leito existe e pertence ao setor informado.
  - Associa o registro ao usuário autenticado (`criado_por`).

#### Consulta de Checklists
- **Endpoint**: `GET /api/hotelaria/checklists`
- **Filtros**:
  - `setor_id`, `leito_id`
  - `data`, `data_inicio`, `data_fim`
  - `enfermaria_id`
  - `colaborador` (busca parcial)
- **Retorno**:
  - Dados do checklist, com:
    - `leito_identificacao`,
    - `setor_nome`,
    - `enfermaria_nome` (quando aplicável),
    - `criado_por_nome`,
    - `itens` já parseados de JSON para array.

---

## 🔑 Módulo de Chaves Físicas

### Listar Chaves e Status
- **Endpoint**: `GET /api/chaves`
- **Permissão**: qualquer usuário autenticado.
- Retorna:
  - Dados da chave (`descricao`, `localizacao`, `ativa`).
  - Flag `emprestada` (0/1).
  - Última movimentação em aberto (`retirado_por`, `setor`, `cargo`, `retirada_em`) quando existir.

### Cadastro de Nova Chave
- **Endpoint**: `POST /api/chaves`
- **Permissão**: `admin` (via middleware `ensureAdmin`).
- Campos:
  - `descricao` (obrigatório),
  - `localizacao` (opcional),
  - `ativa` (default 1).

### Retirada de Chave
- **Endpoint**: `POST /api/chaves/:id/retirar`
- **Permissão**: usuário autenticado.
- Campos obrigatórios:
  - `retirado_por`
- Campos adicionais:
  - `setor`, `cargo`, `documento`, `contato`, `observacao`.
- Regras:
  - Chave deve estar ativa.
  - Não pode haver movimentação em aberto para a mesma chave.

### Devolução de Chave
- **Endpoint**: `POST /api/chaves/:id/devolver`
- **Permissão**: usuário autenticado.
- Campos:
  - `devolvido_por` (opcional).
- Marca `devolvido_em` com a data/hora atual.

### Histórico de Movimentações
- **Endpoint**: `GET /api/chaves/:id/historico`
- Lista todas as movimentações da chave, ordenadas por `retirada_em DESC`.

---

## 🌐 Frontend – Páginas Principais

### `index_old.html` – Interface Principal

Esta é a **página SPA principal** do sistema, servida como fallback em `GET *` pelo `server.js`.  
Principais características de interface:

- **Cabeçalho moderno** com logo do HSE à esquerda, título e subtítulo centralizados.
- **Barra de navegação** com botões de ação:
  - **Cadastrar Visitante**
  - **Listar Visitantes**
  - **Gestão de Chaves**
  - **Hotelaria (enfermarias/leitos/checklists)**
  - Acesso ao **Dashboard** (quando habilitado).
- **Layout responsivo** com CSS moderno (gradientes, sombras, animações).
- Uso intenso de **JavaScript vanilla** para:
  - Alternar entre seções da tela (sem recarregar a página).
  - Consumir a API via `fetch` com token JWT armazenado em `localStorage`.

Funcionalidades típicas expostas na interface:

- **Login**:
  - Formulário de e‑mail/senha.
  - Ao autenticar, armazena `token` e `user` no `localStorage`.
  - Redireciona para a área principal.

- **Cadastro de Visitantes**:
  - Formulário com campos de dados pessoais, setor, paciente, tipo de visitante.
  - Upload de foto via webcam ou arquivo (enviado ao backend com `multer`).
  - Confirmação visual e listagem imediata após o cadastro.

- **Listagem de Visitantes**:
  - Tabela com filtros por período, setor, tipo, nome, documento, status.
  - Ações de registrar saída e (para admin) editar registros.

- **Módulo de Chaves**:
  - Visualização do status das chaves (disponível/emprestada).
  - Tela de retirada/devolução com preenchimento dos dados do responsável.

- **Módulo de Hotelaria**:
  - Cadastros básicos de enfermarias e leitos.
  - Formulário de checklist por leito (itens marcáveis, observações, colaborador).
  - Consulta de checklists por período, setor, leito e colaborador.

- **Biometria (versão demonstrativa)**:
  - A interface implementada na versão biométrica (descrita em `GUIA_TESTE_COMPLETO.md`) foi integrada visualmente:
    - Modal ou seção de **captura biométrica** com simulação do leitor DigitalPersona 4500.
    - Indicadores de status, progresso e qualidade de captura.
  - No contexto atual, funciona como **simulação para apresentação** (sem ativar o leitor físico via navegador).

### `dashboard.html` – Dashboard e Estatísticas

Página dedicada à visualização gráfica dos dados do sistema.

- **Autenticação obrigatória**:
  - Lê `token` e `user` do `localStorage`.
  - Se não houver token, redireciona para `index_old.html`.

- **Blocos principais**:
  - **Cards de estatísticas** (visitantes ativos, total de visitantes, chaves emprestadas, total de chaves).
  - **Gráficos Chart.js**:
    - Visitantes por setor (gráfico de rosca).
    - Visitantes por tipo (gráfico de barras).
    - Movimentação diária (entradas/saídas).
    - Status das chaves (quantidade disponíveis x emprestadas).
  - **Atividade recente**:
    - Lista cronológica com ícones (visitantes, chaves, usuários) e horário.

> Observação: a versão em produção do `server.js` atual pode não expor mais as rotas `/api/dashboard/*`, pois o roadmap indica que o dashboard foi removido em determinado momento. A página permanece como referência de design e pode ser facilmente reativada.

---

## 📦 Uploads, Arquivos Estáticos e Segurança HTTP

- **Uploads de Fotos**:
  - Diretório: `uploads/`.
  - Servidos via `express.static('/uploads')` com middleware para remover cabeçalhos que forçam HTTPS.

- **Arquivos Estáticos da Aplicação**:
  - Diretório: `public/`.
  - Inclui `index_old.html`, `dashboard.html` e demais assets.

- **Proxies de Bibliotecas Externas**:
  - Rotas `/vendor/*.js` fazem proxy de:
    - `qrcode.min.js`
    - `jspdf.umd.min.js`
    - `jspdf.plugin.autotable.min.js`
    - `chart.min.js`
  - Objetivo: permitir carregamento dessas libs a partir do servidor local, evitando bloqueios de CDN e problemas de conteúdo misto.

- **Forçar uso de HTTP (ambiente interno)**:
  - O backend remove cabeçalhos de `Strict-Transport-Security` e `Upgrade-Insecure-Requests`.
  - O frontend (`index_old.html`) possui um script inicial que:
    - Redireciona automaticamente qualquer acesso via `https://` para `http://`.
    - Intercepta `fetch`, `XMLHttpRequest` e criação de elementos (`script`, `link`, `img`, `iframe`) para garantir que URLs sejam resolvidas em **HTTP**.

---

## 🚀 Fluxo Típico de Uso (Para Apresentação)

1. **Acessar o sistema**
   - Abrir o navegador em `http://localhost:3000` (ou IP do servidor).
   - Fazer login com `admin@recepcao.com / admin123`.

2. **Cadastrar um visitante**
   - Clicar em **"Cadastrar Visitante"**.
   - Preencher nome, documento, telefone, selecionar setor e (se aplicável) paciente.
   - Tirar ou anexar foto.
   - Salvar o cadastro.

3. **Visualizar e filtrar visitantes**
   - Acessar a lista de visitantes.
   - Filtrar por data, setor ou tipo (visitante/acompanhante/fornecedor).
   - Mostrar visitantes atualmente dentro do hospital.

4. **Registrar saída**
   - Selecionar um visitante ativo.
   - Clicar em **"Registrar Saída"** (chama `PUT /api/visitantes/:id/saida`).

5. **Controlar chaves**
   - Ir ao módulo de chaves.
   - Cadastrar uma nova chave (como admin).
   - Registrar retirada com os dados do colaborador.
   - Registrar devolução e exibir histórico.

6. **Demonstrar hotelaria**
   - Cadastrar/consultar enfermarias e leitos.
   - Registrar um checklist para um leito específico.
   - Filtrar checklists por período, setor, leito e colaborador para fins de auditoria.

7. **(Opcional) Apresentar dashboard**
   - Acessar `dashboard.html` (quando rotas de dashboard estiverem ativas).
   - Mostrar gráficos de visitantes por setor/tipo, movimentação diária e status das chaves.

---

## 📑 Resumo Executivo para Apresentação

- **O que o sistema entrega hoje**:
  - Controle completo de visitantes (cadastro, foto, vinculação a pacientes e setores, entrada/saída).
  - Módulo de chaves físicas com histórico detalhado de movimentações.
  - Módulo de hotelaria com enfermarias, leitos e checklists de limpeza/higienização, rastreáveis por usuário.
  - Autenticação segura com JWT e perfis de acesso diferenciados (admin, usuário geral, hotelaria).
  - Interface moderna, responsiva e adequada para uso em recepção/hotelaria.

- **Pontos fortes para destacar em apresentações**:
  - **Rastreabilidade** (quem entrou, quando, para onde, com quem; quem retirou/devolveu chaves; quem executou checklists).
  - **Segurança** (controle de perfis, não permite remover o último admin, rate limiting, headers de segurança).
  - **Facilidade de uso** (interface única, fluxo guiado, filtros simples e claros).
  - **Preparado para evolução** (documentado, modular e com roadmap para relatórios avançados e integrações futuras).



