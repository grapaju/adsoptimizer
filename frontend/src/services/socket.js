import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    // Em produção, usa a mesma URL do site (backend servindo frontend)
    // Em desenvolvimento, usa localhost:3001
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
      (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001');
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(data) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', data);
    }
  }

  startTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing', conversationId);
    }
  }

  stopTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('stop_typing', conversationId);
    }
  }

  markAsRead(conversationId, messageIds) {
    if (this.socket?.connected) {
      this.socket.emit('mark_as_read', { conversationId, messageIds });
    }
  }

  checkOnline(userId) {
    if (this.socket?.connected) {
      this.socket.emit('check_online', userId);
    }
  }

  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserStopTyping(callback) {
    if (this.socket) {
      this.socket.on('user_stop_typing', callback);
    }
  }

  onMessagesRead(callback) {
    if (this.socket) {
      this.socket.on('messages_read', callback);
    }
  }

  onNewAlert(callback) {
    if (this.socket) {
      this.socket.on('new_alert', callback);
    }
  }

  onNotification(callback) {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export const socketService = new SocketService();
