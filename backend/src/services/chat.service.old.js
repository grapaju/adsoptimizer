// =============================================================================
// CHAT SERVICE - Serviço de chat interno
// Gerencia mensagens entre gestores e clientes
// =============================================================================

const prisma = require('../lib/prisma');

/**
 * Envia uma mensagem
 * @param {Object} user - Usuário autenticado (remetente)
 * @param {Object} messageData - Dados da mensagem
 * @returns {Object} Mensagem criada
 */
async function sendMessage(user, messageData) {
  const { content, clientId, receiverId } = messageData;

  if (!content || !content.trim()) {
    const error = new Error('Conteúdo da mensagem é obrigatório');
    error.status = 400;
    throw error;
  }

  // Validar destinatário
  if (user.role === 'MANAGER') {
    // Gestor envia para cliente
    if (!clientId) {
      const error = new Error('ID do cliente é obrigatório');
      error.status = 400;
      throw error;
    }

    // Verificar se cliente pertence ao gestor
    const client = await prisma.client.findFirst({
      where: { id: clientId, managerId: user.id },
    });

    if (!client) {
      const error = new Error('Cliente não encontrado');
      error.status = 404;
      throw error;
    }
  } else {
    // Cliente envia para seu gestor
    // Buscar o cliente associado ao usuário
    const client = await prisma.client.findFirst({
      where: { email: user.email },
    });

    if (!client) {
      const error = new Error('Cliente não encontrado');
      error.status = 404;
      throw error;
    }
  }

  // Criar mensagem
  const message = await prisma.chatMessage.create({
    data: {
      content: content.trim(),
      senderId: user.id,
      clientId: clientId || null,
      receiverId: receiverId || null,
    },
    include: {
      sender: {
        select: { id: true, name: true, email: true, role: true },
      },
      client: {
        select: { id: true, name: true },
      },
    },
  });

  return message;
}

/**
 * Lista mensagens de uma conversa com um cliente
 * @param {number} clientId - ID do cliente
 * @param {Object} user - Usuário autenticado
 * @param {Object} options - Opções de paginação
 * @returns {Object} Mensagens e informações da conversa
 */
async function listMessages(clientId, user, options = {}) {
  const { page = 1, limit = 50 } = options;

  // Verificar permissão
  if (user.role === 'MANAGER') {
    const client = await prisma.client.findFirst({
      where: { id: clientId, managerId: user.id },
    });

    if (!client) {
      const error = new Error('Cliente não encontrado');
      error.status = 404;
      throw error;
    }
  }

  // Buscar mensagens
  const [messages, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { clientId },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.chatMessage.count({ where: { clientId } }),
  ]);

  // Marcar mensagens como lidas
  const unreadIds = messages
    .filter(m => !m.isRead && m.senderId !== user.id)
    .map(m => m.id);

  if (unreadIds.length > 0) {
    await prisma.chatMessage.updateMany({
      where: { id: { in: unreadIds } },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // Buscar informações do cliente
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, company: true, email: true },
  });

  return {
    messages: messages.reverse(), // Ordenar do mais antigo para o mais recente
    client,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    unreadMarked: unreadIds.length,
  };
}

/**
 * Lista todas as conversas do usuário
 * @param {Object} user - Usuário autenticado
 * @returns {Array} Lista de conversas com última mensagem
 */
async function listConversations(user) {
  if (user.role === 'MANAGER') {
    // Buscar todos os clientes do gestor
    const clients = await prisma.client.findMany({
      where: { managerId: user.id, isActive: true },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    // Para cada cliente, buscar última mensagem e contagem de não lidas
    const conversations = await Promise.all(
      clients.map(async (client) => {
        const lastMessage = await prisma.chatMessage.findFirst({
          where: { clientId: client.id },
          orderBy: { createdAt: 'desc' },
          select: { content: true, createdAt: true, senderId: true },
        });

        const unreadCount = await prisma.chatMessage.count({
          where: {
            clientId: client.id,
            senderId: { not: user.id },
            isRead: false,
          },
        });

        return {
          client,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
                createdAt: lastMessage.createdAt,
                isOwn: lastMessage.senderId === user.id,
              }
            : null,
          unreadCount,
        };
      })
    );

    // Ordenar por última mensagem
    return conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    });
  } else {
    // Cliente vê apenas sua conversa com o gestor
    const client = await prisma.client.findFirst({
      where: { email: user.email },
      include: {
        manager: {
          select: { id: true, name: true },
        },
      },
    });

    if (!client) {
      return [];
    }

    const lastMessage = await prisma.chatMessage.findFirst({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
      select: { content: true, createdAt: true, senderId: true },
    });

    const unreadCount = await prisma.chatMessage.count({
      where: {
        clientId: client.id,
        senderId: { not: user.id },
        isRead: false,
      },
    });

    return [
      {
        client: {
          id: client.id,
          name: client.manager.name,
          company: 'Seu Gestor',
        },
        lastMessage: lastMessage
          ? {
              content: lastMessage.content.substring(0, 50),
              createdAt: lastMessage.createdAt,
              isOwn: lastMessage.senderId === user.id,
            }
          : null,
        unreadCount,
      },
    ];
  }
}

/**
 * Conta mensagens não lidas do usuário
 * @param {Object} user - Usuário autenticado
 * @returns {number} Contagem de não lidas
 */
async function countUnread(user) {
  if (user.role === 'MANAGER') {
    // Buscar IDs dos clientes do gestor
    const clients = await prisma.client.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });

    const clientIds = clients.map(c => c.id);

    return await prisma.chatMessage.count({
      where: {
        clientId: { in: clientIds },
        senderId: { not: user.id },
        isRead: false,
      },
    });
  } else {
    const client = await prisma.client.findFirst({
      where: { email: user.email },
    });

    if (!client) return 0;

    return await prisma.chatMessage.count({
      where: {
        clientId: client.id,
        senderId: { not: user.id },
        isRead: false,
      },
    });
  }
}

/**
 * Marca todas as mensagens de uma conversa como lidas
 * @param {number} clientId - ID do cliente
 * @param {Object} user - Usuário autenticado
 */
async function markAllAsRead(clientId, user) {
  await prisma.chatMessage.updateMany({
    where: {
      clientId,
      senderId: { not: user.id },
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

module.exports = {
  sendMessage,
  listMessages,
  listConversations,
  countUnread,
  markAllAsRead,
};
