# AdsOptimizer - Sistema de Gestão de Campanhas Google Ads Performance Max

Sistema completo para acompanhamento e otimização de campanhas Google Ads Performance Max, com painéis separados para gestores e clientes, chat em tempo real, alertas inteligentes e recomendações de IA.

## 📋 Funcionalidades

### Painel do Gestor
- **Dashboard** - Visão geral de todas as campanhas e clientes
- **Gerenciamento de Clientes** - Cadastro e acompanhamento de clientes
- **Gerenciamento de Campanhas** - CRUD completo de campanhas
- **Chat em Tempo Real** - Comunicação estilo WhatsApp com clientes
- **Alertas Inteligentes** - Notificações de queda de ROAS, orçamento excedido, etc.
- **Histórico de Alterações** - Registro completo de todas as mudanças
- **Recomendações de IA** - Sugestões de otimização geradas por OpenAI
- **Relatórios e Métricas** - Gráficos e análises de performance

### Painel do Cliente
- **Dashboard** - Visão das suas campanhas
- **Campanhas** - Acompanhamento de métricas em tempo real
- **Chat com Gestor** - Comunicação direta
- **Recomendações de IA** - Visualização de sugestões

## 🛠️ Stack Tecnológica

### Frontend
- **React 18** - Biblioteca de UI
- **Vite 5** - Build tool e dev server
- **TailwindCSS 3** - Framework CSS
- **Zustand** - Gerenciamento de estado
- **React Router DOM** - Roteamento
- **Recharts** - Gráficos e visualizações
- **Socket.IO Client** - Comunicação em tempo real
- **React Hook Form + Zod** - Formulários e validação
- **Lucide React** - Ícones
- **date-fns** - Manipulação de datas

### Backend
- **Node.js** - Runtime JavaScript
- **Express 4** - Framework web
- **PostgreSQL (Neon)** - Banco de dados serverless
- **JWT** - Autenticação
- **Socket.IO** - WebSocket para chat e notificações
- **google-ads-api** - Integração com Google Ads
- **OpenAI API** - Recomendações inteligentes
- **bcryptjs** - Hash de senhas

## 📁 Estrutura do Projeto

```
AdsOptimizer/
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js              # Servidor Express principal
│       ├── controllers/          # Controladores de rotas
│       ├── db/
│       │   ├── index.js          # Pool de conexão PostgreSQL
│       │   ├── migrate.js        # Migrations do banco
│       │   └── seed.js           # Dados iniciais
│       ├── middlewares/          # Middlewares (auth, error, validation)
│       ├── routes/               # Definição de rotas
│       └── services/             # Serviços (Google Ads, OpenAI, etc.)
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.jsx               # Rotas principais
        ├── main.jsx              # Entry point
        ├── components/           # Componentes reutilizáveis
        ├── pages/                # Páginas da aplicação
        ├── services/             # API e Socket services
        ├── state/                # Zustand stores
        └── utils/                # Funções utilitárias
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- PostgreSQL (ou conta no Neon.tech)
- Conta Google Ads com API habilitada
- Conta OpenAI com API key

### 1. Configurar o Banco de Dados

Crie uma conta no [Neon.tech](https://neon.tech) (PostgreSQL serverless gratuito) ou use um PostgreSQL local.

### 2. Configurar o Backend

```bash
cd backend

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# Servidor
PORT=3001
NODE_ENV=development

# Database (Neon PostgreSQL)
DATABASE_URL=postgres://user:password@host.neon.tech/database?sslmode=require

# JWT
JWT_SECRET=seu-secret-super-seguro-aqui

# Google Ads API
GOOGLE_ADS_CLIENT_ID=seu-client-id
GOOGLE_ADS_CLIENT_SECRET=seu-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=seu-developer-token
GOOGLE_ADS_REFRESH_TOKEN=seu-refresh-token

# OpenAI
OPENAI_API_KEY=sk-sua-chave-openai

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173
```

Execute as migrations e seeds:

```bash
# Criar tabelas
npm run migrate

# Inserir dados de teste
npm run seed
```

Inicie o servidor:

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

### 3. Configurar o Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```

Edite o `.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

Inicie o frontend:

```bash
npm run dev
```

Acesse: **http://localhost:5173**

## 🔐 Credenciais de Teste

Após executar o seed, você pode usar:

**Gestor:**
- Email: `manager@example.com`
- Senha: `password123`

**Cliente:**
- Email: `client@example.com`
- Senha: `password123`

## 🔌 Configurando Integrações

### Google Ads API

1. Acesse o [Google Ads API Center](https://developers.google.com/google-ads/api/docs/first-call/overview)
2. Crie um projeto no Google Cloud Console
3. Habilite a Google Ads API
4. Crie credenciais OAuth 2.0
5. Obtenha o Developer Token
6. Gere o Refresh Token usando o OAuth Playground

### OpenAI API

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma conta e adicione créditos
3. Gere uma API Key em API Keys
4. Adicione a chave no `.env`

## 📊 Banco de Dados

O sistema usa as seguintes tabelas:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários (managers e clients) |
| `campaigns` | Campanhas Performance Max |
| `campaign_metrics` | Métricas diárias das campanhas |
| `campaign_assets` | Ativos das campanhas (imagens, textos) |
| `recommendations` | Recomendações geradas pela IA |
| `alerts` | Alertas de performance |
| `alert_settings` | Configurações de alertas por campanha |
| `chat_conversations` | Conversas do chat |
| `chat_messages` | Mensagens do chat |
| `change_history` | Histórico de alterações |

## 🔄 Sincronização com Google Ads

O sistema sincroniza dados do Google Ads automaticamente a cada hora (configurável). Você também pode sincronizar manualmente:

- Clique no botão "Sincronizar" em qualquer campanha
- Use a API: `POST /api/campaigns/:id/sync`

## 💬 Chat em Tempo Real

O chat usa Socket.IO para comunicação em tempo real:

- Mensagens são entregues instantaneamente
- Indicadores de "visto" (✓✓)
- Status online/offline
- Persistência no banco de dados

## 🔔 Sistema de Alertas

Alertas são gerados automaticamente quando:

- ROAS cai abaixo do limite configurado
- Orçamento diário é excedido
- Conversões caem significativamente
- Campanha é pausada automaticamente

Configure os limites em: **Configurações > Notificações**

## 🤖 Recomendações de IA

A IA analisa os dados da campanha e sugere:

- Ajustes de orçamento
- Melhorias em criativos
- Otimizações de lance
- Oportunidades de segmentação

As recomendações podem ser aplicadas ou rejeitadas pelo gestor.

## 📱 Deploy

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy na Vercel via Git ou CLI
vercel --prod
```

### Backend (Railway/Render)

1. Conecte o repositório ao Railway ou Render
2. Configure as variáveis de ambiente
3. O deploy é automático

### Banco de Dados

O Neon.tech oferece tier gratuito com 512MB de armazenamento - suficiente para começar.

## 🔧 Scripts Disponíveis

### Backend
```bash
npm start        # Produção
npm run dev      # Desenvolvimento com nodemon
npm run migrate  # Executar migrations
npm run seed     # Popular banco com dados de teste
```

### Frontend
```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run preview  # Preview do build
npm run lint     # Verificar código
```

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuário atual

### Campanhas
- `GET /api/campaigns` - Listar campanhas
- `GET /api/campaigns/:id` - Detalhes da campanha
- `POST /api/campaigns` - Criar campanha
- `PUT /api/campaigns/:id` - Atualizar campanha
- `POST /api/campaigns/:id/sync` - Sincronizar com Google Ads

### Métricas
- `GET /api/metrics/:campaignId` - Métricas da campanha
- `GET /api/metrics/:campaignId/daily` - Métricas diárias

### Chat
- `GET /api/chat/conversations` - Listar conversas
- `GET /api/chat/conversations/:id/messages` - Mensagens
- `POST /api/chat/messages` - Enviar mensagem

### Alertas
- `GET /api/alerts` - Listar alertas
- `PUT /api/alerts/:id/read` - Marcar como lido
- `PUT /api/alerts/read-all` - Marcar todos como lidos

### IA
- `GET /api/ai/recommendations` - Listar recomendações
- `POST /api/ai/recommendations/generate` - Gerar novas
- `POST /api/ai/recommendations/:id/apply` - Aplicar
- `POST /api/ai/recommendations/:id/reject` - Rejeitar

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se tiver dúvidas ou problemas:

1. Verifique se todas as variáveis de ambiente estão configuradas
2. Verifique se o banco de dados está acessível
3. Verifique os logs do console para erros
4. Abra uma issue no GitHub

---

Desenvolvido com ❤️ para gestores de tráfego pago
