// =============================================================================
// ALERT ROUTES - Rotas para Alertas Inteligentes
// Define endpoints REST para gerenciamento de alertas
// =============================================================================

import { Router } from 'express';
import * as alertController from '../controllers/alert.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// =============================================================================
// LISTAGEM E CONSULTA
// =============================================================================

// GET /alerts - Lista alertas com filtros e paginação
router.get('/', alertController.list);

// GET /alerts/stats - Estatísticas de alertas
router.get('/stats', alertController.getStats);

// GET /alerts/thresholds - Retorna thresholds padrão
router.get('/thresholds', alertController.getThresholds);

// GET /alerts/campaign/:campaignId - Alertas de uma campanha
router.get('/campaign/:campaignId', alertController.listByCampaign);

// GET /alerts/:id - Busca alerta por ID
router.get('/:id', alertController.getById);

// =============================================================================
// AÇÕES EM ALERTAS
// =============================================================================

// PUT /alerts/read-all - Marca todos como lidos
router.put('/read-all', alertController.markAllAsRead);

// PUT /alerts/read-multiple - Marca múltiplos como lidos
router.put('/read-multiple', alertController.markMultipleAsRead);

// PUT /alerts/:id/read - Marca como lido
router.put('/:id/read', alertController.markAsRead);

// PUT /alerts/:id/acknowledge - Reconhece alerta
router.put('/:id/acknowledge', alertController.acknowledge);

// PUT /alerts/:id/resolve - Resolve alerta
router.put('/:id/resolve', alertController.resolve);

// PUT /alerts/:id/dismiss - Descarta alerta
router.put('/:id/dismiss', alertController.dismiss);

// =============================================================================
// GERAÇÃO DE ALERTAS
// =============================================================================

// POST /alerts/analyze/:campaignId - Analisa uma campanha
router.post('/analyze/:campaignId', alertController.analyzeCampaign);

// POST /alerts/analyze-all - Analisa todas as campanhas
router.post('/analyze-all', alertController.analyzeAll);

// =============================================================================
// GERENCIAMENTO
// =============================================================================

// DELETE /alerts/:id - Remove alerta (apenas resolvidos/descartados)
router.delete('/:id', alertController.remove);

export default router;
