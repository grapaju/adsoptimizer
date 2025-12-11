/**
 * Rotas para métricas e dashboards
 * Define endpoints para métricas de campanhas e dashboards
 */
import express from 'express';
import metricsController from '../controllers/metrics.controller.js';
import { authMiddleware, managerOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Dashboard do gestor
router.get('/dashboard/manager', managerOnly, metricsController.getManagerDashboard);

// Dashboard do cliente
router.get('/dashboard/client', metricsController.getClientDashboard);

// Métricas diárias de uma campanha
router.get('/daily/:campaignId', metricsController.getDaily);

// Métricas em tempo real de uma campanha
router.get('/realtime/:campaignId', metricsController.getRealtime);

// Comparar períodos
router.get('/campaign/:campaignId/compare', metricsController.compareMetrics);

// Sincronizar métricas com Google Ads
router.post('/sync/:campaignId', managerOnly, metricsController.sync);

export default router;
