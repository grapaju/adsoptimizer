// =============================================================================
// ALERT SERVICE - Serviço de alertas automáticos
// Monitora campanhas e gera alertas baseados em regras configuráveis
// =============================================================================

const prisma = require('../lib/prisma');

/**
 * Gera alertas para uma campanha baseado nas regras configuradas
 * @param {number} campaignId - ID da campanha
 * @returns {Array} Alertas gerados
 */
async function generateAlerts(campaignId) {
  // Buscar campanha com métricas atuais
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      currentMetrics: true,
      client: {
        include: {
          manager: { select: { id: true } },
        },
      },
    },
  });

  if (!campaign || !campaign.currentMetrics) {
    return [];
  }

  // Buscar configurações de alerta do gestor
  const alertSettings = await prisma.alertSetting.findFirst({
    where: { userId: campaign.client.managerId },
  });

  // Configurações padrão se não houver personalizadas
  const settings = alertSettings || {
    cpaThreshold: null,
    roasThreshold: null,
    impressionsDropPercent: 30,
    conversionsDropPercent: 50,
    budgetUsagePercent: 90,
    ctrMinimum: 0.5,
  };

  const alerts = [];
  const metrics = campaign.currentMetrics;

  // Verificar CPA alto
  const cpaLimit = settings.cpaThreshold || campaign.targetCpa;
  if (cpaLimit && metrics.cpa > cpaLimit * 1.2) {
    alerts.push({
      campaignId,
      type: 'CPA_ALTO',
      severity: metrics.cpa > cpaLimit * 1.5 ? 'CRITICAL' : 'WARNING',
      message: `CPA de R$ ${metrics.cpa.toFixed(2)} está ${((metrics.cpa / cpaLimit - 1) * 100).toFixed(0)}% acima da meta de R$ ${cpaLimit.toFixed(2)}`,
      metadata: {
        currentCpa: metrics.cpa,
        targetCpa: cpaLimit,
        percentAbove: ((metrics.cpa / cpaLimit - 1) * 100).toFixed(1),
      },
    });
  }

  // Verificar ROAS baixo
  const roasTarget = settings.roasThreshold || campaign.targetRoas;
  if (roasTarget && metrics.roas < roasTarget * 0.8) {
    alerts.push({
      campaignId,
      type: 'ROAS_BAIXO',
      severity: metrics.roas < roasTarget * 0.5 ? 'CRITICAL' : 'WARNING',
      message: `ROAS de ${metrics.roas.toFixed(2)}x está ${((1 - metrics.roas / roasTarget) * 100).toFixed(0)}% abaixo da meta de ${roasTarget.toFixed(2)}x`,
      metadata: {
        currentRoas: metrics.roas,
        targetRoas: roasTarget,
        percentBelow: ((1 - metrics.roas / roasTarget) * 100).toFixed(1),
      },
    });
  }

  // Verificar CTR baixo
  if (metrics.ctr < (settings.ctrMinimum || 0.5)) {
    alerts.push({
      campaignId,
      type: 'CTR_BAIXO',
      severity: 'WARNING',
      message: `CTR de ${metrics.ctr.toFixed(2)}% está abaixo do mínimo recomendado de ${settings.ctrMinimum || 0.5}%`,
      metadata: {
        currentCtr: metrics.ctr,
        minimumCtr: settings.ctrMinimum || 0.5,
      },
    });
  }

  // Verificar uso de orçamento
  if (campaign.dailyBudget) {
    const budgetUsage = (metrics.cost / campaign.dailyBudget) * 100;
    if (budgetUsage >= (settings.budgetUsagePercent || 90)) {
      alerts.push({
        campaignId,
        type: 'ORCAMENTO_ALTO',
        severity: budgetUsage >= 100 ? 'CRITICAL' : 'WARNING',
        message: `Orçamento diário ${budgetUsage.toFixed(0)}% utilizado (R$ ${metrics.cost.toFixed(2)} de R$ ${campaign.dailyBudget.toFixed(2)})`,
        metadata: {
          cost: metrics.cost,
          dailyBudget: campaign.dailyBudget,
          usagePercent: budgetUsage.toFixed(1),
        },
      });
    }
  }

  // Verificar queda de impressões (comparar com média)
  const avgImpressions = await getAverageMetric(campaignId, 'impressions', 7);
  if (avgImpressions && metrics.impressions < avgImpressions * (1 - (settings.impressionsDropPercent || 30) / 100)) {
    const dropPercent = ((1 - metrics.impressions / avgImpressions) * 100).toFixed(0);
    alerts.push({
      campaignId,
      type: 'QUEDA_IMPRESSOES',
      severity: 'WARNING',
      message: `Impressões caíram ${dropPercent}% em relação à média dos últimos 7 dias`,
      metadata: {
        currentImpressions: metrics.impressions,
        averageImpressions: avgImpressions,
        dropPercent,
      },
    });
  }

  // Verificar queda de conversões
  const avgConversions = await getAverageMetric(campaignId, 'conversions', 7);
  if (avgConversions && avgConversions > 0 && metrics.conversions < avgConversions * (1 - (settings.conversionsDropPercent || 50) / 100)) {
    const dropPercent = ((1 - metrics.conversions / avgConversions) * 100).toFixed(0);
    alerts.push({
      campaignId,
      type: 'QUEDA_CONVERSOES',
      severity: 'CRITICAL',
      message: `Conversões caíram ${dropPercent}% em relação à média dos últimos 7 dias`,
      metadata: {
        currentConversions: metrics.conversions,
        averageConversions: avgConversions,
        dropPercent,
      },
    });
  }

  // Salvar alertas no banco
  if (alerts.length > 0) {
    await prisma.alert.createMany({
      data: alerts.map(alert => ({
        ...alert,
        metadata: JSON.stringify(alert.metadata),
      })),
    });
  }

  return alerts;
}

/**
 * Calcula a média de uma métrica nos últimos N dias
 * @param {number} campaignId - ID da campanha
 * @param {string} metric - Nome da métrica
 * @param {number} days - Número de dias
 * @returns {number|null} Média ou null
 */
async function getAverageMetric(campaignId, metric, days) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await prisma.campaignMetricsHistory.findMany({
    where: {
      campaignId,
      date: { gte: startDate },
    },
    select: { [metric]: true },
  });

  if (history.length === 0) return null;

  const sum = history.reduce((acc, h) => acc + (h[metric] || 0), 0);
  return sum / history.length;
}

/**
 * Lista alertas com filtros
 * @param {Object} user - Usuário autenticado
 * @param {Object} filters - Filtros (status, type, severity, campaignId)
 * @returns {Array} Alertas encontrados
 */
async function listAlerts(user, filters = {}) {
  const { status, type, severity, campaignId, page = 1, limit = 20 } = filters;

  // Montar condições de filtro
  const where = {};

  if (status === 'unread') {
    where.isRead = false;
  } else if (status === 'read') {
    where.isRead = true;
  }

  if (type) where.type = type;
  if (severity) where.severity = severity;

  // Filtrar por campanhas do usuário
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
    const campaignIds = campaigns.map(c => c.id);

    where.campaignId = campaignId ? { equals: campaignId } : { in: campaignIds };
  } else {
    // Cliente vê apenas alertas de suas campanhas
    const client = await prisma.client.findFirst({
      where: { email: user.email },
    });

    if (client) {
      const campaigns = await prisma.campaign.findMany({
        where: { clientId: client.id },
        select: { id: true },
      });
      where.campaignId = { in: campaigns.map(c => c.id) };
    }
  }

  // Buscar alertas
  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true, googleCampaignId: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.alert.count({ where }),
  ]);

  // Contar por severidade
  const countBySeverity = await prisma.alert.groupBy({
    by: ['severity'],
    where: { ...where, isRead: false },
    _count: { id: true },
  });

  return {
    alerts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    summary: {
      critical: countBySeverity.find(c => c.severity === 'CRITICAL')?._count?.id || 0,
      warning: countBySeverity.find(c => c.severity === 'WARNING')?._count?.id || 0,
      info: countBySeverity.find(c => c.severity === 'INFO')?._count?.id || 0,
    },
  };
}

/**
 * Marca alerta como lido
 * @param {number} alertId - ID do alerta
 * @param {Object} user - Usuário autenticado
 * @returns {Object} Alerta atualizado
 */
async function markAsRead(alertId, user) {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { campaign: { include: { client: true } } },
  });

  if (!alert) {
    const error = new Error('Alerta não encontrado');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  if (user.role === 'MANAGER' && alert.campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão para este alerta');
    error.status = 403;
    throw error;
  }

  return await prisma.alert.update({
    where: { id: alertId },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Marca todos os alertas como lidos
 * @param {Object} user - Usuário autenticado
 */
async function markAllAsRead(user) {
  let campaignIds = [];

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

  await prisma.alert.updateMany({
    where: { campaignId: { in: campaignIds }, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Busca configurações de alertas do usuário
 * @param {number} userId - ID do usuário
 * @returns {Object} Configurações
 */
async function getSettings(userId) {
  let settings = await prisma.alertSetting.findFirst({
    where: { userId },
  });

  if (!settings) {
    settings = {
      emailEnabled: true,
      pushEnabled: true,
      cpaThreshold: null,
      roasThreshold: null,
      impressionsDropPercent: 30,
      conversionsDropPercent: 50,
      budgetUsagePercent: 90,
      ctrMinimum: 0.5,
    };
  }

  return settings;
}

/**
 * Atualiza configurações de alertas
 * @param {number} userId - ID do usuário
 * @param {Object} data - Novas configurações
 * @returns {Object} Configurações atualizadas
 */
async function updateSettings(userId, data) {
  const existingSettings = await prisma.alertSetting.findFirst({
    where: { userId },
  });

  if (existingSettings) {
    return await prisma.alertSetting.update({
      where: { id: existingSettings.id },
      data,
    });
  } else {
    return await prisma.alertSetting.create({
      data: { userId, ...data },
    });
  }
}

/**
 * Gera alertas para todas as campanhas ativas
 * @returns {Object} Resumo dos alertas gerados
 */
async function generateAllAlerts() {
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'ENABLED' },
    select: { id: true },
  });

  let totalAlerts = 0;
  const errors = [];

  for (const campaign of campaigns) {
    try {
      const alerts = await generateAlerts(campaign.id);
      totalAlerts += alerts.length;
    } catch (error) {
      errors.push({ campaignId: campaign.id, error: error.message });
    }
  }

  return {
    campaignsProcessed: campaigns.length,
    alertsGenerated: totalAlerts,
    errors,
  };
}

module.exports = {
  generateAlerts,
  listAlerts,
  markAsRead,
  markAllAsRead,
  getSettings,
  updateSettings,
  generateAllAlerts,
};
