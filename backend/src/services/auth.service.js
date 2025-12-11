// =============================================================================
// AUTH SERVICE - Serviço de autenticação
// Gerencia login, registro e validação de tokens JWT
// =============================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Configurações do JWT
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Registra um novo usuário (apenas gestores podem se registrar)
 * @param {Object} userData - Dados do usuário
 * @returns {Object} Usuário criado e token JWT
 */
async function register(userData) {
  const { email, password, name, company, phone } = userData;

  // Verificar se email já existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    const error = new Error('Email já cadastrado');
    error.status = 400;
    throw error;
  }

  // Hash da senha
  const hashedPassword = await bcrypt.hash(password, 10);

  // Criar usuário (sempre como MANAGER no registro direto)
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      company,
      phone,
      role: 'MANAGER', // Apenas gestores podem se registrar
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      company: true,
      createdAt: true,
    },
  });

  // Gerar token JWT
  const token = generateToken(user);

  return { user, token };
}

/**
 * Realiza login do usuário
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @returns {Object} Usuário e token JWT
 */
async function login(email, password) {
  // Buscar usuário pelo email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const error = new Error('Credenciais inválidas');
    error.status = 401;
    throw error;
  }

  // Verificar se usuário está ativo
  if (!user.isActive) {
    const error = new Error('Usuário desativado');
    error.status = 401;
    throw error;
  }

  // Verificar senha
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    const error = new Error('Credenciais inválidas');
    error.status = 401;
    throw error;
  }

  // Remover senha do retorno
  const { password: _, ...userWithoutPassword } = user;

  // Gerar token JWT
  const token = generateToken(userWithoutPassword);

  return { user: userWithoutPassword, token };
}

/**
 * Verifica e decodifica um token JWT
 * @param {string} token - Token JWT
 * @returns {Object} Dados decodificados do token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    const err = new Error('Token inválido ou expirado');
    err.status = 401;
    throw err;
  }
}

/**
 * Gera um token JWT para o usuário
 * @param {Object} user - Dados do usuário
 * @returns {string} Token JWT
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Busca usuário por ID
 * @param {number} userId - ID do usuário
 * @returns {Object} Dados do usuário
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      company: true,
      phone: true,
      avatar: true,
      createdAt: true,
    },
  });

  if (!user) {
    const error = new Error('Usuário não encontrado');
    error.status = 404;
    throw error;
  }

  return user;
}

/**
 * Atualiza dados do perfil do usuário
 * @param {number} userId - ID do usuário
 * @param {Object} data - Dados a atualizar
 * @returns {Object} Usuário atualizado
 */
async function updateProfile(userId, data) {
  const { name, company, phone, avatar } = data;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      company,
      phone,
      avatar,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      company: true,
      phone: true,
      avatar: true,
    },
  });

  return user;
}

/**
 * Altera a senha do usuário
 * @param {number} userId - ID do usuário
 * @param {string} currentPassword - Senha atual
 * @param {string} newPassword - Nova senha
 */
async function changePassword(userId, currentPassword, newPassword) {
  // Buscar usuário com senha
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('Usuário não encontrado');
    error.status = 404;
    throw error;
  }

  // Verificar senha atual
  const isValid = await bcrypt.compare(currentPassword, user.password);

  if (!isValid) {
    const error = new Error('Senha atual incorreta');
    error.status = 400;
    throw error;
  }

  // Hash da nova senha
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Atualizar senha
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

module.exports = {
  register,
  login,
  verifyToken,
  generateToken,
  getUserById,
  updateProfile,
  changePassword,
};
