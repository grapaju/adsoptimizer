// =============================================================================
// AI CONTROLLER - Controlador de IA para Performance Max
// Endpoints completos para diagnóstico, geração de anúncios e análise
// =============================================================================

import {
  generatePmaxRecommendations,
  generateAdSuggestions,
  rewriteLowPerformanceAssets,
  analyzeImage,
  generateAdVariations
} from '../services/ai/pmax.ai.service.js';
import aiService from '../services/ai.service.js';
import prisma from '../lib/prisma.js';
import googleAdsService from '../services/googleAds/index.js';

/**
 * GET /ai/campaigns/:campaignId/diagnosis
 * Gera diagnóstico completo de campanha PMax com IA
 */
export async function getDiagnosis(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate } = req.query;

    // Buscar campanha
    const campaign = await prisma.campaign.findUnique({
      where: { id: parseInt(campaignId) },
      include: {
        client: true,
        assetGroups: {
          include: { assets: true }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campanha não encontrada' });
    }

    // Buscar métricas
    const metrics = await prisma.campaignMetric.findMany({
      where: {
        campaignId: parseInt(campaignId),
        ...(startDate && endDate ? {
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        } : {})
      },
      orderBy: { date: 'desc' },
      take: 30
    });

    // Agregar métricas
    const aggregatedMetrics = aggregateMetrics(metrics);
    aggregatedMetrics.budget = Number(campaign.budgetDaily);

    // Buscar asset groups, listing groups e search terms
    const assetGroups = campaign.assetGroups;
    
    // Buscar dados do Google Ads se disponível
    let listingGroups = [];
    let searchTerms = [];
    
    if (campaign.googleCampaignId && campaign.client.googleAdsCustomerId) {
      try {
        const googleData = await googleAdsService.getCampaignDetails(
          campaign.client.googleAdsCustomerId,
          campaign.googleCampaignId
        );
        listingGroups = googleData.listingGroups || [];
        searchTerms = googleData.searchTerms || [];
      } catch (err) {
        console.log('Não foi possível buscar dados do Google Ads:', err.message);
      }
    }

    // Gerar diagnóstico com IA
    const diagnosis = await generatePmaxRecommendations({
      metrics: aggregatedMetrics,
      assetGroups,
      listingGroups,
      searchTerms,
      campaignInfo: {
        id: campaign.id,
        name: campaign.name,
        budget: Number(campaign.budgetDaily),
        status: campaign.status,
        targetRoas: campaign.targetRoas
      }
    });

    // Salvar recomendações no banco
    if (diagnosis.success && diagnosis.diagnosis?.prioritizedActions) {
      for (const action of diagnosis.diagnosis.prioritizedActions.slice(0, 5)) {
        await prisma.recommendation.create({
          data: {
            campaignId: parseInt(campaignId),
            type: action.category?.toUpperCase() || 'OPTIMIZATION',
            title: action.action,
            description: action.expectedImpact || '',
            priority: action.priority || 3,
            status: 'PENDING',
            data: action
          }
        });
      }
    }

    res.json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /ai/recommendations/:campaignId
 * Gera recomendações de IA para uma campanha (legado)
 */
export async function getRecommendations(req, res, next) {
  try {
    const { campaignId } = req.params;

    const recommendations = await aiService.generateRecommendations(parseInt(campaignId), req.user);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/analyze-assets/:campaignId
 * Analisa assets de uma campanha
 */
async function analyzeAssets(req, res, next) {
  try {
    const { campaignId } = req.params;

    const analysis = await aiService.analyzeAssets(parseInt(campaignId));

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/suggest-ads/:campaignId
 * Sugere novos anúncios baseado no desempenho
 */
async function suggestAds(req, res, next) {
  try {
    const { campaignId } = req.params;

    const suggestions = await aiService.suggestAds(parseInt(campaignId));

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/generate-ads
 * Gera sugestões completas de anúncios
 */
export async function generateAds(req, res, next) {
  try {
    const { product, audience, keywords, tone, brand } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Informações do produto são obrigatórias'
      });
    }

    const suggestions = await generateAdSuggestions({
      product: typeof product === 'string' ? product : JSON.stringify(product),
      audience: audience || '',
      keywords: keywords || [],
      tone: tone || 'profissional',
      brand: brand || {}
    });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/rewrite-assets
 * Reescreve ativos com baixa performance
 */
export async function rewriteAssets(req, res, next) {
  try {
    const { assets, context } = req.body;

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Lista de ativos é obrigatória'
      });
    }

    const result = await rewriteLowPerformanceAssets({
      assets,
      context: context || {}
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/analyze-image
 * Analisa imagem para uso em anúncios
 */
export async function analyzeAdImage(req, res, next) {
  try {
    const { imageUrl, productContext } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'URL da imagem é obrigatória'
      });
    }

    const analysis = await analyzeImage({
      imageUrl,
      productContext: productContext || ''
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/generate-variations
 * Gera 5 variações de anúncio
 */
export async function createAdVariations(req, res, next) {
  try {
    const { baseAd, objective } = req.body;

    if (!baseAd) {
      return res.status(400).json({
        success: false,
        message: 'Anúncio base é obrigatório'
      });
    }

    const variations = await generateAdVariations({
      baseAd,
      objective: objective || 'conversion'
    });

    res.json({
      success: true,
      data: variations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/analyze-assets/:campaignId
 * Analisa assets de uma campanha
 */
export async function analyzeAssets(req, res, next) {
  try {
    const { campaignId } = req.params;

    const analysis = await aiService.analyzeAssets(parseInt(campaignId), req.user);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/suggest-ads/:campaignId
 * Sugere novos anúncios baseado no desempenho
 */
export async function suggestAds(req, res, next) {
  try {
    const { campaignId } = req.params;

    const suggestions = await aiService.suggestAds(parseInt(campaignId), req.user);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /ai/campaigns/:campaignId/recommendations
 * Lista recomendações existentes
 */
export async function listRecommendations(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { status } = req.query;

    const where = {
      campaignId: parseInt(campaignId)
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    const recommendations = await prisma.recommendation.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /ai/recommendations/:recommendationId/apply
 * Marca recomendação como aplicada
 */
export async function applyRecommendation(req, res, next) {
  try {
    const { recommendationId } = req.params;

    const recommendation = await prisma.recommendation.update({
      where: { id: parseInt(recommendationId) },
      data: {
        status: 'APPLIED',
        appliedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /ai/recommendations/:recommendationId/dismiss
 * Descarta uma recomendação
 */
export async function dismissRecommendation(req, res, next) {
  try {
    const { recommendationId } = req.params;
    const { reason } = req.body;

    const recommendation = await prisma.recommendation.update({
      where: { id: parseInt(recommendationId) },
      data: {
        status: 'DISMISSED',
        dismissedReason: reason || null
      }
    });

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/generate-headlines
 * Gera headlines usando IA
 */
export async function generateHeadlines(req, res, next) {
  try {
    const { product, targetAudience, benefits, currentHeadlines } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Produto é obrigatório',
      });
    }

    const suggestions = await generateAdSuggestions({
      product,
      audience: targetAudience || '',
      keywords: benefits ? benefits.split(',').map(b => b.trim()) : [],
      tone: 'profissional'
    });

    res.json({
      success: true,
      data: {
        headlines: suggestions.suggestions?.headlines || []
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/generate-descriptions
 * Gera descriptions usando IA
 */
export async function generateDescriptions(req, res, next) {
  try {
    const { product, targetAudience, benefits, currentDescriptions } = req.body;

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Produto é obrigatório',
      });
    }

    const suggestions = await generateAdSuggestions({
      product,
      audience: targetAudience || '',
      keywords: benefits ? benefits.split(',').map(b => b.trim()) : [],
      tone: 'profissional'
    });

    res.json({
      success: true,
      data: {
        descriptions: suggestions.suggestions?.descriptions || []
      }
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Agrega métricas de múltiplos dias
 */
function aggregateMetrics(metrics) {
  if (!metrics.length) {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      cvr: 0,
      roas: 0,
      cpa: 0
    };
  }

  const totals = metrics.reduce((acc, m) => ({
    impressions: acc.impressions + (m.impressions || 0),
    clicks: acc.clicks + (m.clicks || 0),
    cost: acc.cost + Number(m.cost || 0),
    conversions: acc.conversions + Number(m.conversions || 0),
    conversionValue: acc.conversionValue + Number(m.conversionValue || 0),
    searchImpressionShare: m.searchImpressionShare || acc.searchImpressionShare,
    searchBudgetLostIS: m.searchLostISBudget || acc.searchBudgetLostIS,
    searchRankLostIS: m.searchLostISRank || acc.searchRankLostIS
  }), {
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    conversionValue: 0,
    searchImpressionShare: 0,
    searchBudgetLostIS: 0,
    searchRankLostIS: 0
  });

  return {
    ...totals,
    ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : 0,
    cvr: totals.clicks > 0 ? totals.conversions / totals.clicks : 0,
    roas: totals.cost > 0 ? totals.conversionValue / totals.cost : 0,
    cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0
  };
}

// Export default
export default {
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
};
