/**
 * Rotas para funcionalidades de IA
 * Define endpoints para diagnóstico, geração de anúncios, análise de assets e recomendações
 */
import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// =============================================================================
// DIAGNÓSTICO E RECOMENDAÇÕES DE CAMPANHA
// =============================================================================

// Diagnóstico completo de campanha PMax
router.get('/campaigns/:campaignId/diagnosis', aiController.getDiagnosis);

// Listar recomendações existentes de uma campanha
router.get('/campaigns/:campaignId/recommendations', aiController.listRecommendations);

// Gerar novas recomendações para campanha (legado)
router.post('/campaigns/:campaignId/recommendations', aiController.getRecommendations);

// =============================================================================
// GERAÇÃO DE ANÚNCIOS
// =============================================================================

// Gerar sugestões completas de anúncios
router.post('/generate-ads', aiController.generateAds);

// Gerar 5 variações de um anúncio base
router.post('/generate-variations', aiController.createAdVariations);

// Gerar apenas headlines
router.post('/generate-headlines', aiController.generateHeadlines);

// Gerar apenas descrições
router.post('/generate-descriptions', aiController.generateDescriptions);

// =============================================================================
// ANÁLISE E OTIMIZAÇÃO DE ASSETS
// =============================================================================

// Analisar assets de uma campanha
router.post('/campaigns/:campaignId/analyze-assets', aiController.analyzeAssets);

// Reescrever ativos com baixa performance
router.post('/rewrite-assets', aiController.rewriteAssets);

// Analisar imagem para anúncio
router.post('/analyze-image', aiController.analyzeAdImage);

// =============================================================================
// SUGESTÕES E AÇÕES
// =============================================================================

// Sugerir novos anúncios para campanha
router.post('/campaigns/:campaignId/suggest-ads', aiController.suggestAds);

// Aplicar recomendação
router.put('/recommendations/:recommendationId/apply', aiController.applyRecommendation);

// Descartar recomendação
router.put('/recommendations/:recommendationId/dismiss', aiController.dismissRecommendation);

export default router;
