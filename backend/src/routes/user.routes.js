/**
 * Rotas de usuários (legado)
 * Para operações de clientes, use /api/clients
 * Este arquivo mantém compatibilidade com código existente
 */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, managerOnly } = require('../middlewares/auth.middleware');

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar clientes (gestor) - Deprecated: use /api/clients
router.get('/clients', managerOnly, userController.listClients);

// Criar cliente (gestor) - Deprecated: use /api/clients
router.post('/clients', managerOnly, userController.createClient);

// Buscar gestor (cliente)
router.get('/my-manager', userController.getManager);

// Buscar cliente por ID - Deprecated: use /api/clients/:id
router.get('/clients/:clientId', userController.getClient);

// Atualizar cliente - Deprecated: use /api/clients/:id
router.put('/clients/:clientId', userController.updateClient);

// Desativar cliente (gestor) - Deprecated: use /api/clients/:id
router.delete('/clients/:clientId', managerOnly, userController.deactivateClient);

module.exports = router;
