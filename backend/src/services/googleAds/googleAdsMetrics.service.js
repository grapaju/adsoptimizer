/**
 * GoogleAdsMetricsService - Serviço para busca de métricas
 * 
 * Centraliza a busca de todas as métricas de campanhas Performance Max
 * incluindo métricas gerais, avançadas, de asset groups e assets
 */

import googleAdsQueryService from './googleAdsQuery.service.js';

class GoogleAdsMetricsService {
  /**
   * Busca métricas gerais de uma campanha Performance Max
   * Inclui: custo, cliques, impressões, CTR, CPC, conversões, ROAS, CPA
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período e filtros
   * @returns {object} - Métricas agregadas
   */
  async getCampaignMetrics(customerId, campaignId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
    } = options;

    // Datas padrão: últimos 7 dias
    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_per_conversion,
        metrics.conversions_from_interactions_rate,
        metrics.value_per_conversion
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${start}' AND '${end}'
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    // Agregar resultados
    let metrics = {
      campaignId,
      campaignName: '',
      status: '',
      period: { startDate: start, endDate: end },
      // Métricas brutas
      cost: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      conversionValue: 0,
      // Métricas calculadas
      ctr: 0,
      averageCpc: 0,
      cpa: 0,
      roas: 0,
      conversionRate: 0,
      valuePerConversion: 0,
      // Orçamento
      budget: 0,
      budgetUtilization: 0,
    };

    if (results.length > 0) {
      // Somar métricas de todos os dias
      results.forEach(row => {
        metrics.campaignName = row.campaign?.name || '';
        metrics.status = row.campaign?.status || '';
        metrics.budget = row.campaign_budget?.amount_micros ? 
          row.campaign_budget.amount_micros / 1_000_000 : 0;
        
        metrics.cost += (row.metrics?.cost_micros || 0) / 1_000_000;
        metrics.clicks += row.metrics?.clicks || 0;
        metrics.impressions += row.metrics?.impressions || 0;
        metrics.conversions += row.metrics?.conversions || 0;
        metrics.conversionValue += row.metrics?.conversions_value || 0;
      });

      // Calcular métricas derivadas
      if (metrics.impressions > 0) {
        metrics.ctr = (metrics.clicks / metrics.impressions) * 100;
      }
      if (metrics.clicks > 0) {
        metrics.averageCpc = metrics.cost / metrics.clicks;
      }
      if (metrics.conversions > 0) {
        metrics.cpa = metrics.cost / metrics.conversions;
        metrics.valuePerConversion = metrics.conversionValue / metrics.conversions;
      }
      if (metrics.cost > 0) {
        metrics.roas = metrics.conversionValue / metrics.cost;
      }
      if (metrics.clicks > 0) {
        metrics.conversionRate = (metrics.conversions / metrics.clicks) * 100;
      }

      // Calcular burn rate (dias no período)
      const days = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
      const totalBudget = metrics.budget * days;
      if (totalBudget > 0) {
        metrics.budgetUtilization = (metrics.cost / totalBudget) * 100;
      }
    }

    return metrics;
  }

  /**
   * Busca métricas avançadas de impressão e competitividade
   * Inclui: search impression share, lost impressions, top impression %
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período
   * @returns {object} - Métricas avançadas
   */
  async getAdvancedMetrics(customerId, campaignId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
    } = options;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const query = `
      SELECT
        campaign.id,
        metrics.top_impression_percentage,
        metrics.absolute_top_impression_percentage,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.content_impression_share,
        metrics.content_budget_lost_impression_share,
        metrics.content_rank_lost_impression_share
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${start}' AND '${end}'
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    // Agregar resultados (média dos dias)
    let metrics = {
      campaignId,
      period: { startDate: start, endDate: end },
      // Métricas de posição
      topImpressionPercentage: 0,
      absoluteTopImpressionPercentage: 0,
      // Métricas de search
      searchImpressionShare: 0,
      searchBudgetLostImpressionShare: 0,
      searchRankLostImpressionShare: 0,
      // Métricas de display/content
      contentImpressionShare: 0,
      contentBudgetLostImpressionShare: 0,
      contentRankLostImpressionShare: 0,
    };

    if (results.length > 0) {
      let count = 0;
      results.forEach(row => {
        count++;
        metrics.topImpressionPercentage += row.metrics?.top_impression_percentage || 0;
        metrics.absoluteTopImpressionPercentage += row.metrics?.absolute_top_impression_percentage || 0;
        metrics.searchImpressionShare += row.metrics?.search_impression_share || 0;
        metrics.searchBudgetLostImpressionShare += row.metrics?.search_budget_lost_impression_share || 0;
        metrics.searchRankLostImpressionShare += row.metrics?.search_rank_lost_impression_share || 0;
        metrics.contentImpressionShare += row.metrics?.content_impression_share || 0;
        metrics.contentBudgetLostImpressionShare += row.metrics?.content_budget_lost_impression_share || 0;
        metrics.contentRankLostImpressionShare += row.metrics?.content_rank_lost_impression_share || 0;
      });

      // Calcular médias
      if (count > 0) {
        metrics.topImpressionPercentage /= count;
        metrics.absoluteTopImpressionPercentage /= count;
        metrics.searchImpressionShare /= count;
        metrics.searchBudgetLostImpressionShare /= count;
        metrics.searchRankLostImpressionShare /= count;
        metrics.contentImpressionShare /= count;
        metrics.contentBudgetLostImpressionShare /= count;
        metrics.contentRankLostImpressionShare /= count;
      }

      // Converter para porcentagem
      Object.keys(metrics).forEach(key => {
        if (typeof metrics[key] === 'number' && key !== 'campaignId') {
          metrics[key] = metrics[key] * 100;
        }
      });
    }

    return metrics;
  }

  /**
   * Busca métricas diárias para gráficos de tendência
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período
   * @returns {array} - Métricas por dia
   */
  async getDailyMetrics(customerId, campaignId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
    } = options;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const query = `
      SELECT
        segments.date,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${start}' AND '${end}'
      ORDER BY segments.date ASC
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    return results.map(row => {
      const cost = (row.metrics?.cost_micros || 0) / 1_000_000;
      const clicks = row.metrics?.clicks || 0;
      const impressions = row.metrics?.impressions || 0;
      const conversions = row.metrics?.conversions || 0;
      const conversionValue = row.metrics?.conversions_value || 0;

      return {
        date: row.segments?.date,
        cost,
        clicks,
        impressions,
        conversions,
        conversionValue,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        cpa: conversions > 0 ? cost / conversions : 0,
        roas: cost > 0 ? conversionValue / cost : 0,
      };
    });
  }

  /**
   * Busca métricas de Asset Groups de uma campanha
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período
   * @returns {array} - Métricas por Asset Group
   */
  async getAssetGroupMetrics(customerId, campaignId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
    } = options;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const query = `
      SELECT
        asset_group.id,
        asset_group.name,
        asset_group.status,
        asset_group.ad_strength,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.conversions,
        metrics.conversions_value
      FROM asset_group
      WHERE asset_group.campaign = 'customers/${customerId.replace(/-/g, '')}/campaigns/${campaignId}'
        AND segments.date BETWEEN '${start}' AND '${end}'
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    // Agregar por asset group
    const assetGroupMap = new Map();

    results.forEach(row => {
      const id = row.asset_group?.id;
      if (!id) return;

      if (!assetGroupMap.has(id)) {
        assetGroupMap.set(id, {
          id,
          name: row.asset_group?.name || '',
          status: row.asset_group?.status || '',
          adStrength: row.asset_group?.ad_strength || '',
          cost: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0,
        });
      }

      const metrics = assetGroupMap.get(id);
      metrics.cost += (row.metrics?.cost_micros || 0) / 1_000_000;
      metrics.clicks += row.metrics?.clicks || 0;
      metrics.impressions += row.metrics?.impressions || 0;
      metrics.conversions += row.metrics?.conversions || 0;
      metrics.conversionValue += row.metrics?.conversions_value || 0;
    });

    // Calcular métricas derivadas
    return Array.from(assetGroupMap.values()).map(ag => ({
      ...ag,
      ctr: ag.impressions > 0 ? (ag.clicks / ag.impressions) * 100 : 0,
      cpc: ag.clicks > 0 ? ag.cost / ag.clicks : 0,
      cpa: ag.conversions > 0 ? ag.cost / ag.conversions : 0,
      roas: ag.cost > 0 ? ag.conversionValue / ag.cost : 0,
    }));
  }

  /**
   * Busca métricas de Assets individuais
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} assetGroupId - ID do Asset Group
   * @param {object} options - Opções de período
   * @returns {array} - Métricas por Asset
   */
  async getAssetMetrics(customerId, assetGroupId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
    } = options;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    // Query para performance de assets
    const query = `
      SELECT
        asset_group_asset.asset,
        asset_group_asset.field_type,
        asset_group_asset.performance_label,
        asset_group_asset.status,
        asset.id,
        asset.name,
        asset.type,
        asset.text_asset.text,
        asset.image_asset.full_size.url
      FROM asset_group_asset
      WHERE asset_group_asset.asset_group = 'customers/${customerId.replace(/-/g, '')}/assetGroups/${assetGroupId}'
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      assetId: row.asset?.id,
      assetName: row.asset?.name,
      assetType: row.asset?.type,
      fieldType: row.asset_group_asset?.field_type,
      status: row.asset_group_asset?.status,
      performanceLabel: row.asset_group_asset?.performance_label,
      // Classificação de performance
      performanceRating: this._getPerformanceRating(row.asset_group_asset?.performance_label),
      // Conteúdo do asset
      text: row.asset?.text_asset?.text,
      imageUrl: row.asset?.image_asset?.full_size?.url,
    }));
  }

  /**
   * Busca métricas de Listing Groups (produtos/categorias)
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período
   * @returns {array} - Métricas por Listing Group
   */
  async getListingGroupMetrics(customerId, campaignId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
    } = options;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const query = `
      SELECT
        asset_group_listing_group_filter.id,
        asset_group_listing_group_filter.type,
        asset_group_listing_group_filter.case_value.product_category.category_id,
        asset_group_listing_group_filter.case_value.product_brand.value,
        asset_group_listing_group_filter.case_value.product_item_id.value,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.conversions_value
      FROM asset_group_listing_group_filter
      WHERE asset_group.campaign = 'customers/${customerId.replace(/-/g, '')}/campaigns/${campaignId}'
        AND segments.date BETWEEN '${start}' AND '${end}'
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    // Agregar por listing group
    const listingGroupMap = new Map();

    results.forEach(row => {
      const id = row.asset_group_listing_group_filter?.id;
      if (!id) return;

      if (!listingGroupMap.has(id)) {
        listingGroupMap.set(id, {
          id,
          type: row.asset_group_listing_group_filter?.type,
          categoryId: row.asset_group_listing_group_filter?.case_value?.product_category?.category_id,
          brand: row.asset_group_listing_group_filter?.case_value?.product_brand?.value,
          itemId: row.asset_group_listing_group_filter?.case_value?.product_item_id?.value,
          cost: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          conversionValue: 0,
        });
      }

      const metrics = listingGroupMap.get(id);
      metrics.cost += (row.metrics?.cost_micros || 0) / 1_000_000;
      metrics.clicks += row.metrics?.clicks || 0;
      metrics.impressions += row.metrics?.impressions || 0;
      metrics.conversions += row.metrics?.conversions || 0;
      metrics.conversionValue += row.metrics?.conversions_value || 0;
    });

    // Calcular métricas derivadas
    return Array.from(listingGroupMap.values()).map(lg => ({
      ...lg,
      ctr: lg.impressions > 0 ? (lg.clicks / lg.impressions) * 100 : 0,
      cpa: lg.conversions > 0 ? lg.cost / lg.conversions : 0,
      roas: lg.cost > 0 ? lg.conversionValue / lg.cost : 0,
    }));
  }

  /**
   * Busca Search Terms com métricas
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período e limite
   * @returns {array} - Search terms com métricas
   */
  async getSearchTermMetrics(customerId, campaignId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      refreshToken = null,
      limit = 100,
    } = options;

    const end = endDate || new Date().toISOString().split('T')[0];
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const query = `
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM search_term_view
      WHERE campaign.id = ${campaignId}
        AND segments.date BETWEEN '${start}' AND '${end}'
      ORDER BY metrics.conversions DESC, metrics.clicks DESC
      LIMIT ${limit}
    `;

    const results = await googleAdsQueryService.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      searchTerm: row.search_term_view?.search_term,
      status: row.search_term_view?.status,
      clicks: row.metrics?.clicks || 0,
      impressions: row.metrics?.impressions || 0,
      ctr: (row.metrics?.ctr || 0) * 100,
      averageCpc: (row.metrics?.average_cpc || 0) / 1_000_000,
      cost: (row.metrics?.cost_micros || 0) / 1_000_000,
      conversions: row.metrics?.conversions || 0,
      conversionValue: row.metrics?.conversions_value || 0,
      conversionRate: row.metrics?.clicks > 0 ? 
        ((row.metrics?.conversions || 0) / row.metrics.clicks) * 100 : 0,
    }));
  }

  /**
   * Busca todas as métricas de uma campanha de uma vez
   * Otimizado para dashboard
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções de período
   * @returns {object} - Todas as métricas consolidadas
   */
  async getAllCampaignMetrics(customerId, campaignId, options = {}) {
    const [
      general,
      advanced,
      daily,
      assetGroups,
    ] = await Promise.all([
      this.getCampaignMetrics(customerId, campaignId, options),
      this.getAdvancedMetrics(customerId, campaignId, options),
      this.getDailyMetrics(customerId, campaignId, options),
      this.getAssetGroupMetrics(customerId, campaignId, options),
    ]);

    return {
      general,
      advanced,
      daily,
      assetGroups,
      fetchedAt: new Date().toISOString(),
    };
  }

  /**
   * Converte performance label para rating numérico
   * @private
   */
  _getPerformanceRating(label) {
    const ratings = {
      'BEST': 5,
      'GOOD': 4,
      'LEARNING': 3,
      'LOW': 2,
      'PENDING': 1,
      'UNSPECIFIED': 0,
      'UNKNOWN': 0,
    };
    return ratings[label] || 0;
  }

  /**
   * Compara métricas entre dois períodos
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Períodos para comparação
   * @returns {object} - Métricas comparativas
   */
  async compareMetrics(customerId, campaignId, options = {}) {
    const {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      refreshToken = null,
    } = options;

    const [currentMetrics, previousMetrics] = await Promise.all([
      this.getCampaignMetrics(customerId, campaignId, {
        startDate: currentStart,
        endDate: currentEnd,
        refreshToken,
      }),
      this.getCampaignMetrics(customerId, campaignId, {
        startDate: previousStart,
        endDate: previousEnd,
        refreshToken,
      }),
    ]);

    // Calcular variações
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current: currentMetrics,
      previous: previousMetrics,
      changes: {
        cost: calculateChange(currentMetrics.cost, previousMetrics.cost),
        clicks: calculateChange(currentMetrics.clicks, previousMetrics.clicks),
        impressions: calculateChange(currentMetrics.impressions, previousMetrics.impressions),
        conversions: calculateChange(currentMetrics.conversions, previousMetrics.conversions),
        conversionValue: calculateChange(currentMetrics.conversionValue, previousMetrics.conversionValue),
        ctr: calculateChange(currentMetrics.ctr, previousMetrics.ctr),
        cpc: calculateChange(currentMetrics.averageCpc, previousMetrics.averageCpc),
        cpa: calculateChange(currentMetrics.cpa, previousMetrics.cpa),
        roas: calculateChange(currentMetrics.roas, previousMetrics.roas),
      },
    };
  }
}

// Exportar instância singleton
export default new GoogleAdsMetricsService();
