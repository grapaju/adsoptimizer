// =============================================================================
// CHAT CONTROLLER - Controlador de chat interno
// Endpoints: POST /chat/send, GET /chat/list/:clientId
// =============================================================================

const chatService = require('../services/chat.service');

/**
 * POST /chat/send
 * Envia uma mensagem
 */
async function sendMessage(req, res, next) {
  try {
    const { content, clientId, receiverId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Conteúdo da mensagem é obrigatório',
      });
    }

    const message = await chatService.sendMessage(req.user, {
      content,
      clientId: clientId ? parseInt(clientId) : null,
      receiverId: receiverId ? parseInt(receiverId) : null,
    });

    // Emitir via socket se disponível
    const io = req.app.get('io');
    if (io && clientId) {
      io.to(`client_${clientId}`).emit('new_message', message);
    }

    res.status(201).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /chat/list/:clientId
 * Lista mensagens de uma conversa com cliente
 */
async function listMessages(req, res, next) {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await chatService.listMessages(
      parseInt(clientId),
      req.user,
      { page: parseInt(page), limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /chat/conversations
 * Lista todas as conversas do usuário
 */
async function listConversations(req, res, next) {
  try {
    const conversations = await chatService.listConversations(req.user);

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /chat/unread
 * Conta mensagens não lidas
 */
async function getUnreadCount(req, res, next) {
  try {
    const count = await chatService.countUnread(req.user);

    res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /chat/read/:clientId
 * Marca todas as mensagens de uma conversa como lidas
 */
async function markAsRead(req, res, next) {
  try {
    const { clientId } = req.params;

    await chatService.markAllAsRead(parseInt(clientId), req.user);

    res.json({
      success: true,
      message: 'Mensagens marcadas como lidas',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendMessage,
  listMessages,
  listConversations,
  getUnreadCount,
  markAsRead,
};
