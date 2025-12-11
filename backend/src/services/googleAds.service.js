// =============================================================================
// GOOGLE ADS SERVICE - Integração com Google Ads API
// Gerencia a comunicação com a API do Google Ads para campanhas Performance Max
// =============================================================================

import { GoogleAdsApi } from 'google-ads-api';
import prisma from '../lib/prisma.js';

/**
 * Cliente Google Ads configurado
 */
const googleAdsClient = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

/**
 * Obtém um customer do Google Ads
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @returns {Object} Customer do Google Ads
 */
function getCustomer(customerId, refreshToken) {
  return googleAdsClient.Customer({
    customer_id: customerId.replace(/-/g, ''),
    refresh_token: refreshToken,
  });
}

/**
 * Busca campanhas Performance Max da conta
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @returns {Array} Lista de campanhas Performance Max
 */
async function getPerformanceMaxCampaigns(customerId, refreshToken) {
  try {
    const customer = getCustomer(customerId, refreshToken);

    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.target_roas.target_roas,
        campaign.target_cpa.target_cpa_micros,
        campaign_budget.amount_micros,
        campaign.start_date,
        campaign.end_date
      FROM campaign
      WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
        AND campaign.status != 'REMOVED'
      ORDER BY campaign.name
    `);

    return campaigns.map(row => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      channelType: row.campaign.advertising_channel_type,
      biddingStrategy: row.campaign.bidding_strategy_type,
      targetRoas: row.campaign.target_roas?.target_roas,
      targetCpaMicros: row.campaign.target_cpa?.target_cpa_micros,
      budgetMicros: row.campaign_budget?.amount_micros,
      startDate: row.campaign.start_date,
      endDate: row.campaign.end_date,
    }));
  } catch (error) {
    console.error('Erro ao buscar campanhas Performance Max:', error);
    throw error;
  }
}

/**
 * Busca métricas de uma campanha por período
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @param {string} campaignId - ID da campanha
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Array} Métricas diárias
 */
async function getCampaignMetrics(customerId, refreshToken, campaignId, startDate, endDate) {
  try {
    const customer = getCustomer(customerId, refreshToken);

    const metrics = await customer.query(`
      SELECT
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_per_conversion,
        metrics.video_views,
        metrics.engagements,
        metrics.all_conversions,
        metrics.view_through_conversions
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY segments.date DESC
    `);

    return metrics.map(row => ({
      date: row.segments.date,
      impressions: row.metrics.impressions,
      clicks: row.metrics.clicks,
      cost: row.metrics.cost_micros / 1000000,
      conversions: row.metrics.conversions,
      conversionValue: row.metrics.conversions_value,
      ctr: row.metrics.ctr * 100,
      cpc: row.metrics.average_cpc / 1000000,
      cpa: row.metrics.cost_per_conversion / 1000000,
      videoViews: row.metrics.video_views,
      engagements: row.metrics.engagements,
      allConversions: row.metrics.all_conversions,
      viewThroughConversions: row.metrics.view_through_conversions,
    }));
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    throw error;
  }
}

/**
 * Busca asset groups de uma campanha
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @param {string} campaignId - ID da campanha
 * @returns {Array} Lista de asset groups
 */
async function getAssetGroups(customerId, refreshToken, campaignId) {
  try {
    const customer = getCustomer(customerId, refreshToken);

    const assetGroups = await customer.query(`
      SELECT
        asset_group.id,
        asset_group.name,
        asset_group.status,
        asset_group.final_urls,
        asset_group.ad_strength
      FROM asset_group
      WHERE asset_group.campaign = 'customers/${customerId.replace(/-/g, '')}/campaigns/${campaignId}'
      ORDER BY asset_group.name
    `);

    return assetGroups.map(row => ({
      id: row.asset_group.id,
      name: row.asset_group.name,
      status: row.asset_group.status,
      finalUrls: row.asset_group.final_urls,
      adStrength: row.asset_group.ad_strength,
    }));
  } catch (error) {
    console.error('Erro ao buscar asset groups:', error);
    throw error;
  }
}

/**
 * Busca assets de um asset group
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @param {string} assetGroupId - ID do asset group
 * @returns {Array} Lista de assets
 */
async function getAssetGroupAssets(customerId, refreshToken, assetGroupId) {
  try {
    const customer = getCustomer(customerId, refreshToken);
    const cleanCustomerId = customerId.replace(/-/g, '');

    const assets = await customer.query(`
      SELECT
        asset.id,
        asset.name,
        asset.type,
        asset.text_asset.text,
        asset.image_asset.full_size.url,
        asset_group_asset.field_type,
        asset_group_asset.performance_label
      FROM asset_group_asset
      WHERE asset_group_asset.asset_group = 'customers/${cleanCustomerId}/assetGroups/${assetGroupId}'
    `);

    return assets.map(row => ({
      id: row.asset.id,
      name: row.asset.name,
      type: row.asset.type,
      text: row.asset.text_asset?.text,
      imageUrl: row.asset.image_asset?.full_size?.url,
      fieldType: row.asset_group_asset.field_type,
      performanceLabel: row.asset_group_asset.performance_label,
    }));
  } catch (error) {
    console.error('Erro ao buscar assets:', error);
    throw error;
  }
}

/**
 * Busca termos de pesquisa de uma campanha
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @param {string} campaignId - ID da campanha
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Array} Lista de termos de pesquisa com métricas
 */
async function getSearchTerms(customerId, refreshToken, campaignId, startDate, endDate) {
  try {
    const customer = getCustomer(customerId, refreshToken);

    const searchTerms = await customer.query(`
      SELECT
        search_term_view.search_term,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        search_term_view.status
      FROM search_term_view
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${startDate}' AND '${endDate}'
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `);

    // Agregar por termo de pesquisa
    const termsMap = new Map();

    for (const row of searchTerms) {
      const term = row.search_term_view.search_term;
      const existing = termsMap.get(term) || {
        searchTerm: term,
        status: row.search_term_view.status,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionValue: 0,
      };

      existing.impressions += row.metrics.impressions || 0;
      existing.clicks += row.metrics.clicks || 0;
      existing.cost += (row.metrics.cost_micros || 0) / 1000000;
      existing.conversions += row.metrics.conversions || 0;
      existing.conversionValue += row.metrics.conversions_value || 0;

      termsMap.set(term, existing);
    }

    return Array.from(termsMap.values()).map(term => ({
      ...term,
      ctr: term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0,
      cpc: term.clicks > 0 ? term.cost / term.clicks : 0,
      cpa: term.conversions > 0 ? term.cost / term.conversions : 0,
      roas: term.cost > 0 ? term.conversionValue / term.cost : 0,
    }));
  } catch (error) {
    console.error('Erro ao buscar termos de pesquisa:', error);
    throw error;
  }
}

/**
 * Busca listing groups (grupos de listagem) de uma campanha
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @param {string} campaignId - ID da campanha
 * @returns {Array} Lista de listing groups com métricas
 */
async function getListingGroups(customerId, refreshToken, campaignId) {
  try {
    const customer = getCustomer(customerId, refreshToken);
    const cleanCustomerId = customerId.replace(/-/g, '');

    const listingGroups = await customer.query(`
      SELECT
        asset_group_listing_group_filter.id,
        asset_group_listing_group_filter.type,
        asset_group_listing_group_filter.vertical,
        asset_group_listing_group_filter.case_value.product_brand.value,
        asset_group_listing_group_filter.case_value.product_category.category_id,
        asset_group_listing_group_filter.case_value.product_type.value,
        asset_group_listing_group_filter.case_value.product_custom_attribute.value,
        asset_group.id,
        asset_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM asset_group_listing_group_filter
      WHERE asset_group.campaign = 'customers/${cleanCustomerId}/campaigns/${campaignId}'
    `);

    return listingGroups.map(row => ({
      id: row.asset_group_listing_group_filter.id,
      type: row.asset_group_listing_group_filter.type,
      vertical: row.asset_group_listing_group_filter.vertical,
      productBrand: row.asset_group_listing_group_filter.case_value?.product_brand?.value,
      productCategory: row.asset_group_listing_group_filter.case_value?.product_category?.category_id,
      productType: row.asset_group_listing_group_filter.case_value?.product_type?.value,
      productCustomAttribute: row.asset_group_listing_group_filter.case_value?.product_custom_attribute?.value,
      assetGroupId: row.asset_group.id,
      assetGroupName: row.asset_group.name,
      impressions: row.metrics.impressions || 0,
      clicks: row.metrics.clicks || 0,
      cost: (row.metrics.cost_micros || 0) / 1000000,
      conversions: row.metrics.conversions || 0,
      conversionValue: row.metrics.conversions_value || 0,
      ctr: row.metrics.impressions > 0 ? (row.metrics.clicks / row.metrics.impressions) * 100 : 0,
      roas: row.metrics.cost_micros > 0
        ? row.metrics.conversions_value / (row.metrics.cost_micros / 1000000)
        : 0,
    }));
  } catch (error) {
    console.error('Erro ao buscar listing groups:', error);
    throw error;
  }
}

/**
 * Busca recomendações do Google Ads para a conta
 * @param {string} customerId - ID da conta Google Ads
 * @param {string} refreshToken - Token de refresh OAuth
 * @returns {Array} Lista de recomendações
 */
async function getRecommendations(customerId, refreshToken) {
  try {
    const customer = getCustomer(customerId, refreshToken);

    const recommendations = await customer.query(`
      SELECT
        recommendation.resource_name,
        recommendation.type,
        recommendation.impact,
        recommendation.campaign_budget_recommendation,
        recommendation.keyword_recommendation,
        recommendation.text_ad_recommendation
      FROM recommendation
      WHERE recommendation.dismissed = false
      LIMIT 50
    `);

    return recommendations;
  } catch (error) {
    console.error('Erro ao buscar recomendações:', error);
    throw error;
  }
}

/**
 * Sincroniza campanhas do Google Ads com o banco local
 * @param {number} clientId - ID do cliente no banco local
 * @returns {Object} Resultado da sincronização
 */
async function syncCampaigns(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client || !client.googleAdsCustomerId || !client.googleRefreshToken) {
      throw new Error('Cliente não possui credenciais do Google Ads');
    }

    const campaigns = await getPerformanceMaxCampaigns(
      client.googleAdsCustomerId,
      client.googleRefreshToken
    );

    const results = {
      created: 0,
      updated: 0,
      errors: [],
    };

    for (const campaign of campaigns) {
      try {
        const existing = await prisma.campaign.findFirst({
          where: {
            googleCampaignId: String(campaign.id),
            clientId,
          },
        });

        if (existing) {
          await prisma.campaign.update({
            where: { id: existing.id },
            data: {
              name: campaign.name,
              status: campaign.status,
              targetRoas: campaign.targetRoas,
              targetCpa: campaign.targetCpaMicros ? campaign.targetCpaMicros / 1000000 : null,
              dailyBudget: campaign.budgetMicros ? campaign.budgetMicros / 1000000 : null,
              updatedAt: new Date(),
            },
          });
          results.updated++;
        } else {
          await prisma.campaign.create({
            data: {
              clientId,
              googleCampaignId: String(campaign.id),
              name: campaign.name,
              status: campaign.status,
              type: 'PERFORMANCE_MAX',
              targetRoas: campaign.targetRoas,
              targetCpa: campaign.targetCpaMicros ? campaign.targetCpaMicros / 1000000 : null,
              dailyBudget: campaign.budgetMicros ? campaign.budgetMicros / 1000000 : null,
              startDate: campaign.startDate ? new Date(campaign.startDate) : null,
              endDate: campaign.endDate ? new Date(campaign.endDate) : null,
            },
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          campaignId: campaign.id,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Erro ao sincronizar campanhas:', error);
    throw error;
  }
}

/**
 * Sincroniza métricas de todas as campanhas de um cliente
 * @param {number} clientId - ID do cliente no banco local
 * @returns {Object} Resultado da sincronização
 */
async function syncMetrics(clientId) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { campaigns: true },
    });

    if (!client || !client.googleAdsCustomerId || !client.googleRefreshToken) {
      throw new Error('Cliente não possui credenciais do Google Ads');
    }

    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const results = {
      campaignsProcessed: 0,
      metricsUpdated: 0,
      errors: [],
    };

    for (const campaign of client.campaigns) {
      try {
        const metrics = await getCampaignMetrics(
          client.googleAdsCustomerId,
          client.googleRefreshToken,
          campaign.googleCampaignId,
          sevenDaysAgo,
          today
        );

        if (metrics.length > 0) {
          // Métricas do dia atual
          const todayMetrics = metrics.find(m => m.date === today) || metrics[0];

          // Atualizar ou criar métricas atuais
          await prisma.campaignMetrics.upsert({
            where: { campaignId: campaign.id },
            update: {
              impressions: todayMetrics.impressions,
              clicks: todayMetrics.clicks,
              cost: todayMetrics.cost,
              conversions: todayMetrics.conversions,
              conversionValue: todayMetrics.conversionValue,
              ctr: todayMetrics.ctr,
              cpc: todayMetrics.cpc,
              cpa: todayMetrics.cpa,
              roas: todayMetrics.cost > 0 ? todayMetrics.conversionValue / todayMetrics.cost : 0,
              updatedAt: new Date(),
            },
            create: {
              campaignId: campaign.id,
              impressions: todayMetrics.impressions,
              clicks: todayMetrics.clicks,
              cost: todayMetrics.cost,
              conversions: todayMetrics.conversions,
              conversionValue: todayMetrics.conversionValue,
              ctr: todayMetrics.ctr,
              cpc: todayMetrics.cpc,
              cpa: todayMetrics.cpa,
              roas: todayMetrics.cost > 0 ? todayMetrics.conversionValue / todayMetrics.cost : 0,
            },
          });

          // Salvar histórico
          for (const dayMetrics of metrics) {
            await prisma.campaignMetricsHistory.upsert({
              where: {
                campaignId_date: {
                  campaignId: campaign.id,
                  date: new Date(dayMetrics.date),
                },
              },
              update: {
                impressions: dayMetrics.impressions,
                clicks: dayMetrics.clicks,
                cost: dayMetrics.cost,
                conversions: dayMetrics.conversions,
                conversionValue: dayMetrics.conversionValue,
                ctr: dayMetrics.ctr,
                cpc: dayMetrics.cpc,
                cpa: dayMetrics.cpa,
                roas: dayMetrics.cost > 0 ? dayMetrics.conversionValue / dayMetrics.cost : 0,
              },
              create: {
                campaignId: campaign.id,
                date: new Date(dayMetrics.date),
                impressions: dayMetrics.impressions,
                clicks: dayMetrics.clicks,
                cost: dayMetrics.cost,
                conversions: dayMetrics.conversions,
                conversionValue: dayMetrics.conversionValue,
                ctr: dayMetrics.ctr,
                cpc: dayMetrics.cpc,
                cpa: dayMetrics.cpa,
                roas: dayMetrics.cost > 0 ? dayMetrics.conversionValue / dayMetrics.cost : 0,
              },
            });
          }

          results.metricsUpdated++;
        }

        results.campaignsProcessed++;
      } catch (error) {
        results.errors.push({
          campaignId: campaign.id,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Erro ao sincronizar métricas:', error);
    throw error;
  }
}

export {
  getCustomer,
  getPerformanceMaxCampaigns,
  getCampaignMetrics,
  getAssetGroups,
  getAssetGroupAssets,
  getSearchTerms,
  getListingGroups,
  getRecommendations,
  syncCampaigns,
  syncMetrics,
};

export default {
  getCustomer,
  getPerformanceMaxCampaigns,
  getCampaignMetrics,
  getAssetGroups,
  getAssetGroupAssets,
  getSearchTerms,
  getListingGroups,
  getRecommendations,
  syncCampaigns,
  syncMetrics,
};
