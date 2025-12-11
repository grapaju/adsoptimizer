/**
 * Serviço de Chat
 * Gerencia conversas e mensagens em tempo real
 */
import api from './api';

export const chatService = {
  /**
   * Listar conversas do usuário
   */
  listConversations: async () => {
    const response = await api.get('/chat/conversations');
    return response.data;
  },

  /**
   * Criar ou buscar conversa existente
   * @param {number} clientId - ID do cliente
   */
  createOrGetConversation: async (clientId) => {
    const response = await api.post('/chat/conversations', { clientId });
    return response.data;
  },

  /**
   * Buscar mensagens de uma conversa
   * @param {number} conversationId - ID da conversa
   * @param {object} params - Parâmetros de paginação
   */
  getMessages: async (conversationId, params = {}) => {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  /**
   * Enviar mensagem
   * @param {number} conversationId - ID da conversa
   * @param {object} data - Dados da mensagem
   */
  sendMessage: async (conversationId, data) => {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  /**
   * Marcar mensagens como lidas
   * @param {number} conversationId - ID da conversa
   */
  markAsRead: async (conversationId) => {
    const response = await api.put(`/chat/conversations/${conversationId}/read`);
    return response.data;
  },

  /**
   * Buscar contagem de não lidas
   */
  getUnreadCount: async () => {
    const response = await api.get('/chat/unread');
    return response.data;
  },

  /**
   * Upload de arquivo para chat
   * @param {number} conversationId - ID da conversa
   * @param {File} file - Arquivo a ser enviado
   */
  uploadFile: async (conversationId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/chat/conversations/${conversationId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Buscar mensagens
   * @param {string} query - Termo de busca
   */
  searchMessages: async (query) => {
    const response = await api.get('/chat/search', { params: { q: query } });
    return response.data;
  }
};

export default chatService;
