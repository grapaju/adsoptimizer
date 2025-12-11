import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { user, token } = response.data.data || response.data;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          return { success: true, user };
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || error.response?.data?.error || 'Erro ao fazer login' 
          });
          return { success: false, error: error.response?.data?.message || error.response?.data?.error };
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', data);
          const { user, token } = response.data.data || response.data;
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          return { success: true, user };
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error.response?.data?.message || error.response?.data?.error || 'Erro ao registrar' 
          });
          return { success: false, error: error.response?.data?.message || error.response?.data?.error };
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) return;

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          set({ user: response.data, isAuthenticated: true });
        } catch (error) {
          get().logout();
        }
      },

      updateProfile: async (data) => {
        try {
          const response = await api.put('/auth/profile', data);
          set({ user: response.data });
          return { success: true };
        } catch (error) {
          return { success: false, error: error.response?.data?.error };
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
