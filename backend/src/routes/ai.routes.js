/**
 * Rotas para funcionalidades de IA
 * Define endpoints para diagnóstico, geração de anúncios, análise de assets e recomendações
 */
import { Router } from 'express';
import {
  getDiagnosis,
  getRecommendations,
  generateAds,
  rewriteAssets,
  analyzeAdImage,
  createAdVariations,
  analyzeAssets,
  suggestAds,
  listRecommendations,
  applyRecommendation,
  dismissRecommendation,
  generateHeadlines,
  generateDescriptions
} from '../controllers/ai.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// =============================================================================
// DIAGNÓSTICO E RECOMENDAÇÕES DE CAMPANHA
// =============================================================================

// Diagnóstico completo de campanha PMax
router.get('/campaigns/:campaignId/diagnosis', getDiagnosis);

// Listar recomendações existentes de uma campanha
router.get('/campaigns/:campaignId/recommendations', listRecommendations);

// Gerar novas recomendações para campanha (legado)
router.post('/campaigns/:campaignId/recommendations', getRecommendations);

// =============================================================================
// GERAÇÃO DE ANÚNCIOS
// =============================================================================

// Gerar sugestões completas de anúncios
router.post('/generate-ads', generateAds);

// Gerar 5 variações de um anúncio base
router.post('/generate-variations', createAdVariations);

// Gerar apenas headlines
router.post('/generate-headlines', generateHeadlines);

// Gerar apenas descrições
router.post('/generate-descriptions', generateDescriptions);

// =============================================================================
// ANÁLISE E OTIMIZAÇÃO DE ASSETS
// =============================================================================

// Analisar assets de uma campanha
router.post('/campaigns/:campaignId/analyze-assets', analyzeAssets);

// Reescrever ativos com baixa performance
router.post('/rewrite-assets', rewriteAssets);

// Analisar imagem para anúncio
router.post('/analyze-image', analyzeAdImage);

// =============================================================================
// SUGESTÕES E AÇÕES
// =============================================================================

// Sugerir novos anúncios para campanha
router.post('/campaigns/:campaignId/suggest-ads', suggestAds);

// Aplicar recomendação
router.put('/recommendations/:recommendationId/apply', applyRecommendation);

// Descartar recomendação
router.put('/recommendations/:recommendationId/dismiss', dismissRecommendation);

export default router;
