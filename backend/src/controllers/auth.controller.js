// =============================================================================
// AUTH CONTROLLER - Controlador de autenticação
// Endpoints: POST /auth/login, POST /auth/register, GET /auth/me
// =============================================================================

import * as authService from '../services/auth.service.js';

/**
 * POST /auth/login
 * Realiza login do usuário
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios',
      });
    }

    const result = await authService.login(email, password);

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/register
 * Registra novo usuário
 * Body: { name, email, password, role? }
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    // Validação básica
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios',
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido',
      });
    }

    // Validar senha
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres',
      });
    }

    const result = await authService.register({
      name,
      email,
      password,
      role: role || 'CLIENT',
    });

    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /auth/me
 * Retorna dados do usuário autenticado
 */
async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /auth/profile
 * Atualiza perfil do usuário
 * Body: { name?, email?, currentPassword?, newPassword? }
 */
async function updateProfile(req, res, next) {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // Se está alterando senha, verificar senha atual
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Senha atual é obrigatória para alterar a senha',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'A nova senha deve ter no mínimo 6 caracteres',
        });
      }

      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    const user = await authService.updateUser(req.user.id, updateData);

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /auth/refresh
 * Renova o token JWT
 */
async function refreshToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido',
      });
    }

    const result = await authService.refreshToken(token);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  login,
  register,
  me,
  updateProfile,
  refreshToken,
};
