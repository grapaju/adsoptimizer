// =============================================================================
// CAMPAIGN SERVICE - Serviço de gerenciamento de campanhas
// CRUD completo de campanhas Performance Max
// =============================================================================

const prisma = require('../lib/prisma');

/**
 * Lista todas as campanhas (filtradas por gestor ou cliente)
 * @param {Object} user - Usuário autenticado
 * @param {Object} options - Opções de filtro e paginação
 * @returns {Object} Lista de campanhas com paginação
 */
async function getAll(user, options = {}) {
  const { search, status, clientId, page = 1, limit = 20 } = options;

  // Construir filtro base conforme role do usuário
  let baseWhere = {};

  if (user.role === 'MANAGER') {
    // Gestor vê campanhas dos seus clientes
    const clientIds = await prisma.client.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    baseWhere.clientId = { in: clientIds.map(c => c.id) };
  } else {
    // Cliente vê apenas suas campanhas
    const client = await prisma.client.findFirst({
      where: { email: user.email },
    });
    if (client) {
      baseWhere.clientId = client.id;
    }
  }

  // Adicionar filtros opcionais
  const where = {
    ...baseWhere,
    ...(status && { status }),
    ...(clientId && user.role === 'MANAGER' && { clientId: parseInt(clientId) }),
    ...(search && {
      name: { contains: search, mode: 'insensitive' },
    }),
  };

  // Buscar campanhas
  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        _count: {
          select: { metrics: true, alerts: true, assetGroups: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  // Buscar métricas resumidas dos últimos 7 dias para cada campanha
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const campaignsWithMetrics = await Promise.all(
    campaigns.map(async (campaign) => {
      const metricsAgg = await prisma.campaignMetric.aggregate({
        where: {
          campaignId: campaign.id,
          date: { gte: sevenDaysAgo },
        },
        _sum: {
          impressions: true,
          clicks: true,
          cost: true,
          conversions: true,
          conversionValue: true,
        },
      });

      const cost = Number(metricsAgg._sum.cost) || 0;
      const conversionValue = Number(metricsAgg._sum.conversionValue) || 0;

      return {
        ...campaign,
        metrics7d: {
          impressions: metricsAgg._sum.impressions || 0,
          clicks: metricsAgg._sum.clicks || 0,
          cost,
          conversions: Number(metricsAgg._sum.conversions) || 0,
          conversionValue,
          roas: cost > 0 ? conversionValue / cost : 0,
        },
        alertsCount: campaign._count.alerts,
        assetGroupsCount: campaign._count.assetGroups,
        _count: undefined,
      };
    })
  );

  return {
    data: campaignsWithMetrics,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Busca uma campanha por ID com todos os detalhes
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 * @returns {Object} Campanha com detalhes
 */
async function getById(campaignId, user) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: {
        select: { id: true, name: true, company: true, managerId: true },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      assetGroups: true,
      _count: {
        select: { metrics: true, alerts: true, recommendations: true },
      },
    },
  });

  if (!campaign) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão de acesso
  if (user.role === 'MANAGER' && campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão para acessar esta campanha');
    error.status = 403;
    throw error;
  }

  return campaign;
}

/**
 * Cria uma nova campanha
 * @param {Object} user - Usuário autenticado (gestor)
 * @param {Object} data - Dados da campanha
 * @returns {Object} Campanha criada
 */
async function create(user, data) {
  const {
    googleCampaignId,
    name,
    status = 'ENABLED',
    budgetDaily,
    targetRoas,
    biddingStrategy,
    clientId,
    startDate,
    endDate,
  } = data;

  // Verificar se cliente pertence ao gestor
  const client = await prisma.client.findFirst({
    where: { id: clientId, managerId: user.id },
  });

  if (!client) {
    const error = new Error('Cliente não encontrado');
    error.status = 404;
    throw error;
  }

  // Verificar se já existe campanha com mesmo ID do Google Ads
  if (googleCampaignId) {
    const existing = await prisma.campaign.findUnique({
      where: { googleCampaignId },
    });

    if (existing) {
      const error = new Error('Campanha com este ID do Google Ads já existe');
      error.status = 400;
      throw error;
    }
  }

  // Criar campanha
  const campaign = await prisma.campaign.create({
    data: {
      googleCampaignId: googleCampaignId || `MANUAL-${Date.now()}`,
      name,
      status,
      budgetDaily,
      targetRoas,
      biddingStrategy,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      clientId,
      createdById: user.id,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });

  // Registrar no histórico
  await prisma.changeHistory.create({
    data: {
      action: 'campaign_created',
      description: `Campanha "${name}" criada`,
      newValue: { name, budgetDaily, status },
      campaignId: campaign.id,
      userId: user.id,
    },
  });

  return campaign;
}

/**
 * Atualiza uma campanha
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 * @param {Object} data - Dados a atualizar
 * @returns {Object} Campanha atualizada
 */
async function update(campaignId, user, data) {
  // Buscar campanha existente
  const existing = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: { select: { managerId: true } },
    },
  });

  if (!existing) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  if (existing.client.managerId !== user.id) {
    const error = new Error('Sem permissão para editar esta campanha');
    error.status = 403;
    throw error;
  }

  const { name, status, budgetDaily, targetRoas, biddingStrategy, startDate, endDate } = data;

  // Atualizar campanha
  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      name,
      status,
      budgetDaily,
      targetRoas,
      biddingStrategy,
      startDate: startDate ? new Date(startDate) : existing.startDate,
      endDate: endDate ? new Date(endDate) : existing.endDate,
    },
  });

  // Registrar alterações no histórico
  const changes = [];
  if (name && name !== existing.name) changes.push('nome');
  if (status && status !== existing.status) changes.push('status');
  if (budgetDaily && budgetDaily !== Number(existing.budgetDaily)) changes.push('orçamento');

  if (changes.length > 0) {
    await prisma.changeHistory.create({
      data: {
        action: 'campaign_updated',
        description: `Campanha atualizada: ${changes.join(', ')}`,
        oldValue: {
          name: existing.name,
          status: existing.status,
          budgetDaily: Number(existing.budgetDaily),
        },
        newValue: { name, status, budgetDaily },
        campaignId: campaign.id,
        userId: user.id,
      },
    });
  }

  return campaign;
}

/**
 * Remove uma campanha
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 */
async function remove(campaignId, user) {
  const existing = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: { select: { managerId: true } },
    },
  });

  if (!existing) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  if (existing.client.managerId !== user.id) {
    const error = new Error('Sem permissão para remover esta campanha');
    error.status = 403;
    throw error;
  }

  // Deletar campanha (cascade deleta métricas, alertas, etc)
  await prisma.campaign.delete({
    where: { id: campaignId },
  });
}

/**
 * Busca o histórico de alterações de uma campanha
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 * @returns {Array} Lista de alterações
 */
async function getHistory(campaignId, user) {
  // Verificar acesso à campanha
  await getById(campaignId, user);

  const history = await prisma.changeHistory.findMany({
    where: { campaignId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return history;
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getHistory,
};
