/**
 * Serviço de Métricas e Google Ads
 * Gerencia busca de métricas de campanhas Performance Max
 */
import api from './api';

export const metricsService = {
  /**
   * Buscar dashboard do gestor
   */
  getManagerDashboard: async () => {
    const response = await api.get('/metrics/dashboard/manager');
    return response.data;
  },

  /**
   * Buscar dashboard do cliente
   */
  getClientDashboard: async () => {
    const response = await api.get('/metrics/dashboard/client');
    return response.data;
  },

  /**
   * Buscar métricas de uma campanha
   * @param {number} campaignId - ID da campanha
   * @param {object} params - Parâmetros (startDate, endDate)
   */
  getCampaignMetrics: async (campaignId, params = {}) => {
    const response = await api.get(`/metrics/campaign/${campaignId}`, { params });
    return response.data;
  },

  /**
   * Comparar métricas entre períodos
   * @param {number} campaignId - ID da campanha
   * @param {object} params - Períodos para comparação
   */
  compareMetrics: async (campaignId, params) => {
    const response = await api.get(`/metrics/campaign/${campaignId}/compare`, { params });
    return response.data;
  },

  /**
   * Sincronizar métricas do Google Ads
   */
  syncMetrics: async () => {
    const response = await api.post('/metrics/sync');
    return response.data;
  },
};

export const googleAdsService = {
  /**
   * Buscar métricas gerais de campanha
   * @param {string} campaignId - ID da campanha no Google Ads
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} params - Parâmetros de período
   */
  getCampaignMetrics: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/metrics/campaign/${campaignId}`, {
      params: { customerId, ...params },
    });
    return response.data;
  },

  /**
   * Buscar métricas avançadas (impression share, etc)
   * @param {string} campaignId - ID da campanha no Google Ads
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} params - Parâmetros de período
   */
  getAdvancedMetrics: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/metrics/campaign/${campaignId}/advanced`, {
      params: { customerId, ...params },
    });
    return response.data;
  },

  /**
   * Buscar métricas diárias para gráficos
   * @param {string} campaignId - ID da campanha no Google Ads
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} params - Parâmetros de período
   */
  getDailyMetrics: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/metrics/campaign/${campaignId}/daily`, {
      params: { customerId, ...params },
    });
    return response.data;
  },

  /**
   * Buscar todas as métricas (dashboard)
   * @param {string} campaignId - ID da campanha no Google Ads
   * @param {string} customerId - ID da conta Google Ads
   */
  getAllMetrics: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/metrics/campaign/${campaignId}/all`, {
      params: { customerId, ...params },
    });
    return response.data;
  },

  /**
   * Buscar Asset Groups
   * @param {string} campaignId - ID da campanha
   * @param {string} customerId - ID da conta Google Ads
   */
  getAssetGroups: async (campaignId, customerId) => {
    const response = await api.get(`/google-ads/campaigns/${campaignId}/asset-groups`, {
      params: { customerId },
    });
    return response.data;
  },

  /**
   * Buscar métricas de Asset Groups
   * @param {string} campaignId - ID da campanha
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} params - Parâmetros de período
   */
  getAssetGroupMetrics: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/campaigns/${campaignId}/asset-groups/metrics`, {
      params: { customerId, ...params },
    });
    return response.data;
  },

  /**
   * Buscar Assets de um Asset Group
   * @param {string} assetGroupId - ID do Asset Group
   * @param {string} customerId - ID da conta Google Ads
   */
  getAssets: async (assetGroupId, customerId) => {
    const response = await api.get(`/google-ads/asset-groups/${assetGroupId}/assets`, {
      params: { customerId },
    });
    return response.data;
  },

  /**
   * Buscar Search Terms
   * @param {string} campaignId - ID da campanha
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} params - Parâmetros de filtro
   */
  getSearchTerms: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/campaigns/${campaignId}/search-terms`, {
      params: { customerId, ...params },
    });
    return response.data;
  },

  /**
   * Buscar Listing Groups
   * @param {string} campaignId - ID da campanha
   * @param {string} customerId - ID da conta Google Ads
   */
  getListingGroups: async (campaignId, customerId) => {
    const response = await api.get(`/google-ads/campaigns/${campaignId}/listing-groups`, {
      params: { customerId },
    });
    return response.data;
  },

  /**
   * Buscar Listing Groups com métricas
   * @param {string} campaignId - ID da campanha
   * @param {string} customerId - ID da conta Google Ads
   * @param {object} params - Parâmetros de período
   */
  getListingGroupMetrics: async (campaignId, customerId, params = {}) => {
    const response = await api.get(`/google-ads/campaigns/${campaignId}/listing-groups/metrics`, {
      params: { customerId, ...params },
    });
    return response.data;
  },
};

export default metricsService;
