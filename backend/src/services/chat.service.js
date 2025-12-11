/**
 * Serviço de Chat Interno
 * Gerencia conversas e mensagens entre gestores e clientes
 */

import prisma from '../lib/prisma.js';

/**
 * Cria ou busca uma conversa existente entre gestor e cliente
 * @param {number} managerId - ID do gestor
 * @param {number} clientId - ID do cliente
 * @returns {Object} Conversa criada ou existente
 */
export async function createOrGetConversation(managerId, clientId) {
  // Verificar se o cliente pertence ao gestor
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      managerId: managerId
    }
  });

  if (!client) {
    const error = new Error('Cliente não encontrado ou não pertence a este gestor');
    error.status = 404;
    throw error;
  }

  // Buscar ou criar conversa
  let conversation = await prisma.chatConversation.findFirst({
    where: {
      managerId,
      clientId
    },
    include: {
      client: {
        select: { id: true, name: true, company: true, email: true }
      },
      manager: {
        select: { id: true, name: true, email: true }
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true }
      }
    }
  });

  if (!conversation) {
    conversation = await prisma.chatConversation.create({
      data: {
        managerId,
        clientId
      },
      include: {
        client: {
          select: { id: true, name: true, company: true, email: true }
        },
        manager: {
          select: { id: true, name: true, email: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true }
        }
      }
    });
  }

  return conversation;
}

/**
 * Lista todas as conversas de um usuário
 * @param {Object} user - Usuário autenticado
 * @returns {Array} Lista de conversas
 */
export async function listConversations(user) {
  let conversations;

  if (user.role === 'MANAGER') {
    // Gestor vê todas as conversas com seus clientes
    conversations = await prisma.chatConversation.findMany({
      where: { managerId: user.id },
      include: {
        client: {
          select: { id: true, name: true, company: true, email: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderId: true, isRead: true }
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: user.id }
              }
            }
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Formatar para o frontend
    return conversations.map(conv => ({
      id: conv.id,
      participantId: conv.clientId,
      participantName: conv.client.name,
      participantCompany: conv.client.company,
      participantEmail: conv.client.email,
      lastMessage: conv.messages[0]?.content || null,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: conv._count.messages,
      isOnline: false // Será atualizado pelo socket
    }));
  } else {
    // Cliente vê suas conversas com gestores
    const client = await prisma.client.findFirst({
      where: { email: user.email }
    });

    if (!client) {
      return [];
    }

    conversations = await prisma.chatConversation.findMany({
      where: { clientId: client.id },
      include: {
        manager: {
          select: { id: true, name: true, company: true, email: true }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderId: true, isRead: true }
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: user.id }
              }
            }
          }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    return conversations.map(conv => ({
      id: conv.id,
      participantId: conv.managerId,
      participantName: conv.manager.name,
      participantCompany: conv.manager.company,
      participantEmail: conv.manager.email,
      lastMessage: conv.messages[0]?.content || null,
      lastMessageAt: conv.lastMessageAt,
      unreadCount: conv._count.messages,
      isOnline: false
    }));
  }
}

/**
 * Busca mensagens de uma conversa
 * @param {number} conversationId - ID da conversa
 * @param {Object} user - Usuário autenticado
 * @param {Object} options - Opções de paginação
 * @returns {Object} Mensagens e informações da conversa
 */
export async function getMessages(conversationId, user, options = {}) {
  const { page = 1, limit = 50, before } = options;

  // Verificar acesso à conversa
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      client: { select: { id: true, name: true, company: true } },
      manager: { select: { id: true, name: true } }
    }
  });

  if (!conversation) {
    const error = new Error('Conversa não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  const isManager = user.role === 'MANAGER' && conversation.managerId === user.id;
  const isClient = await prisma.client.findFirst({
    where: { id: conversation.clientId, email: user.email }
  });

  if (!isManager && !isClient) {
    const error = new Error('Sem permissão para acessar esta conversa');
    error.status = 403;
    throw error;
  }

  // Buscar mensagens
  const where = { conversationId };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const messages = await prisma.chatMessage.findMany({
    where,
    include: {
      sender: {
        select: { id: true, name: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: before ? 0 : (page - 1) * limit
  });

  // Contar total
  const total = await prisma.chatMessage.count({ where: { conversationId } });

  return {
    conversation: {
      id: conversation.id,
      client: conversation.client,
      manager: conversation.manager
    },
    messages: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      hasMore: messages.length === limit
    }
  };
}

/**
 * Envia uma mensagem
 * @param {number} conversationId - ID da conversa
 * @param {Object} user - Usuário remetente
 * @param {Object} messageData - Dados da mensagem
 * @returns {Object} Mensagem criada
 */
export async function sendMessage(conversationId, user, messageData) {
  const { content, type = 'TEXT', attachmentUrl, attachmentName, attachmentType, attachmentSize } = messageData;

  if (!content && !attachmentUrl) {
    const error = new Error('Conteúdo ou anexo é obrigatório');
    error.status = 400;
    throw error;
  }

  // Verificar acesso à conversa
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      client: true,
      manager: { select: { id: true, name: true } }
    }
  });

  if (!conversation) {
    const error = new Error('Conversa não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  const isManager = user.role === 'MANAGER' && conversation.managerId === user.id;
  const isClient = await prisma.client.findFirst({
    where: { id: conversation.clientId, email: user.email }
  });

  if (!isManager && !isClient) {
    const error = new Error('Sem permissão para enviar mensagens nesta conversa');
    error.status = 403;
    throw error;
  }

  // Criar mensagem
  const message = await prisma.chatMessage.create({
    data: {
      content: content || '',
      type,
      senderId: user.id,
      conversationId,
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
    where: { id: conversationId },
    data: { lastMessageAt: new Date() }
  });

  return message;
}

/**
 * Marca mensagens como lidas
 * @param {number} conversationId - ID da conversa
 * @param {Object} user - Usuário que leu
 * @param {Array<number>} messageIds - IDs das mensagens (opcional)
 * @returns {Object} Resultado
 */
export async function markAsRead(conversationId, user, messageIds = null) {
  const where = {
    conversationId,
    senderId: { not: user.id },
    isRead: false
  };

  if (messageIds && messageIds.length > 0) {
    where.id = { in: messageIds };
  }

  const result = await prisma.chatMessage.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  return { updatedCount: result.count };
}

/**
 * Conta mensagens não lidas do usuário
 * @param {Object} user - Usuário autenticado
 * @returns {number} Contagem de não lidas
 */
export async function countUnread(user) {
  let conversationIds = [];

  if (user.role === 'MANAGER') {
    const conversations = await prisma.chatConversation.findMany({
      where: { managerId: user.id },
      select: { id: true }
    });
    conversationIds = conversations.map(c => c.id);
  } else {
    const client = await prisma.client.findFirst({
      where: { email: user.email }
    });
    if (client) {
      const conversations = await prisma.chatConversation.findMany({
        where: { clientId: client.id },
        select: { id: true }
      });
      conversationIds = conversations.map(c => c.id);
    }
  }

  if (conversationIds.length === 0) return 0;

  const count = await prisma.chatMessage.count({
    where: {
      conversationId: { in: conversationIds },
      senderId: { not: user.id },
      isRead: false
    }
  });

  return count;
}

/**
 * Busca conversa por ID com dados completos
 * @param {number} conversationId - ID da conversa
 * @param {Object} user - Usuário autenticado
 * @returns {Object} Conversa com participantes
 */
export async function getConversationById(conversationId, user) {
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: {
      client: {
        select: { id: true, name: true, company: true, email: true }
      },
      manager: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!conversation) {
    const error = new Error('Conversa não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  if (user.role === 'MANAGER' && conversation.managerId !== user.id) {
    const error = new Error('Sem permissão');
    error.status = 403;
    throw error;
  }

  return conversation;
}

export default {
  createOrGetConversation,
  listConversations,
  getMessages,
  sendMessage,
  markAsRead,
  countUnread,
  getConversationById
};
