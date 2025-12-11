// =============================================================================
// HISTORY STORE - Gerenciamento de estado do histórico / audit log
// Zustand store para timeline de alterações
// =============================================================================

import { create } from 'zustand';
import api from '../services/api';

// =============================================================================
// ÍCONES E CORES POR TIPO DE AÇÃO
// =============================================================================

export const ACTION_CONFIG = {
  CREATE: { icon: 'add_circle', color: 'green', label: 'Criação', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  UPDATE: { icon: 'edit', color: 'blue', label: 'Atualização', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  DELETE: { icon: 'delete', color: 'red', label: 'Remoção', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  STATUS_CHANGE: { icon: 'toggle_on', color: 'orange', label: 'Status', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  APPROVE: { icon: 'check_circle', color: 'emerald', label: 'Aprovação', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  REJECT: { icon: 'cancel', color: 'rose', label: 'Rejeição', bgColor: 'bg-rose-100', textColor: 'text-rose-700' },
  SYNC: { icon: 'sync', color: 'purple', label: 'Sincronização', bgColor: 'bg-purple-100', textColor: 'text-purple-700' }
};

export const ENTITY_CONFIG = {
  CAMPAIGN: { icon: 'campaign', label: 'Campanha', color: 'indigo' },
  ASSET_GROUP: { icon: 'collections', label: 'Grupo de Ativos', color: 'cyan' },
  BUDGET: { icon: 'attach_money', label: 'Orçamento', color: 'green' },
  TARGET: { icon: 'track_changes', label: 'Meta', color: 'amber' },
  RECOMMENDATION: { icon: 'psychology', label: 'Recomendação IA', color: 'violet' },
  USER: { icon: 'person', label: 'Usuário', color: 'blue' },
  CLIENT: { icon: 'business', label: 'Cliente', color: 'slate' },
  ALERT: { icon: 'notifications', label: 'Alerta', color: 'orange' }
};

// =============================================================================
// STORE
// =============================================================================

const useHistoryStore = create((set, get) => ({
  // Estado
  logs: [],
  timeline: [],
  recentChanges: [],
  stats: null,
  entityTypes: [],
  actionTypes: [],
  
  // Paginação
  page: 1,
  totalPages: 1,
  total: 0,
  
  // Filtros
  filters: {
    entityType: null,
    entityId: null,
    action: null,
    userId: null,
    startDate: null,
    endDate: null,
    search: ''
  },
  
  // Loading states
  loading: false,
  loadingTimeline: false,
  loadingStats: false,
  error: null,
  
  // ==========================================================================
  // ACTIONS - Buscar logs
  // ==========================================================================
  
  fetchLogs: async (page = 1) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      
      params.append('page', page);
      params.append('limit', 50);
      
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.entityId) params.append('entityId', filters.entityId);
      if (filters.action) params.append('action', filters.action);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.search) params.append('search', filters.search);
      
      const response = await api.get(`/history?${params.toString()}`);
      
      set({
        logs: response.data.data.logs,
        page: response.data.data.page,
        totalPages: response.data.data.totalPages,
        total: response.data.data.total,
        loading: false
      });
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Erro ao buscar histórico' 
      });
    }
  },
  
  // ==========================================================================
  // Buscar timeline de uma campanha
  // ==========================================================================
  
  fetchCampaignTimeline: async (campaignId, days = 30) => {
    set({ loadingTimeline: true, error: null });
    try {
      const response = await api.get(`/history/campaign/${campaignId}/timeline?days=${days}`);
      
      set({
        timeline: response.data.data,
        loadingTimeline: false
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        loadingTimeline: false, 
        error: error.response?.data?.error || 'Erro ao buscar timeline' 
      });
      return [];
    }
  },
  
  // ==========================================================================
  // Buscar histórico de uma entidade
  // ==========================================================================
  
  fetchEntityHistory: async (entityType, entityId, limit = 100) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/history/entity/${entityType}/${entityId}?limit=${limit}`);
      
      set({
        logs: response.data.data,
        loading: false
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Erro ao buscar histórico da entidade' 
      });
      return [];
    }
  },
  
  // ==========================================================================
  // Buscar alterações recentes
  // ==========================================================================
  
  fetchRecentChanges: async (hours = 24) => {
    try {
      const response = await api.get(`/history/recent?hours=${hours}`);
      
      set({ recentChanges: response.data.data });
      
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar alterações recentes:', error);
      return [];
    }
  },
  
  // ==========================================================================
  // Buscar estatísticas
  // ==========================================================================
  
  fetchStats: async (days = 30) => {
    set({ loadingStats: true });
    try {
      const response = await api.get(`/history/stats?days=${days}`);
      
      set({
        stats: response.data.data,
        loadingStats: false
      });
      
      return response.data.data;
    } catch (error) {
      set({ loadingStats: false });
      console.error('Erro ao buscar estatísticas:', error);
      return null;
    }
  },
  
  // ==========================================================================
  // Buscar tipos de entidade e ação
  // ==========================================================================
  
  fetchEntityTypes: async () => {
    try {
      const response = await api.get('/history/entity-types');
      set({ entityTypes: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar tipos de entidade:', error);
      return [];
    }
  },
  
  fetchActionTypes: async () => {
    try {
      const response = await api.get('/history/action-types');
      set({ actionTypes: response.data.data });
      return response.data.data;
    } catch (error) {
      console.error('Erro ao buscar tipos de ação:', error);
      return [];
    }
  },
  
  // ==========================================================================
  // Buscar histórico de usuário
  // ==========================================================================
  
  fetchUserActivity: async (userId, days = 30) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get(`/history/user/${userId}?days=${days}`);
      
      set({
        logs: response.data.data.logs,
        stats: response.data.data.stats,
        loading: false
      });
      
      return response.data.data;
    } catch (error) {
      set({ 
        loading: false, 
        error: error.response?.data?.error || 'Erro ao buscar atividade do usuário' 
      });
      return null;
    }
  },
  
  // ==========================================================================
  // Filtros
  // ==========================================================================
  
  setFilter: (key, value) => {
    set(state => ({
      filters: {
        ...state.filters,
        [key]: value
      },
      page: 1 // Reset page on filter change
    }));
  },
  
  setFilters: (newFilters) => {
    set(state => ({
      filters: {
        ...state.filters,
        ...newFilters
      },
      page: 1
    }));
  },
  
  clearFilters: () => {
    set({
      filters: {
        entityType: null,
        entityId: null,
        action: null,
        userId: null,
        startDate: null,
        endDate: null,
        search: ''
      },
      page: 1
    });
  },
  
  // ==========================================================================
  // Paginação
  // ==========================================================================
  
  setPage: (page) => {
    set({ page });
    get().fetchLogs(page);
  },
  
  nextPage: () => {
    const { page, totalPages, fetchLogs } = get();
    if (page < totalPages) {
      set({ page: page + 1 });
      fetchLogs(page + 1);
    }
  },
  
  prevPage: () => {
    const { page, fetchLogs } = get();
    if (page > 1) {
      set({ page: page - 1 });
      fetchLogs(page - 1);
    }
  },
  
  // ==========================================================================
  // Helpers
  // ==========================================================================
  
  getActionConfig: (action) => {
    return ACTION_CONFIG[action] || { icon: 'info', color: 'gray', label: action, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
  },
  
  getEntityConfig: (entityType) => {
    return ENTITY_CONFIG[entityType] || { icon: 'folder', label: entityType, color: 'gray' };
  },
  
  // Formatar log para exibição
  formatLog: (log) => {
    const actionConfig = get().getActionConfig(log.action);
    const entityConfig = get().getEntityConfig(log.entityType);
    
    return {
      ...log,
      actionConfig,
      entityConfig,
      formattedDate: new Date(log.createdAt).toLocaleDateString('pt-BR'),
      formattedTime: new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      formattedDateTime: new Date(log.createdAt).toLocaleString('pt-BR')
    };
  },
  
  // Reset
  reset: () => {
    set({
      logs: [],
      timeline: [],
      recentChanges: [],
      stats: null,
      page: 1,
      totalPages: 1,
      total: 0,
      filters: {
        entityType: null,
        entityId: null,
        action: null,
        userId: null,
        startDate: null,
        endDate: null,
        search: ''
      },
      loading: false,
      loadingTimeline: false,
      loadingStats: false,
      error: null
    });
  }
}));

export default useHistoryStore;
