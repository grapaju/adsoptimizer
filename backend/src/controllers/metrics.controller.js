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
        currentMetrics: true,
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
    summary.cpa = summary.conversions > 0 ? summary.cost / summary.conversions : 0;

    // Top campanhas
    const topCampaigns = campaigns
      .filter(c => c.currentMetrics)
      .map(c => ({
        id: c.id,
        name: c.name,
        client: c.client,
        conversions: c.currentMetrics.conversions,
        roas: c.currentMetrics.roas,
        cost: c.currentMetrics.cost,
      }))
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

    res.json({
      success: true,
      data: {
        summary,
        topCampaigns,
        counts: {
          totalClients: clients.length,
          totalCampaigns: campaigns.length,
          activeCampaigns,
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
