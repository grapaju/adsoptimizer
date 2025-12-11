/**
 * Serviço de Campanhas
 * Gerencia operações de campanhas Performance Max
 */
import api from './api';

export const campaignService = {
  /**
   * Listar campanhas com filtros
   * @param {object} params - Parâmetros de filtro e paginação
   */
  list: async (params = {}) => {
    const response = await api.get('/campaigns', { params });
    return response.data;
  },

  /**
   * Buscar campanha por ID
   * @param {number} id - ID da campanha
   */
  getById: async (id) => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Criar nova campanha
   * @param {object} data - Dados da campanha
   */
  create: async (data) => {
    const response = await api.post('/campaigns', data);
    return response.data;
  },

  /**
   * Atualizar campanha
   * @param {number} id - ID da campanha
   * @param {object} data - Dados a atualizar
   */
  update: async (id, data) => {
    const response = await api.put(`/campaigns/${id}`, data);
    return response.data;
  },

  /**
   * Deletar campanha
   * @param {number} id - ID da campanha
   */
  delete: async (id) => {
    const response = await api.delete(`/campaigns/${id}`);
    return response.data;
  },

  /**
   * Sincronizar campanha com Google Ads
   * @param {number} id - ID da campanha
   */
  sync: async (id) => {
    const response = await api.post(`/campaigns/${id}/sync`);
    return response.data;
  },

  /**
   * Buscar Asset Groups da campanha
   * @param {number} id - ID da campanha
   */
  getAssetGroups: async (id) => {
    const response = await api.get(`/campaigns/${id}/asset-groups`);
    return response.data;
  },

  /**
   * Buscar Search Terms da campanha
   * @param {number} id - ID da campanha
   * @param {object} params - Parâmetros de filtro
   */
  getSearchTerms: async (id, params = {}) => {
    const response = await api.get(`/campaigns/${id}/search-terms`, { params });
    return response.data;
  },

  /**
   * Buscar Listing Groups da campanha
   * @param {number} id - ID da campanha
   */
  getListingGroups: async (id) => {
    const response = await api.get(`/campaigns/${id}/listing-groups`);
    return response.data;
  },

  /**
   * Buscar métricas da campanha
   * @param {number} id - ID da campanha
   * @param {object} params - Parâmetros de período
   */
  getMetrics: async (id, params = {}) => {
    const response = await api.get(`/campaigns/${id}/metrics`, { params });
    return response.data;
  },
};

export default campaignService;
