/**
 * Middleware de validação
 * Define regras de validação para diferentes endpoints
 */
const { body, param, query } = require('express-validator');

/**
 * Validação para login
 * Verifica email e senha
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres')
];

/**
 * Validação para registro de usuário
 * Verifica email, senha, nome e role
 */
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nome deve ter no mínimo 2 caracteres'),
  body('role')
    .isIn(['MANAGER', 'CLIENT'])
    .withMessage('Role deve ser MANAGER ou CLIENT')
];

/**
 * Validação para criação/atualização de campanha
 * Verifica nome, orçamento e target ROAS
 */
const campaignValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nome da campanha deve ter no mínimo 2 caracteres'),
  body('budgetDaily')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Orçamento diário deve ser positivo'),
  body('targetRoas')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target ROAS deve ser positivo')
];

/**
 * Validação de UUID em parâmetros de rota
 * @param {string} paramName - Nome do parâmetro
 */
const uuidValidation = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} deve ser um UUID válido`)
];

/**
 * Validação de paginação
 * Verifica page e limit
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser entre 1 e 100')
];

/**
 * Validação de intervalo de datas
 * Verifica formato ISO8601
 */
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data inicial inválida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Data final inválida')
];

/**
 * Validação para criação/atualização de cliente
 * Verifica nome da empresa, Google Ads Customer ID e usuário
 */
const clientValidation = [
  body('companyName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Nome da empresa deve ter no mínimo 2 caracteres'),
  body('googleAdsCustomerId')
    .optional()
    .matches(/^\d{3}-\d{3}-\d{4}$/)
    .withMessage('Google Ads Customer ID deve estar no formato XXX-XXX-XXXX'),
  body('userId')
    .optional()
    .isUUID()
    .withMessage('ID do usuário deve ser um UUID válido')
];

module.exports = {
  loginValidation,
  registerValidation,
  campaignValidation,
  uuidValidation,
  paginationValidation,
  dateRangeValidation,
  clientValidation
};
