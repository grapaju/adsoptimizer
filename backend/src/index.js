/**
 * Arquivo principal do servidor
 * Configura Express, Socket.IO e inicializa a aplicação
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// Importar cliente Prisma
const prisma = require('./lib/prisma');

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const campaignRoutes = require('./routes/campaign.routes');
const metricsRoutes = require('./routes/metrics.routes');
const chatRoutes = require('./routes/chat.routes');
const alertRoutes = require('./routes/alert.routes');
const historyRoutes = require('./routes/history.routes');
const aiRoutes = require('./routes/ai.routes');
const clientRoutes = require('./routes/client.routes');
const userRoutes = require('./routes/user.routes');
const googleAdsRoutes = require('./routes/googleAds.routes');

// Importar middlewares
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();
const server = http.createServer(app);

// Configurar Socket.IO para chat em tempo real
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middlewares globais
app.use(helmet()); // Segurança
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev')); // Log de requisições
app.use(express.json()); // Parser JSON
app.use(express.urlencoded({ extended: true })); // Parser URL encoded

// Disponibilizar io para as rotas (para emissão de eventos)
app.set('io', io);

// Rotas da API
app.use('/api/auth', authRoutes);        // Autenticação (login, registro, perfil)
app.use('/api/clients', clientRoutes);   // CRUD de clientes
app.use('/api/users', userRoutes);       // Rotas legado de usuários
app.use('/api/campaigns', campaignRoutes); // CRUD de campanhas e sincronização
app.use('/api/metrics', metricsRoutes);  // Métricas e dashboards
app.use('/api/chat', chatRoutes);        // Chat entre gestor e clientes
app.use('/api/alerts', alertRoutes);     // Alertas e configurações
app.use('/api/history', historyRoutes);  // Histórico de alterações
app.use('/api/ai', aiRoutes);            // Recomendações e análises IA
app.use('/api/google-ads', googleAdsRoutes); // Integração Google Ads API

// Health check - verifica status da API e conexão com banco
app.get('/api/health', async (req, res) => {
  try {
    // Testa conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'OK', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      database: 'disconnected',
      timestamp: new Date().toISOString() 
    });
  }
});

// =============================================================================
// SERVIR FRONTEND EM PRODUÇÃO
// O backend serve os arquivos estáticos do frontend buildado
// =============================================================================
if (process.env.NODE_ENV === 'production') {
  // Servir arquivos estáticos do frontend
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Qualquer rota não-API retorna o index.html (SPA)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// Configurar Socket.IO para eventos em tempo real
require('./services/socket.service')(io);

const PORT = process.env.PORT || 3001;

/**
 * Função para encerrar graciosamente a aplicação
 * Fecha conexões do Prisma antes de terminar
 */
async function gracefulShutdown() {
  console.log('\n🛑 Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
}

// Handlers para encerramento gracioso
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.IO configurado para chat em tempo real`);
});

module.exports = { app, io };
