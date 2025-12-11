// =============================================================================
// HISTORY SERVICE - Serviço de histórico de alterações
// Registra e consulta todas as alterações feitas em campanhas
// =============================================================================

const prisma = require('../lib/prisma');

/**
 * Registra uma alteração no histórico
 * @param {Object} data - Dados da alteração
 * @returns {Object} Registro criado
 */
async function logChange(data) {
  const { campaignId, userId, changeType, field, oldValue, newValue, description } = data;

  return await prisma.changeHistory.create({
    data: {
      campaignId,
      userId,
      changeType,
      field,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      description,
    },
    include: {
      campaign: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });
}

/**
 * Lista histórico de alterações com filtros
 * @param {Object} user - Usuário autenticado
 * @param {Object} filters - Filtros de busca
 * @returns {Object} Histórico e paginação
 */
async function listHistory(user, filters = {}) {
  const {
    campaignId,
    changeType,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = filters;

  // Montar condições de filtro
  const where = {};

  if (campaignId) {
    where.campaignId = parseInt(campaignId);
  }

  if (changeType) {
    where.changeType = changeType;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  // Filtrar por campanhas acessíveis ao usuário
  if (user.role === 'MANAGER') {
    const clients = await prisma.client.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    const clientIds = clients.map(c => c.id);

    const campaigns = await prisma.campaign.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true },
    });

    if (!campaignId) {
      where.campaignId = { in: campaigns.map(c => c.id) };
    } else {
      // Verificar se o usuário tem acesso à campanha
      const hasAccess = campaigns.some(c => c.id === parseInt(campaignId));
      if (!hasAccess) {
        return { history: [], pagination: { page, limit, total: 0, pages: 0 } };
      }
    }
  } else {
    // Cliente vê apenas suas campanhas
    const client = await prisma.client.findFirst({
      where: { email: user.email },
    });

    if (client) {
      const campaigns = await prisma.campaign.findMany({
        where: { clientId: client.id },
        select: { id: true },
      });

      if (!campaignId) {
        where.campaignId = { in: campaigns.map(c => c.id) };
      }
    }
  }

  // Buscar histórico
  const [history, total] = await Promise.all([
    prisma.changeHistory.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true, googleCampaignId: true } },
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.changeHistory.count({ where }),
  ]);

  // Formatar valores JSON
  const formattedHistory = history.map(item => ({
    ...item,
    oldValue: item.oldValue ? JSON.parse(item.oldValue) : null,
    newValue: item.newValue ? JSON.parse(item.newValue) : null,
  }));

  return {
    history: formattedHistory,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Busca histórico de uma campanha específica
 * @param {number} campaignId - ID da campanha
 * @param {Object} options - Opções de busca
 * @returns {Array} Histórico da campanha
 */
async function getCampaignHistory(campaignId, options = {}) {
  const { limit = 100 } = options;

  const history = await prisma.changeHistory.findMany({
    where: { campaignId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return history.map(item => ({
    ...item,
    oldValue: item.oldValue ? JSON.parse(item.oldValue) : null,
    newValue: item.newValue ? JSON.parse(item.newValue) : null,
  }));
}

/**
 * Obtém estatísticas de alterações
 * @param {Object} user - Usuário autenticado
 * @param {number} days - Número de dias para análise
 * @returns {Object} Estatísticas
 */
async function getStats(user, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Buscar campanhas acessíveis
  let campaignIds = [];

  if (user.role === 'MANAGER') {
    const clients = await prisma.client.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    const campaigns = await prisma.campaign.findMany({
      where: { clientId: { in: clients.map(c => c.id) } },
      select: { id: true },
    });
    campaignIds = campaigns.map(c => c.id);
  } else {
    const client = await prisma.client.findFirst({
      where: { email: user.email },
    });
    if (client) {
      const campaigns = await prisma.campaign.findMany({
        where: { clientId: client.id },
        select: { id: true },
      });
      campaignIds = campaigns.map(c => c.id);
    }
  }

  const where = {
    campaignId: { in: campaignIds },
    createdAt: { gte: startDate },
  };

  // Contar por tipo de alteração
  const byType = await prisma.changeHistory.groupBy({
    by: ['changeType'],
    where,
    _count: { id: true },
  });

  // Total de alterações
  const total = await prisma.changeHistory.count({ where });

  // Alterações por dia
  const byDay = await prisma.$queryRaw`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM change_history
    WHERE campaign_id = ANY(${campaignIds}::int[])
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;

  // Campanhas mais alteradas
  const topCampaigns = await prisma.changeHistory.groupBy({
    by: ['campaignId'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  // Buscar nomes das campanhas
  const campaignDetails = await prisma.campaign.findMany({
    where: { id: { in: topCampaigns.map(c => c.campaignId) } },
    select: { id: true, name: true },
  });

  return {
    total,
    byType: byType.map(t => ({
      type: t.changeType,
      count: t._count.id,
    })),
    byDay,
    topCampaigns: topCampaigns.map(c => ({
      campaign: campaignDetails.find(cd => cd.id === c.campaignId),
      changes: c._count.id,
    })),
  };
}

/**
 * Tipos de alteração disponíveis
 */
const CHANGE_TYPES = {
  BUDGET_CHANGE: 'Alteração de orçamento',
  TARGET_ROAS_CHANGE: 'Alteração de ROAS alvo',
  TARGET_CPA_CHANGE: 'Alteração de CPA alvo',
  STATUS_CHANGE: 'Alteração de status',
  ASSET_ADDED: 'Asset adicionado',
  ASSET_REMOVED: 'Asset removido',
  ASSET_MODIFIED: 'Asset modificado',
  ASSET_GROUP_CREATED: 'Asset Group criado',
  ASSET_GROUP_MODIFIED: 'Asset Group modificado',
  BIDDING_STRATEGY_CHANGE: 'Alteração de estratégia de lance',
  AUDIENCE_CHANGE: 'Alteração de público-alvo',
  OTHER: 'Outra alteração',
};

module.exports = {
  logChange,
  listHistory,
  getCampaignHistory,
  getStats,
  CHANGE_TYPES,
};
