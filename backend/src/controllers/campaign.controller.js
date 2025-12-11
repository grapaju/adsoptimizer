// =============================================================================
// CAMPAIGN CONTROLLER - Controlador de campanhas
// Endpoints: GET /campaigns, GET /campaigns/:id, POST /campaigns, PUT /campaigns/:id
// =============================================================================

import * as campaignService from '../services/campaign.service.js';
import * as googleAdsService from '../services/googleAds.service.js';
import * as historyService from '../services/history.service.js';

/**
 * GET /campaigns
 * Lista todas as campanhas com filtros
 */
async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, status, search, clientId } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      clientId: clientId ? parseInt(clientId) : null,
      user: req.user,
    };

    const result = await campaignService.getAll(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /campaigns/:id
 * Busca campanha por ID
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await campaignService.getById(parseInt(id));

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campanha não encontrada',
      });
    }

    res.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /campaigns
 * Cria nova campanha
 */
async function create(req, res, next) {
  try {
    const {
      clientId,
      googleCampaignId,
      name,
      type = 'PERFORMANCE_MAX',
      status = 'ENABLED',
      dailyBudget,
      totalBudget,
      targetRoas,
      targetCpa,
      startDate,
      endDate,
      finalUrl,
    } = req.body;

    // Validação básica
    if (!clientId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Cliente e nome são obrigatórios',
      });
    }

    const campaign = await campaignService.create({
      clientId: parseInt(clientId),
      googleCampaignId,
      name,
      type,
      status,
      dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
      totalBudget: totalBudget ? parseFloat(totalBudget) : null,
      targetRoas: targetRoas ? parseFloat(targetRoas) : null,
      targetCpa: targetCpa ? parseFloat(targetCpa) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      finalUrl,
    });

    // Registrar no histórico
    await historyService.logChange({
      campaignId: campaign.id,
      userId: req.user.id,
      changeType: 'CAMPAIGN_CREATED',
      description: `Campanha "${name}" criada`,
      newValue: campaign,
    });

    res.status(201).json({
      success: true,
      message: 'Campanha criada com sucesso',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /campaigns/:id
 * Atualiza campanha
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const campaignId = parseInt(id);

    // Buscar campanha antiga para histórico
    const oldCampaign = await campaignService.getById(campaignId);

    if (!oldCampaign) {
      return res.status(404).json({
        success: false,
        message: 'Campanha não encontrada',
      });
    }

    const {
      name,
      status,
      dailyBudget,
      totalBudget,
      targetRoas,
      targetCpa,
      startDate,
      endDate,
      finalUrl,
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (dailyBudget !== undefined) updateData.dailyBudget = parseFloat(dailyBudget);
    if (totalBudget !== undefined) updateData.totalBudget = parseFloat(totalBudget);
    if (targetRoas !== undefined) updateData.targetRoas = parseFloat(targetRoas);
    if (targetCpa !== undefined) updateData.targetCpa = parseFloat(targetCpa);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (finalUrl !== undefined) updateData.finalUrl = finalUrl;

    const campaign = await campaignService.update(campaignId, updateData);

    // Registrar mudanças específicas no histórico
    const changes = [];
    if (dailyBudget !== undefined && dailyBudget !== oldCampaign.dailyBudget) {
      changes.push({
        field: 'dailyBudget',
        oldValue: oldCampaign.dailyBudget,
        newValue: dailyBudget,
        changeType: 'BUDGET_CHANGE',
      });
    }
    if (targetRoas !== undefined && targetRoas !== oldCampaign.targetRoas) {
      changes.push({
        field: 'targetRoas',
        oldValue: oldCampaign.targetRoas,
        newValue: targetRoas,
        changeType: 'TARGET_ROAS_CHANGE',
      });
    }
    if (status !== undefined && status !== oldCampaign.status) {
      changes.push({
        field: 'status',
        oldValue: oldCampaign.status,
        newValue: status,
        changeType: 'STATUS_CHANGE',
      });
    }

    // Salvar cada mudança no histórico
    for (const change of changes) {
      await historyService.logChange({
        campaignId,
        userId: req.user.id,
        ...change,
        description: `${change.field} alterado de ${change.oldValue} para ${change.newValue}`,
      });
    }

    res.json({
      success: true,
      message: 'Campanha atualizada com sucesso',
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /campaigns/:id
 * Remove campanha
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await campaignService.delete(parseInt(id));

    res.json({
      success: true,
      message: 'Campanha removida com sucesso',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /campaigns/:id/metrics
 * Busca métricas de uma campanha
 */
async function getMetrics(req, res, next) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const metrics = await campaignService.getMetrics(parseInt(id), {
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /campaigns/:id/sync
 * Sincroniza campanha com Google Ads
 */
async function syncWithGoogleAds(req, res, next) {
  try {
    const { id } = req.params;
    const result = await googleAdsService.syncMetrics(parseInt(id));

    res.json({
      success: true,
      message: 'Sincronização concluída',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /campaigns/:id/asset-groups
 * Lista asset groups de uma campanha
 */
async function getAssetGroups(req, res, next) {
  try {
    const { id } = req.params;
    
    const campaign = await campaignService.getById(parseInt(id));
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campanha não encontrada',
      });
    }

    const client = campaign.client;
    if (!client.googleAdsCustomerId || !client.googleRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do Google Ads não configuradas',
      });
    }

    const assetGroups = await googleAdsService.getAssetGroups(
      client.googleAdsCustomerId,
      client.googleRefreshToken,
      campaign.googleCampaignId
    );

    res.json({
      success: true,
      data: assetGroups,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /campaigns/:id/search-terms
 * Lista termos de pesquisa de uma campanha
 */
async function getSearchTerms(req, res, next) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const campaign = await campaignService.getById(parseInt(id));
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campanha não encontrada',
      });
    }

    const client = campaign.client;
    if (!client.googleAdsCustomerId || !client.googleRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do Google Ads não configuradas',
      });
    }

    // Padrão: últimos 30 dias
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const searchTerms = await googleAdsService.getSearchTerms(
      client.googleAdsCustomerId,
      client.googleRefreshToken,
      campaign.googleCampaignId,
      start,
      end
    );

    res.json({
      success: true,
      data: searchTerms,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /campaigns/:id/listing-groups
 * Lista listing groups de uma campanha
 */
async function getListingGroups(req, res, next) {
  try {
    const { id } = req.params;

    const campaign = await campaignService.getById(parseInt(id));
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campanha não encontrada',
      });
    }

    const client = campaign.client;
    if (!client.googleAdsCustomerId || !client.googleRefreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Credenciais do Google Ads não configuradas',
      });
    }

    const listingGroups = await googleAdsService.getListingGroups(
      client.googleAdsCustomerId,
      client.googleRefreshToken,
      campaign.googleCampaignId
    );

    res.json({
      success: true,
      data: listingGroups,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  list,
  getById,
  create,
  update,
  remove,
  getMetrics,
  syncWithGoogleAds,
  getAssetGroups,
  getSearchTerms,
  getListingGroups,
};
