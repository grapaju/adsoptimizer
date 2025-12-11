import { create } from 'zustand';
import api from '../services/api';

export const useDashboardStore = create((set) => ({
  managerData: null,
  clientData: null,
  isLoading: false,
  period: '7d',

  fetchManagerDashboard: async (period = '7d') => {
    set({ isLoading: true, period });
    try {
      const response = await api.get('/metrics/dashboard/manager', { params: { period } });
      set({
        managerData: response.data,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      return null;
    }
  },

  fetchClientDashboard: async (period = '7d') => {
    set({ isLoading: true, period });
    try {
      const response = await api.get('/metrics/dashboard/client', { params: { period } });
      set({
        clientData: response.data,
        isLoading: false
      });
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      return null;
    }
  },

  setPeriod: (period) => set({ period }),

  clearData: () => set({ managerData: null, clientData: null })
}));
