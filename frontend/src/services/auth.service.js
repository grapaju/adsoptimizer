/**
 * Serviço de Autenticação
 * Gerencia login, registro e perfil do usuário
 */
import api from './api';

export const authService = {
  /**
   * Login do usuário
   * @param {string} email - Email do usuário
   * @param {string} password - Senha do usuário
   */
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Registro de novo usuário
   * @param {object} userData - Dados do usuário
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Buscar dados do usuário logado
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Atualizar perfil do usuário
   * @param {object} data - Dados a atualizar
   */
  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  /**
   * Alterar senha
   * @param {string} currentPassword - Senha atual
   * @param {string} newPassword - Nova senha
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/password', { currentPassword, newPassword });
    return response.data;
  },
};

export default authService;
