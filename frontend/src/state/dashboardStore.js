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
      const data = response.data?.data || response.data;
      set({
        managerData: data,
        isLoading: false
      });
      return data;
    } catch (error) {
      console.error('Error fetching manager dashboard:', error);
      set({ isLoading: false, managerData: {} });
      return null;
    }
  },

  fetchClientDashboard: async (period = '7d') => {
    set({ isLoading: true, period });
    try {
      const response = await api.get('/metrics/dashboard/client', { params: { period } });
      const data = response.data?.data || response.data;
      set({
        clientData: data,
        isLoading: false
      });
      return data;
    } catch (error) {
      console.error('Error fetching client dashboard:', error);
      set({ isLoading: false, clientData: {} });
      return null;
    }
  },

  setPeriod: (period) => set({ period }),

  clearData: () => set({ managerData: null, clientData: null })
}));
