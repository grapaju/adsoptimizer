/**
 * Rotas para métricas e dashboards
 * Define endpoints para métricas de campanhas e dashboards
 */
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metrics.controller');
const { authMiddleware, managerOnly } = require('../middlewares/auth.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Dashboard do gestor
router.get('/dashboard/manager', managerOnly, metricsController.getManagerDashboard);

// Dashboard do cliente
router.get('/dashboard/client', metricsController.getClientDashboard);

// Métricas de uma campanha
router.get('/campaign/:campaignId', metricsController.getCampaignMetrics);

// Comparar períodos
router.get('/campaign/:campaignId/compare', metricsController.compareMetrics);

// Sincronizar métricas com Google Ads
router.post('/sync', managerOnly, metricsController.syncMetrics);

module.exports = router;
