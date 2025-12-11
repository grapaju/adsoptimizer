// =============================================================================
// HISTORY ROUTES - Rotas de histórico de alterações / Audit Log
// Endpoints REST para visualização de timeline e auditoria
// =============================================================================

import express from 'express';
import * as historyController from '../controllers/history.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// =============================================================================
// ROTAS DE LISTAGEM
// =============================================================================

// GET /history - Lista histórico com filtros avançados
router.get('/', historyController.list);

// GET /history/recent - Alterações recentes (últimas 24h)
router.get('/recent', historyController.getRecent);

// GET /history/stats - Estatísticas de alterações
router.get('/stats', historyController.getStats);

// GET /history/entity-types - Lista tipos de entidade
router.get('/entity-types', historyController.getEntityTypes);

// GET /history/action-types - Lista tipos de ação
router.get('/action-types', historyController.getActionTypes);

// =============================================================================
// ROTAS POR ENTIDADE
// =============================================================================

// GET /history/entity/:entityType/:entityId - Histórico de uma entidade
router.get('/entity/:entityType/:entityId', historyController.getByEntity);

// GET /history/campaign/:campaignId - Histórico de uma campanha
router.get('/campaign/:campaignId', historyController.getByCampaign);

// GET /history/campaign/:campaignId/timeline - Timeline visual de campanha
router.get('/campaign/:campaignId/timeline', historyController.getTimeline);

// GET /history/user/:userId - Histórico de ações de um usuário
router.get('/user/:userId', historyController.getByUser);

// =============================================================================
// ROTAS DE DETALHE E CRIAÇÃO
// =============================================================================

// GET /history/:historyId - Detalhes de um registro
router.get('/:historyId', historyController.getById);

// POST /history - Criar registro manual
router.post('/', historyController.create);

export default router;
