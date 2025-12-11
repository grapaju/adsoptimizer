import { create } from 'zustand';
import api from '../services/api';

export const useCampaignStore = create((set, get) => ({
  campaigns: [],
  currentCampaign: null,
  metrics: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  },

  fetchCampaigns: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/campaigns', { params });
      set({
        campaigns: response.data.campaigns,
        pagination: response.data.pagination,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.error || 'Erro ao buscar campanhas'
      });
    }
  },

  fetchCampaign: async (campaignId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      set({
        currentCampaign: response.data,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({
        isLoading: false,
        error: error.response?.data?.error || 'Erro ao buscar campanha'
      });
      return null;
    }
  },

  fetchCampaignMetrics: async (campaignId, params = {}) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/metrics/campaign/${campaignId}`, { params });
      set({
        metrics: response.data,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      return null;
    }
  },

  createCampaign: async (data) => {
    try {
      const response = await api.post('/campaigns', data);
      set(state => ({
        campaigns: [response.data, ...state.campaigns]
      }));
      return { success: true, campaign: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  updateCampaign: async (campaignId, data) => {
    try {
      const response = await api.put(`/campaigns/${campaignId}`, data);
      set(state => ({
        campaigns: state.campaigns.map(c => 
          c.id === campaignId ? response.data : c
        ),
        currentCampaign: state.currentCampaign?.id === campaignId 
          ? response.data 
          : state.currentCampaign
      }));
      return { success: true, campaign: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  syncCampaign: async (campaignId) => {
    try {
      const response = await api.post(`/campaigns/${campaignId}/sync`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  deleteCampaign: async (campaignId) => {
    try {
      await api.delete(`/campaigns/${campaignId}`);
      set(state => ({
        campaigns: state.campaigns.filter(c => c.id !== campaignId)
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  clearCurrentCampaign: () => set({ currentCampaign: null, metrics: null }),
  clearError: () => set({ error: null })
}));
