/**
 * Rotas para gerenciamento de clientes
 * Define endpoints para CRUD de clientes e estatísticas
 */
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { authMiddleware, managerOnly } = require('../middlewares/auth.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar clientes (apenas gestor)
router.get('/', managerOnly, clientController.list);

// Obter estatísticas dos clientes (apenas gestor)
router.get('/stats', managerOnly, clientController.getStats);

// Obter cliente por ID (apenas gestor)
router.get('/:id', managerOnly, clientController.getById);

// Criar cliente (apenas gestor)
router.post('/', managerOnly, clientController.create);

// Atualizar cliente (apenas gestor)
router.put('/:id', managerOnly, clientController.update);

// Deletar cliente (apenas gestor)
router.delete('/:id', managerOnly, clientController.remove);

module.exports = router;
