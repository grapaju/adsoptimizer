/**
 * Middleware de tratamento de erros
 * Centraliza o tratamento de erros da aplicação
 */
const { Prisma } = require('@prisma/client');

/**
 * Handler principal de erros
 * Trata erros de validação, JWT, Prisma e erros genéricos
 */
const errorHandler = (err, req, res, next) => {
  console.error('Erro:', err);
  
  // Erro de validação do express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.array()
    });
  }
  
  // Erro de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expirado' });
  }
  
  // Erros do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({ 
          error: 'Registro já existe',
          field: err.meta?.target?.[0] || 'campo único'
        });
      case 'P2003': // Foreign key constraint violation
        return res.status(400).json({ error: 'Referência inválida' });
      case 'P2025': // Record not found
        return res.status(404).json({ error: 'Registro não encontrado' });
      case 'P2014': // Required relation violation
        return res.status(400).json({ error: 'Relação obrigatória violada' });
      default:
        console.error('Erro Prisma:', err.code, err.message);
    }
  }
  
  // Erro de validação do Prisma
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Dados inválidos fornecidos' });
  }
  
  // Erro de inicialização do Prisma
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('Erro de conexão com banco de dados');
    return res.status(503).json({ error: 'Serviço temporariamente indisponível' });
  }
  
  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Classe para criar erros customizados
 * Permite definir status code e mensagem personalizados
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  AppError
};
