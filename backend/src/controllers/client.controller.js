// =============================================================================
// CLIENT CONTROLLER - Controlador de clientes (CRUD)
// Endpoints: GET /clients, GET /clients/:id, POST /clients, PUT /clients/:id
// =============================================================================

import clientService from '../services/client.service.js';

/**
 * GET /clients
 * Lista todos os clientes do gestor
 */
async function list(req, res, next) {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    };

    const result = await clientService.getAll(req.user.id, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /clients/:id
 * Busca cliente por ID
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const client = await clientService.getById(parseInt(id), req.user.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /clients
 * Cria novo cliente
 */
async function create(req, res, next) {
  try {
    const {
      name,
      email,
      company,
      phone,
      googleAdsCustomerId,
      googleRefreshToken,
    } = req.body;

    // Validação básica
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios',
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

    const client = await clientService.create({
      managerId: req.user.id,
      name,
      email,
      company,
      phone,
      googleAdsCustomerId,
      googleRefreshToken,
    });

    res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso',
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /clients/:id
 * Atualiza cliente
 */
async function update(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      company,
      phone,
      googleAdsCustomerId,
      googleRefreshToken,
      isActive,
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (googleAdsCustomerId !== undefined) updateData.googleAdsCustomerId = googleAdsCustomerId;
    if (googleRefreshToken !== undefined) updateData.googleRefreshToken = googleRefreshToken;
    if (isActive !== undefined) updateData.isActive = isActive;

    const client = await clientService.update(parseInt(id), updateData, req.user.id);

    res.json({
      success: true,
      message: 'Cliente atualizado com sucesso',
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /clients/:id
 * Remove cliente (soft delete - desativa)
 */
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await clientService.delete(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Cliente removido com sucesso',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /clients/stats
 * Estatísticas dos clientes do gestor
 */
async function getStats(req, res, next) {
  try {
    const stats = await clientService.getStats(req.user.id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /clients/:id/campaigns
 * Lista campanhas de um cliente
 */
async function getCampaigns(req, res, next) {
  try {
    const { id } = req.params;
    const campaignService = await import('../services/campaign.service.js');
    
    const campaigns = await campaignService.getByClient(parseInt(id));

    res.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    next(error);
  }
}

export {
  list,
  getById,
  create,
  update,
  remove,
  getStats,
  getCampaigns,
};

export default {
  list,
  getById,
  create,
  update,
  remove,
  getStats,
  getCampaigns,
};
