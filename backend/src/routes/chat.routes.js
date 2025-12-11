/**
 * Rotas para chat entre gestor e clientes
 * Define endpoints para conversas e mensagens
 */
import { Router } from 'express';
import multer from 'multer';
import {
  listConversations,
  createOrGetConversation,
  getConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  uploadFile
} from '../controllers/chat.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar conversas do usuário
router.get('/conversations', listConversations);

// Criar ou buscar conversa existente
router.post('/conversations', createOrGetConversation);

// Buscar conversa específica
router.get('/conversations/:conversationId', getConversation);

// Buscar mensagens de uma conversa
router.get('/conversations/:conversationId/messages', getMessages);

// Enviar mensagem
router.post('/conversations/:conversationId/messages', sendMessage);

// Marcar mensagens como lidas
router.put('/conversations/:conversationId/read', markAsRead);

// Contar mensagens não lidas
router.get('/unread', getUnreadCount);

// Upload de arquivo
router.post('/upload', upload.single('file'), uploadFile);

export default router;
