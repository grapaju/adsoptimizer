import { create } from 'zustand';
import api from '../services/api';
import { socketService } from '../services/socket';

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  unreadCount: 0,
  isLoading: false,
  isTyping: {},

  fetchConversations: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/chat/conversations');
      set({
        conversations: response.data,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  fetchMessages: async (conversationId, params = {}) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
      set({
        messages: response.data.messages,
        currentConversation: conversationId,
        isLoading: false
      });
      
      // Join socket room
      socketService.joinConversation(conversationId);
      
      return response.data;
    } catch (error) {
      set({ isLoading: false });
      return null;
    }
  },

  sendMessage: async (conversationId, content, messageType = 'text') => {
    try {
      const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
        content,
        messageType
      });
      
      // Message will be added via socket
      return { success: true, message: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  createConversation: async (participantId, campaignId = null) => {
    try {
      const response = await api.post('/chat/conversations', {
        participantId,
        campaignId
      });
      
      set(state => ({
        conversations: [response.data, ...state.conversations.filter(c => c.id !== response.data.id)]
      }));
      
      return { success: true, conversation: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  addMessage: (message) => {
    set(state => {
      // Add to messages if in current conversation
      if (state.currentConversation === message.conversation_id) {
        return {
          messages: [...state.messages, message]
        };
      }
      
      // Update unread count
      return {
        unreadCount: state.unreadCount + 1,
        conversations: state.conversations.map(conv =>
          conv.id === message.conversation_id
            ? { ...conv, last_message: message.content, unread_count: (conv.unread_count || 0) + 1 }
            : conv
        )
      };
    });
  },

  markAsRead: async (conversationId, messageIds) => {
    try {
      await api.put(`/chat/conversations/${conversationId}/read`, { messageIds });
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  },

  setTyping: (conversationId, userId, isTyping) => {
    set(state => ({
      isTyping: {
        ...state.isTyping,
        [conversationId]: isTyping ? userId : null
      }
    }));
  },

  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/chat/unread');
      set({ unreadCount: response.data.unreadCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  leaveConversation: (conversationId) => {
    socketService.leaveConversation(conversationId);
    set({ currentConversation: null, messages: [] });
  },

  uploadAttachment: async (conversationId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(
        `/chat/conversations/${conversationId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      return { success: true, message: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.error };
    }
  },

  searchMessages: async (query) => {
    try {
      const response = await api.get('/chat/search', { params: { q: query } });
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  },

  setOnlineUsers: (onlineUsers) => {
    set({ onlineUsers });
  },

  updateMessagesRead: (conversationId, messageIds) => {
    set(state => ({
      messages: state.messages.map(msg =>
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
      )
    }));
  },

  clearChat: () => {
    set({ 
      currentConversation: null, 
      messages: [], 
      isTyping: {} 
    });
  }
}));
