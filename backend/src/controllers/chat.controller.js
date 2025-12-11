/**
 * Controller de Chat
 * Endpoints para gerenciamento de conversas e mensagens
 */

import * as chatService from '../services/chat.service.js';
import prisma from '../lib/prisma.js';
import path from 'path';
import fs from 'fs';

/**
 * GET /chat/conversations
 * Lista todas as conversas do usuário
 */
export async function listConversations(req, res, next) {
  try {
    const conversations = await chatService.listConversations(req.user);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /chat/conversations
 * Cria ou busca uma conversa existente
 */
export async function createOrGetConversation(req, res, next) {
  try {
    const { clientId } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente é obrigatório'
      });
    }

    // Apenas gestores podem criar conversas
    if (req.user.role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Apenas gestores podem iniciar conversas'
      });
    }

    const conversation = await chatService.createOrGetConversation(
      req.user.id,
      parseInt(clientId)
    );

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /chat/conversations/:conversationId
 * Busca uma conversa específica
 */
export async function getConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    
    const conversation = await chatService.getConversationById(
      parseInt(conversationId),
      req.user
    );

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /chat/conversations/:conversationId/messages
 * Lista mensagens de uma conversa
 */
export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    const result = await chatService.getMessages(
      parseInt(conversationId),
      req.user,
      { page: parseInt(page), limit: parseInt(limit), before }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /chat/conversations/:conversationId/messages
 * Envia uma mensagem
 */
export async function sendMessage(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { content, type, attachmentUrl, attachmentName, attachmentType, attachmentSize } = req.body;

    const message = await chatService.sendMessage(
      parseInt(conversationId),
      req.user,
      { content, type, attachmentUrl, attachmentName, attachmentType, attachmentSize }
    );

    // Emitir via socket se disponível
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('new_message', message);
      
      // Buscar conversa para notificar o outro participante
      const conversation = await chatService.getConversationById(
        parseInt(conversationId),
        req.user
      );
      
      // Determinar o ID do destinatário
      let recipientId;
      if (req.user.role === 'MANAGER') {
        // Buscar userId do cliente
        const client = await prisma.client.findUnique({
          where: { id: conversation.clientId },
          select: { email: true }
        });
        const clientUser = await prisma.user.findUnique({
          where: { email: client.email },
          select: { id: true }
        });
        recipientId = clientUser?.id;
      } else {
        recipientId = conversation.managerId;
      }
      
      if (recipientId) {
        io.to(`user_${recipientId}`).emit('notification', {
          type: 'new_message',
          conversationId: parseInt(conversationId),
          sender: message.sender,
          preview: content?.substring(0, 50) || 'Arquivo anexado'
        });
      }
    }

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /chat/conversations/:conversationId/read
 * Marca mensagens como lidas
 */
export async function markAsRead(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body;

    const result = await chatService.markAsRead(
      parseInt(conversationId),
      req.user,
      messageIds?.map(id => parseInt(id))
    );

    // Emitir via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('messages_read', {
        conversationId: parseInt(conversationId),
        readBy: req.user.id,
        messageIds
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /chat/unread
 * Conta mensagens não lidas
 */
export async function getUnreadCount(req, res, next) {
  try {
    const count = await chatService.countUnread(req.user);

    res.json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /chat/upload
 * Upload de arquivo para o chat
 */
export async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    const file = req.file;
    const uploadDir = path.join(process.cwd(), 'uploads', 'chat');
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Gerar nome único
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Salvar arquivo
    fs.writeFileSync(filePath, file.buffer);

    // Determinar tipo
    const isImage = file.mimetype.startsWith('image/');
    
    res.json({
      success: true,
      data: {
        url: `/uploads/chat/${fileName}`,
        name: file.originalname,
        type: isImage ? 'IMAGE' : 'FILE',
        mimeType: file.mimetype,
        size: file.size
      }
    });
  } catch (error) {
    next(error);
  }
}

export default {
  listConversations,
  createOrGetConversation,
  getConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  uploadFile
};
