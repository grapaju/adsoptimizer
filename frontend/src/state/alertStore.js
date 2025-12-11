// =============================================================================
// ALERT STORE - Gerenciamento de estado de alertas
// Zustand store para alertas inteligentes
// =============================================================================

import { create } from 'zustand';
import api from '../services/api';
import { socketService } from '../services/socket';

export const useAlertStore = create((set, get) => ({
  // Estado
  alerts: [],
  stats: null,
  thresholds: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  filters: {
    status: null,
    priority: null,
    type: null,
    campaignId: null,
    isRead: null
  },

  // =============================================================================
  // BUSCA E LISTAGEM
  // =============================================================================

  /**
   * Busca alertas com filtros e paginação
   */
  fetchAlerts: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const currentFilters = get().filters;
      const queryParams = {
        ...currentFilters,
        ...params,
        page: params.page || get().pagination.page,
        limit: params.limit || get().pagination.limit
      };

      // Remover parâmetros nulos/undefined
      Object.keys(queryParams).forEach(key => {
        if (queryParams[key] === null || queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });

      const response = await api.get('/alerts', { params: queryParams });
      
      set({
        alerts: response.data.data,
        pagination: response.data.pagination,
        isLoading: false
      });
      
      return response.data;
    } catch (error) {
      set({ 
        isLoading: false,
        error: error.response?.data?.error || 'Erro ao carregar alertas'
      });
      return null;
    }
  },

  /**
   * Busca estatísticas de alertas
   */
  fetchStats: async () => {
    try {
      const response = await api.get('/alerts/stats');
      set({ stats: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  },

  /**
   * Busca thresholds padrão
   */
  fetchThresholds: async () => {
    try {
      const response = await api.get('/alerts/thresholds');
      set({ thresholds: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar thresholds:', error);
      return null;
    }
  },

  /**
   * Busca alertas de uma campanha específica
   */
  fetchByCampaign: async (campaignId, params = {}) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/alerts/campaign/${campaignId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar alertas da campanha:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Busca um alerta específico por ID
   */
  getAlertById: async (alertId) => {
    try {
      const response = await api.get(`/alerts/${alertId}`);
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar alerta:', error);
      return null;
    }
  },

  // =============================================================================
  // AÇÕES EM ALERTAS
  // =============================================================================

  /**
   * Marca um alerta como lido
   */
  markAsRead: async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/read`);
      
      set(state => ({
        alerts: state.alerts.map(a => 
          a.id === alertId ? { ...a, isRead: true, readAt: new Date().toISOString() } : a
        ),
        stats: state.stats ? {
          ...state.stats,
          unread: Math.max(0, (state.stats.unread || 0) - 1)
        } : state.stats
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Marca múltiplos alertas como lidos
   */
  markMultipleAsRead: async (alertIds) => {
    try {
      await api.put('/alerts/read-multiple', { alertIds });
      
      set(state => ({
        alerts: state.alerts.map(a => 
          alertIds.includes(a.id) ? { ...a, isRead: true, readAt: new Date().toISOString() } : a
        ),
        stats: state.stats ? {
          ...state.stats,
          unread: Math.max(0, (state.stats.unread || 0) - alertIds.length)
        } : state.stats
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Marca todos os alertas como lidos
   */
  markAllAsRead: async () => {
    try {
      await api.put('/alerts/read-all');
      
      set(state => ({
        alerts: state.alerts.map(a => ({ ...a, isRead: true, readAt: new Date().toISOString() })),
        stats: state.stats ? { ...state.stats, unread: 0 } : state.stats
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Reconhece um alerta (acknowledge)
   */
  acknowledgeAlert: async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/acknowledge`);
      
      set(state => ({
        alerts: state.alerts.map(a => 
          a.id === alertId ? { ...a, status: 'ACKNOWLEDGED', isRead: true } : a
        )
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Resolve um alerta
   */
  resolveAlert: async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/resolve`);
      
      set(state => ({
        alerts: state.alerts.map(a => 
          a.id === alertId ? { ...a, status: 'RESOLVED', resolvedAt: new Date().toISOString() } : a
        ),
        stats: state.stats ? {
          ...state.stats,
          totalActive: Math.max(0, (state.stats.totalActive || 0) - 1)
        } : state.stats
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Descarta um alerta
   */
  dismissAlert: async (alertId) => {
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      
      set(state => ({
        alerts: state.alerts.map(a => 
          a.id === alertId ? { ...a, status: 'DISMISSED' } : a
        ),
        stats: state.stats ? {
          ...state.stats,
          totalActive: Math.max(0, (state.stats.totalActive || 0) - 1)
        } : state.stats
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Remove um alerta
   */
  deleteAlert: async (alertId) => {
    try {
      await api.delete(`/alerts/${alertId}`);
      
      set(state => ({
        alerts: state.alerts.filter(a => a.id !== alertId),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1)
        }
      }));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  // =============================================================================
  // ANÁLISE E GERAÇÃO
  // =============================================================================

  /**
   * Analisa uma campanha e gera alertas
   */
  analyzeCampaign: async (campaignId, thresholds = null) => {
    set({ isLoading: true });
    try {
      const response = await api.post(`/alerts/analyze/${campaignId}`, { thresholds });
      
      // Recarregar alertas após análise
      await get().fetchAlerts();
      await get().fetchStats();
      
      set({ isLoading: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.response?.data?.error };
    }
  },

  /**
   * Analisa todas as campanhas
   */
  analyzeAllCampaigns: async (thresholds = null) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/alerts/analyze-all', { thresholds });
      
      // Recarregar alertas após análise
      await get().fetchAlerts();
      await get().fetchStats();
      
      set({ isLoading: false });
      return { success: true, data: response.data.data };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: error.response?.data?.error };
    }
  },

  // =============================================================================
  // FILTROS E PAGINAÇÃO
  // =============================================================================

  /**
   * Define filtros e recarrega
   */
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 } // Reset page when filtering
    }));
    get().fetchAlerts();
  },

  /**
   * Limpa filtros
   */
  clearFilters: () => {
    set({
      filters: {
        status: null,
        priority: null,
        type: null,
        campaignId: null,
        isRead: null
      },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
    get().fetchAlerts();
  },

  /**
   * Muda página
   */
  setPage: (page) => {
    set(state => ({
      pagination: { ...state.pagination, page }
    }));
    get().fetchAlerts({ page });
  },

  // =============================================================================
  // SOCKET - Alertas em tempo real
  // =============================================================================

  /**
   * Adiciona alerta recebido via socket
   */
  addAlert: (alert) => {
    set(state => ({
      alerts: [alert, ...state.alerts],
      stats: state.stats ? {
        ...state.stats,
        totalActive: (state.stats.totalActive || 0) + 1,
        unread: (state.stats.unread || 0) + 1
      } : state.stats,
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1
      }
    }));
  },

  /**
   * Configura listeners de socket
   */
  setupSocketListeners: () => {
    socketService.onNewAlert((alert) => {
      get().addAlert(alert);
      
      // Notificação do navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`🚨 ${alert.title}`, {
          body: alert.message?.substring(0, 100),
          icon: '/favicon.ico',
          tag: `alert-${alert.id}`
        });
      }
    });
  }
}));

export default useAlertStore;
