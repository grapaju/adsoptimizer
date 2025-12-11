/**
 * Serviço de Socket.IO
 * Gerencia comunicação em tempo real para chat e notificações
 */
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

// Map para rastrear usuários online (userId -> socketId)
const onlineUsers = new Map();

/**
 * Inicializa os handlers do Socket.IO
 * @param {Server} io - Instância do Socket.IO
 */
export function initializeSocket(io) {
  // Middleware de autenticação do socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Autenticação necessária'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, email: true, role: true }
      });

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`Usuário conectado: ${user.name} (${user.id})`);

    // Registrar usuário como online
    onlineUsers.set(user.id, socket.id);
    
    // Entrar na sala do usuário para notificações pessoais
    socket.join(`user_${user.id}`);

    // Broadcast de status online
    io.emit('user_online', { 
      userId: user.id, 
      name: user.name 
    });

    /**
     * Entrar em uma sala de conversa específica
     */
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verificar se usuário tem acesso à conversa
        const conversation = await prisma.chatConversation.findUnique({
          where: { id: parseInt(conversationId) },
          include: { client: true }
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversa não encontrada' });
          return;
        }

        const hasAccess = 
          (user.role === 'MANAGER' && conversation.managerId === user.id) ||
          (conversation.client.email === user.email);

        if (!hasAccess) {
          socket.emit('error', { message: 'Sem permissão para acessar esta conversa' });
          return;
        }

        socket.join(`conversation_${conversationId}`);
        console.log(`${user.name} entrou na conversa ${conversationId}`);

        // Notificar outros participantes
        socket.to(`conversation_${conversationId}`).emit('user_joined', {
          conversationId,
          userId: user.id,
          userName: user.name
        });
      } catch (error) {
        console.error('Erro ao entrar na conversa:', error);
        socket.emit('error', { message: 'Erro ao entrar na conversa' });
      }
    });

    /**
     * Sair de uma sala de conversa
     */
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(`${user.name} saiu da conversa ${conversationId}`);
    });

    /**
     * Enviar mensagem via socket (alternativa ao REST)
     */
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, type = 'TEXT', attachmentUrl, attachmentName, attachmentType, attachmentSize } = data;

        if (!content && !attachmentUrl) {
          socket.emit('error', { message: 'Conteúdo ou anexo é obrigatório' });
          return;
        }

        // Criar mensagem no banco
        const message = await prisma.chatMessage.create({
          data: {
            content: content || '',
            type,
            senderId: user.id,
            conversationId: parseInt(conversationId),
            attachmentUrl,
            attachmentName,
            attachmentType,
            attachmentSize
          },
          include: {
            sender: {
              select: { id: true, name: true, role: true }
            }
          }
        });

        // Atualizar lastMessageAt da conversa
        await prisma.chatConversation.update({
          where: { id: parseInt(conversationId) },
          data: { lastMessageAt: new Date() }
        });

        // Enviar para todos na sala da conversa
        io.to(`conversation_${conversationId}`).emit('new_message', message);

        // Buscar a conversa para notificar o outro participante
        const conversation = await prisma.chatConversation.findUnique({
          where: { id: parseInt(conversationId) },
          include: { client: true }
        });

        if (conversation) {
          // Determinar o destinatário
          let recipientId;
          if (user.id === conversation.managerId) {
            // Buscar userId do cliente
            const clientUser = await prisma.user.findUnique({
              where: { email: conversation.client.email },
              select: { id: true }
            });
            recipientId = clientUser?.id;
          } else {
            recipientId = conversation.managerId;
          }

          if (recipientId) {
            const recipientSocket = onlineUsers.get(recipientId);
            if (recipientSocket) {
              io.to(recipientSocket).emit('notification', {
                type: 'new_message',
                conversationId: parseInt(conversationId),
                sender: message.sender,
                preview: content?.substring(0, 50) || 'Arquivo anexado',
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        // Confirmar envio ao remetente
        socket.emit('message_sent', { 
          messageId: message.id,
          conversationId,
          timestamp: message.createdAt
        });

      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });

    /**
     * Marcar mensagens como lidas
     */
    socket.on('mark_as_read', async (data) => {
      try {
        const { conversationId, messageIds } = data;

        const where = {
          conversationId: parseInt(conversationId),
          senderId: { not: user.id },
          isRead: false
        };

        if (messageIds && messageIds.length > 0) {
          where.id = { in: messageIds.map(id => parseInt(id)) };
        }

        await prisma.chatMessage.updateMany({
          where,
          data: {
            isRead: true,
            readAt: new Date()
          }
        });

        // Notificar todos na sala que as mensagens foram lidas
        io.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId: parseInt(conversationId),
          messageIds,
          readBy: user.id,
          readAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Erro ao marcar como lida:', error);
      }
    });

    /**
     * Indicador de "digitando"
     */
    socket.on('typing', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId: parseInt(conversationId),
        userId: user.id,
        userName: user.name
      });
    });

    /**
     * Indicador de "parou de digitar"
     */
    socket.on('stop_typing', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        conversationId: parseInt(conversationId),
        userId: user.id
      });
    });

    /**
     * Verificar se usuário está online
     */
    socket.on('check_online', (userId) => {
      const isOnline = onlineUsers.has(userId);
      socket.emit('online_status', {
        userId,
        isOnline
      });
    });

    /**
     * Handler de desconexão
     */
    socket.on('disconnect', () => {
      onlineUsers.delete(user.id);
      io.emit('user_offline', { 
        userId: user.id,
        name: user.name 
      });
      console.log(`Usuário desconectado: ${user.name} (${user.id})`);
    });
  });

  return {
    io,
    onlineUsers,
    sendNotificationToUser,
    broadcastAlert,
    isUserOnline
  };
}

/**
 * Envia notificação para um usuário específico
 * @param {Object} io - Instância do Socket.IO
 * @param {number} userId - ID do usuário
 * @param {Object} notification - Dados da notificação
 */
export function sendNotificationToUser(io, userId, notification) {
  const socketId = onlineUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', notification);
    return true;
  }
  return false;
}

/**
 * Verifica se um usuário está online
 * @param {number} userId - ID do usuário
 * @returns {boolean} True se online
 */
export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

/**
 * Broadcast de alerta para múltiplos usuários
 * @param {Object} io - Instância do Socket.IO
 * @param {Array<number>} userIds - Lista de IDs de usuários
 * @param {Object} alert - Dados do alerta
 */
export function broadcastAlert(io, userIds, alert) {
  userIds.forEach(userId => {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('new_alert', alert);
    }
  });
}

/**
 * Obter lista de usuários online
 * @returns {Array<number>} IDs dos usuários online
 */
export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

export default {
  initializeSocket,
  sendNotificationToUser,
  isUserOnline,
  broadcastAlert,
  getOnlineUsers
};
