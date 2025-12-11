/**
 * Rotas para alertas e configurações de alertas
 * Define endpoints para gerenciamento de alertas automáticos
 */
const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar alertas do usuário
router.get('/', alertController.list);

// Buscar alertas não lidos
router.get('/unread', alertController.getUnread);

// Marcar todos como lidos
router.put('/read-all', alertController.markAllAsRead);

// Marcar alerta como lido
router.put('/:alertId/read', alertController.markAsRead);

// Resolver alerta
router.put('/:alertId/resolve', alertController.resolve);

// Configurações de alertas
router.get('/settings', alertController.listAlertSettings);
router.post('/settings', alertController.createAlertSetting);
router.put('/settings/:settingId', alertController.updateAlertSetting);
router.delete('/settings/:settingId', alertController.deleteAlertSetting);

module.exports = router;
