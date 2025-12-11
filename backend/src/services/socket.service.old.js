/**
 * Serviço de Socket.IO
 * Gerencia comunicação em tempo real para chat e notificações
 */
const prisma = require('../lib/prisma');

module.exports = (io) => {
  // Map para rastrear usuários online (userId -> socketId)
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Usuário conectado:', socket.id);

    /**
     * Autenticar usuário na conexão do socket
     * Registra o usuário no map de online
     */
    socket.on('authenticate', (userId) => {
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      console.log(`Usuário ${userId} autenticado`);
      
      // Notificar outros usuários que está online
      io.emit('user_online', { userId });
    });

    /**
     * Entrar em uma sala de conversa específica
     * Permite receber mensagens em tempo real dessa conversa
     */
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(`Socket ${socket.id} entrou na conversa ${conversationId}`);
    });

    /**
     * Sair de uma sala de conversa
     */
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    /**
     * Enviar mensagem via socket
     * Salva no banco e emite para todos na sala
     */
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, attachmentUrl, attachmentName } = data;
        
        // Criar mensagem no banco usando Prisma
        const message = await prisma.chatMessage.create({
          data: {
            conversationId,
            senderId: socket.userId,
            content,
            attachmentUrl,
            attachmentName
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        });
        
        // Atualizar lastMessageAt da conversa
        await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() }
        });
        
        // Enviar para todos na sala da conversa
        io.to(`conversation_${conversationId}`).emit('new_message', message);
        
        // Buscar a conversa para notificar o outro participante
        const conversation = await prisma.chatConversation.findUnique({
          where: { id: conversationId },
          select: {
            managerId: true,
            clientId: true,
            client: {
              select: { userId: true }
            }
          }
        });
        
        if (conversation) {
          // Determinar o destinatário
          let recipientId;
          if (socket.userId === conversation.managerId) {
            recipientId = conversation.client.userId;
          } else {
            recipientId = conversation.managerId;
          }
          
          const recipientSocket = onlineUsers.get(recipientId);
          
          if (recipientSocket) {
            io.to(recipientSocket).emit('notification', {
              type: 'new_message',
              conversationId,
              sender: message.sender,
              preview: content.substring(0, 50)
            });
          }
        }
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });

    /**
     * Marcar mensagens como lidas
     * Atualiza no banco e notifica o sender
     */
    socket.on('mark_as_read', async (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        // Atualizar mensagens como lidas usando Prisma
        await prisma.chatMessage.updateMany({
          where: {
            id: { in: messageIds },
            conversationId,
            senderId: { not: socket.userId }
          },
          data: {
            isRead: true,
            readAt: new Date()
          }
        });
        
        // Notificar todos na sala que as mensagens foram lidas
        io.to(`conversation_${conversationId}`).emit('messages_read', {
          conversationId,
          messageIds,
          readBy: socket.userId
        });
      } catch (error) {
        console.error('Erro ao marcar como lida:', error);
      }
    });

    /**
     * Indicador de "digitando"
     * Emite evento para outros participantes da conversa
     */
    socket.on('typing', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    /**
     * Indicador de "parou de digitar"
     */
    socket.on('stop_typing', (conversationId) => {
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: socket.userId
      });
    });

    /**
     * Enviar alerta em tempo real para usuário específico
     */
    socket.on('send_alert', (data) => {
      const { userId, alert } = data;
      const targetSocket = onlineUsers.get(userId);
      
      if (targetSocket) {
        io.to(targetSocket).emit('new_alert', alert);
      }
    });

    /**
     * Handler de desconexão
     * Remove usuário do map e notifica outros
     */
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user_offline', { userId: socket.userId });
      }
      console.log('Usuário desconectado:', socket.id);
    });
  });

  /**
   * Envia notificação para um usuário específico
   * @param {string} userId - ID do usuário
   * @param {object} notification - Dados da notificação
   */
  const sendNotificationToUser = (userId, notification) => {
    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('notification', notification);
    }
  };

  /**
   * Broadcast de alerta para múltiplos usuários
   * @param {string[]} userIds - Lista de IDs de usuários
   * @param {object} alert - Dados do alerta
   */
  const broadcastAlert = (userIds, alert) => {
    userIds.forEach(userId => {
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit('new_alert', alert);
      }
    });
  };

  return {
    io,
    onlineUsers,
    sendNotificationToUser,
    broadcastAlert
  };
};
