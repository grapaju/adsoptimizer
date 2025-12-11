/**
 * Rotas para chat entre gestor e clientes
 * Define endpoints para conversas e mensagens
 */
import express from 'express';
import multer from 'multer';
import * as chatController from '../controllers/chat.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar conversas do usuário
router.get('/conversations', chatController.listConversations);

// Criar ou buscar conversa existente
router.post('/conversations', chatController.createOrGetConversation);

// Buscar conversa específica
router.get('/conversations/:conversationId', chatController.getConversation);

// Buscar mensagens de uma conversa
router.get('/conversations/:conversationId/messages', chatController.getMessages);

// Enviar mensagem
router.post('/conversations/:conversationId/messages', chatController.sendMessage);

// Marcar mensagens como lidas
router.put('/conversations/:conversationId/read', chatController.markAsRead);

// Contar mensagens não lidas
router.get('/unread', chatController.getUnreadCount);

// Upload de arquivo
router.post('/upload', upload.single('file'), chatController.uploadFile);

export default router;
