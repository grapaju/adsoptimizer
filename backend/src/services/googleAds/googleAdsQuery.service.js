/**
 * GoogleAdsQueryService - Serviço para execução de queries GAQL
 * 
 * Centraliza a execução de queries na Google Ads API usando GAQL
 * (Google Ads Query Language)
 * 
 * Documentação GAQL: https://developers.google.com/google-ads/api/docs/query/overview
 */

const googleAdsAuthService = require('./googleAdsAuth.service');

class GoogleAdsQueryService {
  constructor() {
    // Cache de resultados com TTL
    this.queryCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Executa uma query GAQL na conta Google Ads
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} query - Query GAQL
   * @param {object} options - Opções adicionais
   * @param {string} options.refreshToken - Refresh token (opcional)
   * @param {boolean} options.useCache - Usar cache (default: true)
   * @param {number} options.cacheTTL - TTL do cache em ms
   * @returns {array} - Resultados da query
   */
  async executeQuery(customerId, query, options = {}) {
    const {
      refreshToken = null,
      useCache = true,
      cacheTTL = this.cacheTTL,
    } = options;

    // Verificar cache
    const cacheKey = this._generateCacheKey(customerId, query);
    if (useCache && this.queryCache.has(cacheKey)) {
      const cached = this.queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        console.log('📦 Retornando resultado do cache');
        return cached.data;
      }
      // Cache expirado, remover
      this.queryCache.delete(cacheKey);
    }

    try {
      // Obter cliente autenticado
      const customer = googleAdsAuthService.getGoogleAdsClient(customerId, refreshToken);

      // Executar query
      console.log(`🔍 Executando query GAQL para conta ${customerId}`);
      const results = await customer.query(query);

      // Salvar no cache
      if (useCache) {
        this.queryCache.set(cacheKey, {
          data: results,
          timestamp: Date.now(),
        });
      }

      return results;
    } catch (error) {
      console.error('Erro ao executar query GAQL:', error);
      this._handleQueryError(error);
    }
  }

  /**
   * Executa múltiplas queries em paralelo
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {array} queries - Array de queries GAQL
   * @param {object} options - Opções adicionais
   * @returns {array} - Array de resultados
   */
  async executeMultipleQueries(customerId, queries, options = {}) {
    try {
      const promises = queries.map(query => 
        this.executeQuery(customerId, query, options)
      );

      return await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao executar múltiplas queries:', error);
      throw error;
    }
  }

  /**
   * Busca campanhas Performance Max da conta
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} options - Opções de filtro
   * @returns {array} - Lista de campanhas Performance Max
   */
  async getPerformanceMaxCampaigns(customerId, options = {}) {
    const { status = null, refreshToken = null } = options;

    let statusFilter = '';
    if (status) {
      statusFilter = `AND campaign.status = '${status}'`;
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        campaign_budget.type,
        campaign.maximize_conversion_value.target_roas,
        campaign.maximize_conversions.target_cpa_micros,
        campaign.url_expansion_opt_out
      FROM campaign
      WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
        ${statusFilter}
      ORDER BY campaign.name
    `;

    const results = await this.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      id: row.campaign.id,
      name: row.campaign.name,
      status: row.campaign.status,
      channelType: row.campaign.advertising_channel_type,
      biddingStrategy: row.campaign.bidding_strategy_type,
      startDate: row.campaign.start_date,
      endDate: row.campaign.end_date,
      budgetMicros: row.campaign_budget?.amount_micros,
      budgetDaily: row.campaign_budget?.amount_micros ? 
        row.campaign_budget.amount_micros / 1_000_000 : null,
      budgetType: row.campaign_budget?.type,
      targetRoas: row.campaign.maximize_conversion_value?.target_roas,
      targetCpaMicros: row.campaign.maximize_conversions?.target_cpa_micros,
      targetCpa: row.campaign.maximize_conversions?.target_cpa_micros ?
        row.campaign.maximize_conversions.target_cpa_micros / 1_000_000 : null,
      urlExpansionOptOut: row.campaign.url_expansion_opt_out,
    }));
  }

  /**
   * Busca Asset Groups de uma campanha Performance Max
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções adicionais
   * @returns {array} - Lista de Asset Groups
   */
  async getAssetGroups(customerId, campaignId, options = {}) {
    const { refreshToken = null } = options;

    const query = `
      SELECT
        asset_group.id,
        asset_group.name,
        asset_group.status,
        asset_group.final_urls,
        asset_group.final_mobile_urls,
        asset_group.path1,
        asset_group.path2,
        asset_group.ad_strength
      FROM asset_group
      WHERE asset_group.campaign = 'customers/${customerId.replace(/-/g, '')}/campaigns/${campaignId}'
      ORDER BY asset_group.name
    `;

    const results = await this.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      id: row.asset_group.id,
      name: row.asset_group.name,
      status: row.asset_group.status,
      finalUrls: row.asset_group.final_urls,
      finalMobileUrls: row.asset_group.final_mobile_urls,
      path1: row.asset_group.path1,
      path2: row.asset_group.path2,
      adStrength: row.asset_group.ad_strength,
    }));
  }

  /**
   * Busca Assets de um Asset Group
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} assetGroupId - ID do Asset Group
   * @param {object} options - Opções adicionais
   * @returns {array} - Lista de Assets
   */
  async getAssetGroupAssets(customerId, assetGroupId, options = {}) {
    const { refreshToken = null } = options;

    const query = `
      SELECT
        asset_group_asset.asset,
        asset_group_asset.field_type,
        asset_group_asset.status,
        asset_group_asset.performance_label,
        asset.id,
        asset.name,
        asset.type,
        asset.final_urls,
        asset.text_asset.text,
        asset.image_asset.full_size.url,
        asset.youtube_video_asset.youtube_video_id
      FROM asset_group_asset
      WHERE asset_group_asset.asset_group = 'customers/${customerId.replace(/-/g, '')}/assetGroups/${assetGroupId}'
    `;

    const results = await this.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      assetId: row.asset?.id,
      assetName: row.asset?.name,
      assetType: row.asset?.type,
      fieldType: row.asset_group_asset?.field_type,
      status: row.asset_group_asset?.status,
      performanceLabel: row.asset_group_asset?.performance_label,
      text: row.asset?.text_asset?.text,
      imageUrl: row.asset?.image_asset?.full_size?.url,
      youtubeVideoId: row.asset?.youtube_video_asset?.youtube_video_id,
      finalUrls: row.asset?.final_urls,
    }));
  }

  /**
   * Busca Listing Groups (grupos de produtos) de uma campanha
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções adicionais
   * @returns {array} - Lista de Listing Groups
   */
  async getListingGroups(customerId, campaignId, options = {}) {
    const { refreshToken = null } = options;

    const query = `
      SELECT
        asset_group_listing_group_filter.id,
        asset_group_listing_group_filter.asset_group,
        asset_group_listing_group_filter.type,
        asset_group_listing_group_filter.vertical,
        asset_group_listing_group_filter.case_value.product_category.category_id,
        asset_group_listing_group_filter.case_value.product_brand.value,
        asset_group_listing_group_filter.case_value.product_item_id.value,
        asset_group_listing_group_filter.case_value.product_custom_attribute.value,
        asset_group_listing_group_filter.parent_listing_group_filter
      FROM asset_group_listing_group_filter
      WHERE asset_group.campaign = 'customers/${customerId.replace(/-/g, '')}/campaigns/${campaignId}'
    `;

    const results = await this.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      id: row.asset_group_listing_group_filter?.id,
      assetGroup: row.asset_group_listing_group_filter?.asset_group,
      type: row.asset_group_listing_group_filter?.type,
      vertical: row.asset_group_listing_group_filter?.vertical,
      categoryId: row.asset_group_listing_group_filter?.case_value?.product_category?.category_id,
      brand: row.asset_group_listing_group_filter?.case_value?.product_brand?.value,
      itemId: row.asset_group_listing_group_filter?.case_value?.product_item_id?.value,
      customAttribute: row.asset_group_listing_group_filter?.case_value?.product_custom_attribute?.value,
      parentId: row.asset_group_listing_group_filter?.parent_listing_group_filter,
    }));
  }

  /**
   * Busca termos de pesquisa de uma campanha
   * 
   * @param {string} customerId - ID da conta Google Ads
   * @param {string} campaignId - ID da campanha
   * @param {object} options - Opções adicionais
   * @returns {array} - Lista de termos de pesquisa
   */
  async getSearchTerms(customerId, campaignId, options = {}) {
    const { 
      refreshToken = null,
      startDate = null,
      endDate = null,
      limit = 100,
    } = options;

    // Datas padrão: últimos 30 dias
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
      ORDER BY metrics.clicks DESC
      LIMIT ${limit}
    `;

    const results = await this.executeQuery(customerId, query, { refreshToken });

    return results.map(row => ({
      searchTerm: row.search_term_view?.search_term,
      status: row.search_term_view?.status,
      clicks: row.metrics?.clicks || 0,
      impressions: row.metrics?.impressions || 0,
      ctr: row.metrics?.ctr || 0,
      averageCpc: row.metrics?.average_cpc ? row.metrics.average_cpc / 1_000_000 : 0,
      cost: row.metrics?.cost_micros ? row.metrics.cost_micros / 1_000_000 : 0,
      conversions: row.metrics?.conversions || 0,
      conversionValue: row.metrics?.conversions_value || 0,
    }));
  }

  /**
   * Gera chave única para cache
   * @private
   */
  _generateCacheKey(customerId, query) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(query).digest('hex');
    return `${customerId}_${hash}`;
  }

  /**
   * Trata erros de query GAQL
   * @private
   */
  _handleQueryError(error) {
    // Verificar tipo de erro do Google Ads
    if (error.errors && error.errors.length > 0) {
      const googleError = error.errors[0];
      
      switch (googleError.error_code?.authorization_error) {
        case 'USER_PERMISSION_DENIED':
          throw new Error('Permissão negada. Verifique as credenciais.');
        case 'DEVELOPER_TOKEN_NOT_APPROVED':
          throw new Error('Developer token não aprovado.');
        case 'CUSTOMER_NOT_ENABLED':
          throw new Error('Conta Google Ads não está ativa.');
      }

      switch (googleError.error_code?.query_error) {
        case 'INVALID_QUERY':
          throw new Error('Query GAQL inválida: ' + googleError.message);
        case 'BAD_FIELD_NAME':
          throw new Error('Campo inválido na query: ' + googleError.message);
      }
    }

    throw new Error('Erro na consulta Google Ads: ' + error.message);
  }

  /**
   * Limpa o cache de queries
   * 
   * @param {string} customerId - ID da conta (opcional, limpa tudo se não informado)
   */
  clearCache(customerId = null) {
    if (customerId) {
      for (const [key] of this.queryCache) {
        if (key.startsWith(customerId)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }
}

// Exportar instância singleton
module.exports = new GoogleAdsQueryService();
