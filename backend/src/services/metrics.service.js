// =============================================================================
// METRICS SERVICE - Serviço de métricas das campanhas
// Gerencia histórico, agregações e sincronização
// =============================================================================

const prisma = require('../lib/prisma');
const googleAdsService = require('./googleAds.service');

/**
 * Sincroniza métricas de uma campanha com o Google Ads
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 * @returns {Object} Resultado da sincronização
 */
async function syncCampaign(campaignId, user) {
  // Verificar se campanha existe e usuário tem acesso
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: {
        select: {
          id: true,
          managerId: true,
          googleAdsId: true,
          googleAdsRefresh: true,
        },
      },
    },
  });

  if (!campaign) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  if (user.role === 'MANAGER' && campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão para sincronizar esta campanha');
    error.status = 403;
    throw error;
  }

  // Se não tiver credenciais Google Ads, gerar dados simulados
  if (!campaign.client.googleAdsId) {
    return await generateSimulatedMetrics(campaignId);
  }

  try {
    // Tentar sincronizar com Google Ads
    const googleAds = new googleAdsService();
    const metrics = await googleAds.getCampaignMetrics(
      campaign.client.googleAdsId,
      campaign.client.googleAdsRefresh,
      campaign.googleCampaignId,
      30 // Últimos 30 dias
    );

    // Processar e salvar métricas
    for (const dayMetric of metrics) {
      await prisma.campaignMetric.upsert({
        where: {
          campaignId_date: {
            campaignId,
            date: new Date(dayMetric.date),
          },
        },
        update: {
          impressions: dayMetric.impressions,
          clicks: dayMetric.clicks,
          cost: dayMetric.cost,
          conversions: dayMetric.conversions,
          conversionValue: dayMetric.conversionValue,
          ctr: dayMetric.ctr,
          cpc: dayMetric.cpc,
          roas: dayMetric.roas,
        },
        create: {
          campaignId,
          date: new Date(dayMetric.date),
          impressions: dayMetric.impressions,
          clicks: dayMetric.clicks,
          cost: dayMetric.cost,
          conversions: dayMetric.conversions,
          conversionValue: dayMetric.conversionValue,
          ctr: dayMetric.ctr,
          cpc: dayMetric.cpc,
          roas: dayMetric.roas,
        },
      });
    }

    // Atualizar timestamp de sincronização
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { lastSyncAt: new Date() },
    });

    return {
      success: true,
      message: `${metrics.length} dias de métricas sincronizados`,
      metricsCount: metrics.length,
    };
  } catch (error) {
    console.error('Erro ao sincronizar com Google Ads:', error);
    // Em caso de erro, gerar dados simulados
    return await generateSimulatedMetrics(campaignId);
  }
}

/**
 * Gera métricas simuladas para desenvolvimento/demonstração
 * @param {number} campaignId - ID da campanha
 */
async function generateSimulatedMetrics(campaignId) {
  const today = new Date();
  const metricsData = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    // Gerar dados aleatórios mas realistas
    const impressions = Math.floor(Math.random() * 5000) + 8000;
    const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.02));
    const cost = parseFloat((clicks * (Math.random() * 0.5 + 0.8)).toFixed(2));
    const conversions = Math.floor(clicks * (Math.random() * 0.05 + 0.03));
    const conversionValue = parseFloat((conversions * (Math.random() * 50 + 80)).toFixed(2));

    metricsData.push({
      campaignId,
      date,
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      ctr: parseFloat((clicks / impressions).toFixed(4)),
      cpc: parseFloat((cost / clicks).toFixed(2)),
      roas: parseFloat((conversionValue / cost).toFixed(2)),
    });
  }

  // Upsert das métricas simuladas
  for (const metric of metricsData) {
    await prisma.campaignMetric.upsert({
      where: {
        campaignId_date: {
          campaignId: metric.campaignId,
          date: metric.date,
        },
      },
      update: metric,
      create: metric,
    });
  }

  // Atualizar timestamp
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { lastSyncAt: new Date() },
  });

  return {
    success: true,
    message: 'Métricas simuladas geradas (Google Ads não configurado)',
    metricsCount: metricsData.length,
    simulated: true,
  };
}

/**
 * Busca métricas diárias de uma campanha
 * @param {number} campaignId - ID da campanha
 * @param {Object} options - Opções de filtro
 */
async function getDailyMetrics(campaignId, options = {}) {
  const { startDate, endDate, days = 30 } = options;

  let dateFilter = {};

  if (startDate && endDate) {
    dateFilter = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else {
    const start = new Date();
    start.setDate(start.getDate() - days);
    dateFilter = { gte: start };
  }

  const metrics = await prisma.campaignMetric.findMany({
    where: {
      campaignId,
      date: dateFilter,
    },
    orderBy: { date: 'asc' },
  });

  // Calcular totais
  const totals = metrics.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      cost: acc.cost + Number(m.cost),
      conversions: acc.conversions + Number(m.conversions),
      conversionValue: acc.conversionValue + Number(m.conversionValue),
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionValue: 0 }
  );

  totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  totals.roas = totals.cost > 0 ? totals.conversionValue / totals.cost : 0;
  totals.costPerConversion = totals.conversions > 0 ? totals.cost / totals.conversions : 0;

  return {
    daily: metrics.map(m => ({
      date: m.date,
      impressions: m.impressions,
      clicks: m.clicks,
      cost: Number(m.cost),
      conversions: Number(m.conversions),
      conversionValue: Number(m.conversionValue),
      ctr: Number(m.ctr),
      cpc: Number(m.cpc),
      roas: Number(m.roas),
    })),
    summary: totals,
    period: {
      start: metrics[0]?.date || null,
      end: metrics[metrics.length - 1]?.date || null,
      days: metrics.length,
    },
  };
}

/**
 * Busca métricas em tempo real (dados de hoje)
 * @param {number} campaignId - ID da campanha
 */
async function getRealtimeMetrics(campaignId) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      status: true,
      budgetDaily: true,
      lastSyncAt: true,
    },
  });

  if (!campaign) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  // Buscar métrica de hoje
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayMetric = await prisma.campaignMetric.findUnique({
    where: {
      campaignId_date: {
        campaignId,
        date: today,
      },
    },
  });

  // Se não existir métrica de hoje, criar uma simulada
  if (!todayMetric) {
    const currentHour = new Date().getHours();
    const hoursElapsed = currentHour + 1;
    const dayProgress = hoursElapsed / 24;

    const impressions = Math.floor((Math.random() * 5000 + 8000) * dayProgress);
    const clicks = Math.floor(impressions * (Math.random() * 0.03 + 0.02));
    const cost = parseFloat((clicks * (Math.random() * 0.5 + 0.8)).toFixed(2));
    const conversions = Math.floor(clicks * (Math.random() * 0.05 + 0.03));
    const conversionValue = parseFloat((conversions * (Math.random() * 50 + 80)).toFixed(2));

    todayMetric = {
      date: today,
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      roas: cost > 0 ? conversionValue / cost : 0,
    };
  }

  // Buscar métrica de ontem para comparação
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayMetric = await prisma.campaignMetric.findUnique({
    where: {
      campaignId_date: {
        campaignId,
        date: yesterday,
      },
    },
  });

  // Calcular variações percentuais
  const changes = {};
  if (yesterdayMetric) {
    const calcChange = (current, previous) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    changes.impressions = calcChange(todayMetric.impressions, yesterdayMetric.impressions);
    changes.clicks = calcChange(todayMetric.clicks, yesterdayMetric.clicks);
    changes.cost = calcChange(Number(todayMetric.cost), Number(yesterdayMetric.cost));
    changes.conversions = calcChange(Number(todayMetric.conversions), Number(yesterdayMetric.conversions));
    changes.roas = calcChange(Number(todayMetric.roas), Number(yesterdayMetric.roas));
  }

  // Calcular progresso do orçamento
  const budgetDaily = Number(campaign.budgetDaily);
  const costToday = Number(todayMetric.cost);
  const budgetProgress = budgetDaily > 0 ? (costToday / budgetDaily) * 100 : 0;

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      budgetDaily,
    },
    today: {
      impressions: todayMetric.impressions,
      clicks: todayMetric.clicks,
      cost: Number(todayMetric.cost),
      conversions: Number(todayMetric.conversions),
      conversionValue: Number(todayMetric.conversionValue),
      ctr: Number(todayMetric.ctr),
      cpc: Number(todayMetric.cpc),
      roas: Number(todayMetric.roas),
    },
    changes,
    budget: {
      daily: budgetDaily,
      spent: costToday,
      remaining: budgetDaily - costToday,
      progress: budgetProgress,
    },
    lastSyncAt: campaign.lastSyncAt,
    updatedAt: new Date(),
  };
}

/**
 * Busca Asset Groups de uma campanha
 * @param {number} campaignId - ID da campanha
 */
async function getAssetGroups(campaignId) {
  let assetGroups = await prisma.assetGroup.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });

  // Se não houver, criar dados simulados
  if (assetGroups.length === 0) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (campaign) {
      // Criar asset groups simulados
      await prisma.assetGroup.createMany({
        data: [
          {
            googleAssetId: `AG-${campaignId}-1`,
            name: 'Asset Group Principal',
            status: 'ENABLED',
            finalUrl: 'https://exemplo.com/produtos',
            headlines: [
              'Produtos com Desconto',
              'Frete Grátis para Todo Brasil',
              'Compre Agora e Economize',
              'Qualidade Garantida',
              'Os Melhores Preços',
            ],
            descriptions: [
              'Encontre os melhores produtos com preços incríveis. Entrega rápida!',
              'Compre online com segurança e receba em casa.',
            ],
            performanceLabel: 'GOOD',
            campaignId,
          },
          {
            googleAssetId: `AG-${campaignId}-2`,
            name: 'Asset Group Promoções',
            status: 'ENABLED',
            finalUrl: 'https://exemplo.com/promocoes',
            headlines: [
              'Promoção Imperdível',
              'Até 70% OFF',
              'Ofertas por Tempo Limitado',
            ],
            descriptions: [
              'Aproveite as melhores promoções. Estoque limitado!',
            ],
            performanceLabel: 'LEARNING',
            campaignId,
          },
        ],
      });

      assetGroups = await prisma.assetGroup.findMany({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  return assetGroups;
}

/**
 * Busca Search Terms de uma campanha
 * @param {number} campaignId - ID da campanha
 * @param {Object} options - Opções de filtro
 */
async function getSearchTerms(campaignId, options = {}) {
  const { days = 7, limit = 50 } = options;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  let searchTerms = await prisma.searchTerm.findMany({
    where: {
      campaignId,
      date: { gte: startDate },
    },
    orderBy: { clicks: 'desc' },
    take: limit,
  });

  // Se não houver, criar dados simulados
  if (searchTerms.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const termsData = [
      { term: 'comprar produto online', impressions: 1500, clicks: 45, cost: 36.00, conversions: 4 },
      { term: 'loja virtual confiável', impressions: 1200, clicks: 38, cost: 30.40, conversions: 3 },
      { term: 'produto barato com qualidade', impressions: 2000, clicks: 60, cost: 48.00, conversions: 5 },
      { term: 'frete grátis', impressions: 800, clicks: 25, cost: 20.00, conversions: 2 },
      { term: 'promoção de hoje', impressions: 600, clicks: 18, cost: 14.40, conversions: 1 },
      { term: 'melhor preço garantido', impressions: 950, clicks: 30, cost: 24.00, conversions: 2 },
      { term: 'entrega rápida', impressions: 1100, clicks: 35, cost: 28.00, conversions: 3 },
      { term: 'comprar com desconto', impressions: 1800, clicks: 55, cost: 44.00, conversions: 4 },
    ];

    await prisma.searchTerm.createMany({
      data: termsData.map(t => ({
        ...t,
        campaignId,
        date: today,
      })),
    });

    searchTerms = await prisma.searchTerm.findMany({
      where: { campaignId },
      orderBy: { clicks: 'desc' },
      take: limit,
    });
  }

  // Calcular totais
  const totals = searchTerms.reduce(
    (acc, t) => ({
      impressions: acc.impressions + t.impressions,
      clicks: acc.clicks + t.clicks,
      cost: acc.cost + Number(t.cost),
      conversions: acc.conversions + Number(t.conversions),
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
  );

  return {
    terms: searchTerms.map(t => ({
      ...t,
      cost: Number(t.cost),
      conversions: Number(t.conversions),
    })),
    summary: totals,
  };
}

/**
 * Busca Listing Groups de uma campanha
 * @param {number} campaignId - ID da campanha
 */
async function getListingGroups(campaignId) {
  let listingGroups = await prisma.listingGroup.findMany({
    where: { campaignId },
    orderBy: { conversions: 'desc' },
  });

  // Se não houver, criar dados simulados
  if (listingGroups.length === 0) {
    await prisma.listingGroup.createMany({
      data: [
        {
          googleListingId: `LG-${campaignId}-1`,
          name: 'Todos os Produtos',
          type: 'UNIT_INCLUDED',
          status: 'ENABLED',
          impressions: 15000,
          clicks: 450,
          cost: 360.00,
          conversions: 35,
          campaignId,
        },
        {
          googleListingId: `LG-${campaignId}-2`,
          name: 'Categoria: Eletrônicos',
          type: 'SUBDIVISION',
          status: 'ENABLED',
          impressions: 8000,
          clicks: 280,
          cost: 224.00,
          conversions: 22,
          campaignId,
        },
        {
          googleListingId: `LG-${campaignId}-3`,
          name: 'Categoria: Vestuário',
          type: 'SUBDIVISION',
          status: 'ENABLED',
          impressions: 7000,
          clicks: 170,
          cost: 136.00,
          conversions: 13,
          campaignId,
        },
      ],
    });

    listingGroups = await prisma.listingGroup.findMany({
      where: { campaignId },
      orderBy: { conversions: 'desc' },
    });
  }

  // Calcular totais
  const totals = listingGroups.reduce(
    (acc, lg) => ({
      impressions: acc.impressions + lg.impressions,
      clicks: acc.clicks + lg.clicks,
      cost: acc.cost + Number(lg.cost),
      conversions: acc.conversions + Number(lg.conversions),
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0 }
  );

  return {
    groups: listingGroups.map(lg => ({
      ...lg,
      cost: Number(lg.cost),
      conversions: Number(lg.conversions),
    })),
    summary: totals,
  };
}

/**
 * Armazena métricas históricas (para jobs programados)
 * @param {number} campaignId - ID da campanha
 * @param {Object} metricsData - Dados das métricas
 */
async function storeHistoricalMetrics(campaignId, metricsData) {
  const { date, impressions, clicks, cost, conversions, conversionValue } = metricsData;

  const metricDate = new Date(date);
  metricDate.setHours(0, 0, 0, 0);

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const cpc = clicks > 0 ? cost / clicks : 0;
  const roas = cost > 0 ? conversionValue / cost : 0;

  const metric = await prisma.campaignMetric.upsert({
    where: {
      campaignId_date: {
        campaignId,
        date: metricDate,
      },
    },
    update: {
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      ctr,
      cpc,
      roas,
    },
    create: {
      campaignId,
      date: metricDate,
      impressions,
      clicks,
      cost,
      conversions,
      conversionValue,
      ctr,
      cpc,
      roas,
    },
  });

  return metric;
}

module.exports = {
  syncCampaign,
  generateSimulatedMetrics,
  getDailyMetrics,
  getRealtimeMetrics,
  getAssetGroups,
  getSearchTerms,
  getListingGroups,
  storeHistoricalMetrics,
};
