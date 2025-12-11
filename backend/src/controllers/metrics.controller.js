// =============================================================================
// METRICS CONTROLLER - Controlador de métricas
// Endpoints: GET /metrics/daily/:campaignId, GET /metrics/realtime/:campaignId
// =============================================================================

import metricsService from '../services/metrics.service.js';
import prisma from '../lib/prisma.js';

/**
 * GET /metrics/daily/:campaignId
 * Busca métricas diárias de uma campanha
 */
async function getDaily(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { startDate, endDate, period = '7d' } = req.query;

    const metrics = await metricsService.getDaily(parseInt(campaignId), {
      startDate,
      endDate,
      period,
    });

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /metrics/realtime/:campaignId
 * Busca métricas em tempo real de uma campanha
 */
async function getRealtime(req, res, next) {
  try {
    const { campaignId } = req.params;

    const metrics = await metricsService.getRealtime(parseInt(campaignId));

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /metrics/sync/:campaignId
 * Sincroniza métricas de uma campanha com Google Ads
 */
async function sync(req, res, next) {
  try {
    const { campaignId } = req.params;

    const result = await metricsService.sync(parseInt(campaignId));

    res.json({
      success: true,
      message: 'Métricas sincronizadas com sucesso',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /metrics/dashboard
 * Dashboard do gestor com métricas agregadas
 */
async function getManagerDashboard(req, res, next) {
  try {
    const { period = '7d' } = req.query;

    let days;
    switch (period) {
      case '30d': days = 30; break;
      case '90d': days = 90; break;
      default: days = 7;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar clientes do gestor
    const clients = await prisma.client.findMany({
      where: { managerId: req.user.id },
      select: { id: true },
    });
    const clientIds = clients.map(c => c.id);

    // Buscar campanhas dos clientes
    const campaigns = await prisma.campaign.findMany({
      where: { clientId: { in: clientIds } },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        client: { select: { id: true, name: true, company: true } },
      },
    });

    // Calcular métricas agregadas
    const summary = {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
    };

    campaigns.forEach(c => {
      const latestMetric = c.metrics?.[0];
      if (latestMetric) {
        summary.impressions += latestMetric.impressions || 0;
        summary.clicks += latestMetric.clicks || 0;
        summary.cost += parseFloat(latestMetric.cost) || 0;
        summary.conversions += parseFloat(latestMetric.conversions) || 0;
        summary.conversionValue += parseFloat(latestMetric.conversionValue) || 0;
      }
    });

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.roas = summary.cost > 0 ? summary.conversionValue / summary.cost : 0;
    summary.cpa = summary.conversions > 0 ? summary.cost / summary.conversions : 0;

    // Top campanhas
    const topCampaigns = campaigns
      .filter(c => c.metrics?.length > 0)
      .map(c => {
        const m = c.metrics[0];
        return {
          id: c.id,
          name: c.name,
          client: c.client,
          client_company: c.client?.company || c.client?.name,
          conversions: parseFloat(m.conversions) || 0,
          roas: parseFloat(m.roas) || 0,
          cost: parseFloat(m.cost) || 0,
          conversion_value: parseFloat(m.conversionValue) || 0,
          ctr: parseFloat(m.ctr) || 0,
        };
      })
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 5);

    // Contagens
    const activeCampaigns = campaigns.filter(c => c.status === 'ENABLED').length;

    // Alertas não lidos
    const unreadAlerts = await prisma.alert.count({
      where: {
        campaignId: { in: campaigns.map(c => c.id) },
        isRead: false,
      },
    });

    // Buscar métricas diárias para gráficos
    const campaignIds = campaigns.map(c => c.id);
    const dailyMetricsRaw = await prisma.campaignMetric.findMany({
      where: {
        campaignId: { in: campaignIds },
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Agrupar métricas por data
    const metricsMap = new Map();
    dailyMetricsRaw.forEach(m => {
      const dateKey = m.date.toISOString().split('T')[0];
      if (!metricsMap.has(dateKey)) {
        metricsMap.set(dateKey, {
          date: dateKey,
          cost: 0,
          conversion_value: 0,
          conversions: 0,
          clicks: 0,
          impressions: 0,
        });
      }
      const entry = metricsMap.get(dateKey);
      entry.cost += parseFloat(m.cost) || 0;
      entry.conversion_value += parseFloat(m.conversionValue) || 0;
      entry.conversions += parseFloat(m.conversions) || 0;
      entry.clicks += m.clicks || 0;
      entry.impressions += m.impressions || 0;
    });
    const dailyMetrics = Array.from(metricsMap.values());

    // Calcular distribuição de ROAS
    const roasDistribution = {
      excellent: 0, // > 4
      good: 0,      // 2-4
      average: 0,   // 1-2
      poor: 0,      // < 1
    };
    campaigns.forEach(c => {
      const roas = c.metrics?.[0] ? parseFloat(c.metrics[0].roas) : 0;
      if (roas >= 4) roasDistribution.excellent++;
      else if (roas >= 2) roasDistribution.good++;
      else if (roas >= 1) roasDistribution.average++;
      else roasDistribution.poor++;
    });

    res.json({
      success: true,
      data: {
        summary,
        topCampaigns,
        dailyMetrics,
        roasDistribution,
        counts: {
          total_clients: clients.length,
          total_campaigns: campaigns.length,
          active_campaigns: activeCampaigns,
        },
        unreadAlerts,
        period,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /metrics/client-dashboard
 * Dashboard do cliente
 */
async function getClientDashboard(req, res, next) {
  try {
    const { period = '7d' } = req.query;

    // Buscar cliente pelo email
    const client = await prisma.client.findFirst({
      where: { email: req.user.email },
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado',
      });
    }

    // Buscar campanhas do cliente
    const campaigns = await prisma.campaign.findMany({
      where: { clientId: client.id },
      include: {
        currentMetrics: true,
      },
    });

    // Calcular métricas agregadas
    const summary = {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversionValue: 0,
    };

    campaigns.forEach(c => {
      if (c.currentMetrics) {
        summary.impressions += c.currentMetrics.impressions || 0;
        summary.clicks += c.currentMetrics.clicks || 0;
        summary.cost += c.currentMetrics.cost || 0;
        summary.conversions += c.currentMetrics.conversions || 0;
        summary.conversionValue += c.currentMetrics.conversionValue || 0;
      }
    });

    summary.ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.roas = summary.cost > 0 ? summary.conversionValue / summary.cost : 0;

    // Alertas não lidos
    const unreadAlerts = await prisma.alert.count({
      where: {
        campaignId: { in: campaigns.map(c => c.id) },
        isRead: false,
      },
    });

    res.json({
      success: true,
      data: {
        summary,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          dailyBudget: c.dailyBudget,
          targetRoas: c.targetRoas,
          metrics: c.currentMetrics,
        })),
        unreadAlerts,
        period,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /metrics/compare/:campaignId
 * Compara métricas entre dois períodos
 */
async function compareMetrics(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { period1Start, period1End, period2Start, period2End } = req.query;

    const getMetrics = async (start, end) => {
      const history = await prisma.campaignMetricsHistory.findMany({
        where: {
          campaignId: parseInt(campaignId),
          date: {
            gte: new Date(start),
            lte: new Date(end),
          },
        },
      });

      return history.reduce(
        (acc, h) => ({
          impressions: acc.impressions + (h.impressions || 0),
          clicks: acc.clicks + (h.clicks || 0),
          cost: acc.cost + (h.cost || 0),
          conversions: acc.conversions + (h.conversions || 0),
          conversionValue: acc.conversionValue + (h.conversionValue || 0),
        }),
        { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionValue: 0 }
      );
    };

    const period1Metrics = await getMetrics(period1Start, period1End);
    const period2Metrics = await getMetrics(period2Start, period2End);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    res.json({
      success: true,
      data: {
        period1: { dates: { start: period1Start, end: period1End }, metrics: period1Metrics },
        period2: { dates: { start: period2Start, end: period2End }, metrics: period2Metrics },
        changes: {
          impressions: calculateChange(period2Metrics.impressions, period1Metrics.impressions),
          clicks: calculateChange(period2Metrics.clicks, period1Metrics.clicks),
          cost: calculateChange(period2Metrics.cost, period1Metrics.cost),
          conversions: calculateChange(period2Metrics.conversions, period1Metrics.conversions),
          conversionValue: calculateChange(period2Metrics.conversionValue, period1Metrics.conversionValue),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  getDaily,
  getRealtime,
  sync,
  getManagerDashboard,
  getClientDashboard,
  compareMetrics,
};

export default {
  getDaily,
  getRealtime,
  sync,
  getManagerDashboard,
  getClientDashboard,
  compareMetrics,
};
