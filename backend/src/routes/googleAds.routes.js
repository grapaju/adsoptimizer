/**
 * Rotas para integração com Google Ads API
 * 
 * Endpoints para autenticação OAuth2, métricas e dados de campanhas Performance Max
 */

import express from 'express';
import googleAdsController from '../controllers/googleAds.controller.js';
import { authMiddleware, managerOnly } from '../middlewares/auth.middleware.js';

const router = express.Router();

// =============================================================================
// ROTAS PÚBLICAS (OAuth2)
// =============================================================================

// Callback do OAuth2 (não requer autenticação JWT)
router.get('/auth/callback', googleAdsController.authCallback);

// Gerar URL de autorização OAuth2 (público para configuração inicial)
router.get('/auth/url', googleAdsController.getAuthUrl);

// =============================================================================
// ROTAS PROTEGIDAS (Requerem autenticação JWT)
// =============================================================================

router.use(authMiddleware);

// -----------------------------------------------------------------------------
// AUTENTICAÇÃO OAUTH2
// -----------------------------------------------------------------------------

// Conectar conta Google Ads a um cliente
router.post('/auth/connect', managerOnly, googleAdsController.connectAccount);

// Validar credenciais de um cliente
router.post('/auth/validate', googleAdsController.validateCredentials);

// Listar contas Google Ads acessíveis
router.get('/accounts', googleAdsController.listAccounts);

// -----------------------------------------------------------------------------
// CAMPANHAS
// -----------------------------------------------------------------------------

// Listar campanhas Performance Max
router.get('/campaigns', googleAdsController.listCampaigns);

// -----------------------------------------------------------------------------
// MÉTRICAS DE CAMPANHA
// -----------------------------------------------------------------------------

// Métricas gerais de uma campanha
router.get('/metrics/campaign/:campaignId', googleAdsController.getCampaignMetrics);

// Métricas avançadas (impression share, etc)
router.get('/metrics/campaign/:campaignId/advanced', googleAdsController.getAdvancedMetrics);

// Métricas diárias para gráficos
router.get('/metrics/campaign/:campaignId/daily', googleAdsController.getDailyMetrics);

// Todas as métricas (dashboard)
router.get('/metrics/campaign/:campaignId/all', googleAdsController.getAllMetrics);

// Comparar métricas entre períodos
router.get('/metrics/campaign/:campaignId/compare', googleAdsController.compareMetrics);

// -----------------------------------------------------------------------------
// ASSET GROUPS
// -----------------------------------------------------------------------------

// Listar Asset Groups de uma campanha
router.get('/campaigns/:campaignId/asset-groups', googleAdsController.getAssetGroups);

// Métricas de Asset Groups
router.get('/campaigns/:campaignId/asset-groups/metrics', googleAdsController.getAssetGroupMetrics);

// Listar Assets de um Asset Group
router.get('/asset-groups/:assetGroupId/assets', googleAdsController.getAssets);

// Métricas de Assets individuais
router.get('/asset-groups/:assetGroupId/metrics', googleAdsController.getAssetMetrics);

// -----------------------------------------------------------------------------
// LISTING GROUPS (Produtos/Categorias)
// -----------------------------------------------------------------------------

// Listar Listing Groups de uma campanha
router.get('/campaigns/:campaignId/listing-groups', googleAdsController.getListingGroups);

// Métricas de Listing Groups
router.get('/campaigns/:campaignId/listing-groups/metrics', googleAdsController.getListingGroupMetrics);

// -----------------------------------------------------------------------------
// SEARCH TERMS
// -----------------------------------------------------------------------------

// Listar termos de pesquisa
router.get('/campaigns/:campaignId/search-terms', googleAdsController.getSearchTerms);

// Métricas de termos de pesquisa
router.get('/campaigns/:campaignId/search-terms/metrics', googleAdsController.getSearchTermMetrics);

// -----------------------------------------------------------------------------
// UTILITÁRIOS
// -----------------------------------------------------------------------------

// Limpar cache de queries
router.post('/cache/clear', managerOnly, googleAdsController.clearCache);

export default router;
