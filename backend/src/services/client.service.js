// =============================================================================
// CLIENT SERVICE - Serviço de gerenciamento de clientes
// CRUD completo de clientes vinculados ao gestor
// =============================================================================

import prisma from '../lib/prisma.js';

/**
 * Lista todos os clientes do gestor
 * @param {number} managerId - ID do gestor
 * @param {Object} options - Opções de filtro e paginação
 * @returns {Array} Lista de clientes
 */
async function getAll(managerId, options = {}) {
  const { search, isActive, page = 1, limit = 20 } = options;

  // Construir filtros
  const where = {
    managerId,
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  // Buscar clientes com contagem de campanhas
  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        _count: {
          select: { campaigns: true },
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
          },
          take: 5, // Últimas 5 campanhas
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ]);

  // Formatar resposta
  const formattedClients = clients.map(client => ({
    ...client,
    campaignsCount: client._count.campaigns,
    _count: undefined,
  }));

  return {
    data: formattedClients,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Busca um cliente por ID
 * @param {number} clientId - ID do cliente
 * @param {number} managerId - ID do gestor (para validação)
 * @returns {Object} Dados do cliente
 */
async function getById(clientId, managerId) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      managerId, // Garantir que pertence ao gestor
    },
    include: {
      campaigns: {
        include: {
          _count: {
            select: { metrics: true, alerts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!client) {
    const error = new Error('Cliente não encontrado');
    error.status = 404;
    throw error;
  }

  return client;
}

/**
 * Cria um novo cliente
 * @param {number} managerId - ID do gestor
 * @param {Object} data - Dados do cliente
 * @returns {Object} Cliente criado
 */
async function create(managerId, data) {
  const { name, email, phone, company, googleAdsId, googleAdsRefresh } = data;

  // Verificar se email já existe
  const existingClient = await prisma.client.findUnique({
    where: { email },
  });

  if (existingClient) {
    const error = new Error('Email já cadastrado para outro cliente');
    error.status = 400;
    throw error;
  }

  // Criar cliente
  const client = await prisma.client.create({
    data: {
      name,
      email,
      phone,
      company,
      googleAdsId,
      googleAdsRefresh,
      managerId,
    },
  });

  return client;
}

/**
 * Atualiza dados de um cliente
 * @param {number} clientId - ID do cliente
 * @param {number} managerId - ID do gestor
 * @param {Object} data - Dados a atualizar
 * @returns {Object} Cliente atualizado
 */
async function update(clientId, managerId, data) {
  // Verificar se cliente existe e pertence ao gestor
  const existingClient = await prisma.client.findFirst({
    where: { id: clientId, managerId },
  });

  if (!existingClient) {
    const error = new Error('Cliente não encontrado');
    error.status = 404;
    throw error;
  }

  const { name, email, phone, company, googleAdsId, googleAdsRefresh, isActive } = data;

  // Se estiver alterando email, verificar duplicidade
  if (email && email !== existingClient.email) {
    const emailExists = await prisma.client.findUnique({
      where: { email },
    });

    if (emailExists) {
      const error = new Error('Email já cadastrado para outro cliente');
      error.status = 400;
      throw error;
    }
  }

  // Atualizar cliente
  const client = await prisma.client.update({
    where: { id: clientId },
    data: {
      name,
      email,
      phone,
      company,
      googleAdsId,
      googleAdsRefresh,
      isActive,
    },
  });

  return client;
}

/**
 * Remove um cliente (soft delete - desativa)
 * @param {number} clientId - ID do cliente
 * @param {number} managerId - ID do gestor
 */
async function remove(clientId, managerId) {
  // Verificar se cliente existe e pertence ao gestor
  const existingClient = await prisma.client.findFirst({
    where: { id: clientId, managerId },
  });

  if (!existingClient) {
    const error = new Error('Cliente não encontrado');
    error.status = 404;
    throw error;
  }

  // Soft delete - apenas desativar
  await prisma.client.update({
    where: { id: clientId },
    data: { isActive: false },
  });
}

/**
 * Busca estatísticas do cliente
 * @param {number} clientId - ID do cliente
 * @param {number} managerId - ID do gestor
 * @returns {Object} Estatísticas
 */
async function getStats(clientId, managerId) {
  // Verificar se cliente pertence ao gestor
  const client = await prisma.client.findFirst({
    where: { id: clientId, managerId },
  });

  if (!client) {
    const error = new Error('Cliente não encontrado');
    error.status = 404;
    throw error;
  }

  // Buscar campanhas do cliente
  const campaigns = await prisma.campaign.findMany({
    where: { clientId },
    select: { id: true },
  });

  const campaignIds = campaigns.map(c => c.id);

  // Buscar métricas agregadas dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const metricsAgg = await prisma.campaignMetric.aggregate({
    where: {
      campaignId: { in: campaignIds },
      date: { gte: thirtyDaysAgo },
    },
    _sum: {
      impressions: true,
      clicks: true,
      cost: true,
      conversions: true,
      conversionValue: true,
    },
  });

  // Contar alertas não lidos
  const unreadAlerts = await prisma.alert.count({
    where: {
      campaignId: { in: campaignIds },
      isRead: false,
    },
  });

  return {
    client: {
      id: client.id,
      name: client.name,
      company: client.company,
    },
    campaigns: {
      total: campaigns.length,
    },
    metrics30d: {
      impressions: metricsAgg._sum.impressions || 0,
      clicks: metricsAgg._sum.clicks || 0,
      cost: Number(metricsAgg._sum.cost) || 0,
      conversions: Number(metricsAgg._sum.conversions) || 0,
      conversionValue: Number(metricsAgg._sum.conversionValue) || 0,
      roas: metricsAgg._sum.cost > 0
        ? Number(metricsAgg._sum.conversionValue) / Number(metricsAgg._sum.cost)
        : 0,
    },
    alerts: {
      unread: unreadAlerts,
    },
  };
}

export default {
  getAll,
  getById,
  create,
  update,
  remove,
  getStats,
};
