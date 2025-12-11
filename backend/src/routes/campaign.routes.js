const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaign.controller');
const { authMiddleware, managerOnly } = require('../middlewares/auth.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar campanhas
router.get('/', campaignController.list);

// Obter campanha por ID
router.get('/:id', campaignController.getById);

// Métricas de uma campanha
router.get('/:id/metrics', campaignController.getMetrics);

// Asset groups de uma campanha
router.get('/:id/asset-groups', campaignController.getAssetGroups);

// Termos de pesquisa de uma campanha
router.get('/:id/search-terms', campaignController.getSearchTerms);

// Listing groups de uma campanha
router.get('/:id/listing-groups', campaignController.getListingGroups);

// Criar campanha (apenas gestor)
router.post('/', managerOnly, campaignController.create);

// Atualizar campanha
router.put('/:id', campaignController.update);

// Sincronizar com Google Ads
router.post('/:id/sync', campaignController.syncWithGoogleAds);

// Deletar campanha (apenas gestor)
router.delete('/:id', managerOnly, campaignController.remove);

module.exports = router;
