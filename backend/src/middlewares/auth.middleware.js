/**
 * Middleware de autenticação e autorização
 * Verifica JWT tokens e controla acesso baseado em roles
 */
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Middleware principal de autenticação
 * Valida o token JWT e carrega os dados do usuário
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Verifica se o header de autorização foi fornecido
    if (!authHeader) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const parts = authHeader.split(' ');
    
    // Verifica formato: Bearer <token>
    if (parts.length !== 2) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }
    
    const [scheme, token] = parts;
    
    // Valida o scheme Bearer
    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ error: 'Token mal formatado' });
    }
    
    try {
      // Decodifica e valida o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Busca usuário no banco usando Prisma
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          company: true,
          managerId: true,
          googleAdsCustomerId: true,
          isActive: true
        }
      });
      
      // Verifica se o usuário existe
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      
      // Verifica se o usuário está ativo
      if (!user.isActive) {
        return res.status(401).json({ error: 'Usuário desativado' });
      }
      
      // Adiciona dados do usuário à requisição
      req.user = user;
      req.userId = user.id;
      
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Middleware para restringir acesso apenas a gestores
 */
const managerOnly = (req, res, next) => {
  if (req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: 'Acesso restrito a gestores' });
  }
  next();
};

/**
 * Middleware para restringir acesso apenas a clientes
 */
const clientOnly = (req, res, next) => {
  if (req.user.role !== 'CLIENT') {
    return res.status(403).json({ error: 'Acesso restrito a clientes' });
  }
  next();
};

/**
 * Middleware para verificar acesso a uma campanha específica
 * Gestores podem acessar campanhas de seus clientes
 * Clientes só podem acessar suas próprias campanhas
 */
const campaignAccess = async (req, res, next) => {
  try {
    const campaignId = req.params.campaignId || req.params.id || req.body.campaignId;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'ID da campanha não fornecido' });
    }
    
    // Busca a campanha com dados do cliente usando Prisma
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
            managerId: true
          }
        }
      }
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    
    // Gestor pode acessar campanhas de seus clientes
    if (req.user.role === 'MANAGER') {
      if (campaign.client.managerId !== req.user.id) {
        return res.status(403).json({ error: 'Sem acesso a esta campanha' });
      }
    }
    
    // Cliente só pode acessar suas próprias campanhas
    if (req.user.role === 'CLIENT') {
      if (campaign.client.userId !== req.user.id) {
        return res.status(403).json({ error: 'Sem acesso a esta campanha' });
      }
    }
    
    // Adiciona campanha à requisição
    req.campaign = campaign;
    next();
  } catch (error) {
    console.error('Erro no middleware de acesso à campanha:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  authMiddleware,
  managerOnly,
  clientOnly,
  campaignAccess
};
