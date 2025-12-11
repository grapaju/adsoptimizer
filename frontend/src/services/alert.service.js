/**
 * Serviço de Alertas e Histórico
 * Gerencia alertas inteligentes e histórico de alterações
 */
import api from './api';

// =============================================================================
// SERVIÇO DE ALERTAS
// =============================================================================

export const alertService = {
  /**
   * Listar alertas
   * @param {object} params - Parâmetros de filtro
   */
  list: async (params = {}) => {
    const response = await api.get('/alerts', { params });
    return response.data;
  },

  /**
   * Buscar alertas não lidos
   */
  getUnread: async () => {
    const response = await api.get('/alerts/unread');
    return response.data;
  },

  /**
   * Marcar alerta como lido
   * @param {number} alertId - ID do alerta
   */
  markAsRead: async (alertId) => {
    const response = await api.put(`/alerts/${alertId}/read`);
    return response.data;
  },

  /**
   * Marcar todos como lidos
   */
  markAllAsRead: async () => {
    const response = await api.put('/alerts/read-all');
    return response.data;
  },

  /**
   * Resolver alerta
   * @param {number} alertId - ID do alerta
   */
  resolve: async (alertId) => {
    const response = await api.put(`/alerts/${alertId}/resolve`);
    return response.data;
  },

  /**
   * Listar configurações de alertas
   */
  listSettings: async () => {
    const response = await api.get('/alerts/settings');
    return response.data;
  },

  /**
   * Criar configuração de alerta
   * @param {object} data - Dados da configuração
   */
  createSetting: async (data) => {
    const response = await api.post('/alerts/settings', data);
    return response.data;
  },

  /**
   * Atualizar configuração de alerta
   * @param {number} settingId - ID da configuração
   * @param {object} data - Dados a atualizar
   */
  updateSetting: async (settingId, data) => {
    const response = await api.put(`/alerts/settings/${settingId}`, data);
    return response.data;
  },

  /**
   * Deletar configuração de alerta
   * @param {number} settingId - ID da configuração
   */
  deleteSetting: async (settingId) => {
    const response = await api.delete(`/alerts/settings/${settingId}`);
    return response.data;
  },
};

// =============================================================================
// SERVIÇO DE HISTÓRICO
// =============================================================================

export const historyService = {
  /**
   * Listar histórico de alterações
   * @param {object} params - Parâmetros de filtro
   */
  list: async (params = {}) => {
    const response = await api.get('/history', { params });
    return response.data;
  },

  /**
   * Buscar histórico por campanha
   * @param {number} campaignId - ID da campanha
   * @param {object} params - Parâmetros de filtro
   */
  getByCampaign: async (campaignId, params = {}) => {
    const response = await api.get(`/history/campaign/${campaignId}`, { params });
    return response.data;
  },

  /**
   * Buscar timeline de uma campanha
   * @param {number} campaignId - ID da campanha
   */
  getTimeline: async (campaignId) => {
    const response = await api.get(`/history/campaign/${campaignId}/timeline`);
    return response.data;
  },
};

export default alertService;
