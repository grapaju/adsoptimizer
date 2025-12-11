// =============================================================================
// ALERT CONTROLLER - Controlador de Alertas Inteligentes
// Endpoints para gerenciamento de alertas de campanha
// =============================================================================

import * as alertService from '../services/alert.service.js';
import prisma from '../lib/prisma.js';

// =============================================================================
// LISTAGEM E CONSULTA
// =============================================================================

/**
 * GET /alerts
 * Lista alertas do usuário com filtros e paginação
 */
export async function list(req, res, next) {
  try {
    const {
      status,
      priority,
      type,
      campaignId,
      isRead,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      status,
      priority,
      type,
      campaignId,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await alertService.listAlerts(req.user.id, filters);

    res.json({
      success: true,
      data: result.alerts,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /alerts/:id
 * Busca um alerta específico por ID
 */
export async function getById(req, res, next) {
  try {
    const { id } = req.params;

    const alert = await prisma.alert.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            googleCampaignId: true
          }
        }
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /alerts/stats
 * Retorna estatísticas de alertas do usuário
 */
export async function getStats(req, res, next) {
  try {
    const stats = await alertService.getAlertStats(req.user.id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /alerts/campaign/:campaignId
 * Lista alertas de uma campanha específica
 */
export async function listByCampaign(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    const result = await alertService.listAlerts(req.user.id, {
      campaignId: parseInt(campaignId),
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.alerts,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// AÇÕES EM ALERTAS
// =============================================================================

/**
 * PUT /alerts/:id/read
 * Marca um alerta como lido
 */
export async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;

    await alertService.markAsRead(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Alerta marcado como lido'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/read-all
 * Marca todos os alertas como lidos
 */
export async function markAllAsRead(req, res, next) {
  try {
    await prisma.alert.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Todos os alertas marcados como lidos'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/read-multiple
 * Marca múltiplos alertas como lidos
 */
export async function markMultipleAsRead(req, res, next) {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de IDs é obrigatória'
      });
    }

    await alertService.markMultipleAsRead(alertIds.map(id => parseInt(id)), req.user.id);

    res.json({
      success: true,
      message: `${alertIds.length} alertas marcados como lidos`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/:id/acknowledge
 * Reconhece um alerta (acknowledgement)
 */
export async function acknowledge(req, res, next) {
  try {
    const { id } = req.params;

    await alertService.acknowledgeAlert(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Alerta reconhecido'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/:id/resolve
 * Marca um alerta como resolvido
 */
export async function resolve(req, res, next) {
  try {
    const { id } = req.params;

    await alertService.resolveAlert(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Alerta marcado como resolvido'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/:id/dismiss
 * Descarta um alerta
 */
export async function dismiss(req, res, next) {
  try {
    const { id } = req.params;

    await alertService.dismissAlert(parseInt(id), req.user.id);

    res.json({
      success: true,
      message: 'Alerta descartado'
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// GERAÇÃO DE ALERTAS
// =============================================================================

/**
 * POST /alerts/analyze/:campaignId
 * Analisa uma campanha e gera alertas manualmente
 */
export async function analyzeCampaign(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { thresholds } = req.body;

    // Buscar campanha com métricas
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: parseInt(campaignId),
        client: {
          managerId: req.user.id
        }
      },
      include: {
        currentMetrics: true,
        client: true
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campanha não encontrada'
      });
    }

    // Analisar campanha
    const detectedAlerts = await alertService.analyzeCampaignForAlerts(campaign, {
      thresholds
    });

    // Criar alertas no banco
    const createdAlerts = [];
    for (const alertData of detectedAlerts) {
      const alert = await alertService.createAlert(alertData, campaign.id, req.user.id);
      createdAlerts.push(alert);
    }

    res.json({
      success: true,
      message: `${createdAlerts.length} alerta(s) detectado(s)`,
      data: {
        detected: detectedAlerts,
        created: createdAlerts
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /alerts/analyze-all
 * Analisa todas as campanhas do usuário e gera alertas
 */
export async function analyzeAll(req, res, next) {
  try {
    const { thresholds } = req.body;

    // Buscar todas as campanhas do gestor
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ENABLED',
        client: {
          managerId: req.user.id,
          isActive: true
        }
      },
      include: {
        currentMetrics: true,
        client: true
      }
    });

    let totalAlerts = 0;
    const results = [];

    for (const campaign of campaigns) {
      const detectedAlerts = await alertService.analyzeCampaignForAlerts(campaign, {
        thresholds
      });

      for (const alertData of detectedAlerts) {
        await alertService.createAlert(alertData, campaign.id, req.user.id);
        totalAlerts++;
      }

      if (detectedAlerts.length > 0) {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          alertsCount: detectedAlerts.length
        });
      }
    }

    res.json({
      success: true,
      message: `${totalAlerts} alerta(s) gerado(s) em ${results.length} campanha(s)`,
      data: {
        totalCampaigns: campaigns.length,
        campaignsWithAlerts: results.length,
        totalAlerts,
        details: results
      }
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

/**
 * GET /alerts/thresholds
 * Retorna os thresholds padrão do sistema
 */
export async function getThresholds(req, res, next) {
  try {
    res.json({
      success: true,
      data: alertService.ALERT_THRESHOLDS
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /alerts/:id
 * Remove um alerta (apenas para alertas resolvidos/descartados)
 */
export async function remove(req, res, next) {
  try {
    const { id } = req.params;

    // Verificar se o alerta existe e pertence ao usuário
    const alert = await prisma.alert.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alerta não encontrado'
      });
    }

    // Só permite deletar alertas resolvidos ou descartados
    if (alert.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: 'Não é possível deletar alertas ativos. Resolva ou descarte primeiro.'
      });
    }

    await prisma.alert.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Alerta removido'
    });
  } catch (error) {
    next(error);
  }
}

// Exportar todas as funções para uso nas rotas
export default {
  list,
  getById,
  getStats,
  listByCampaign,
  markAsRead,
  markAllAsRead,
  markMultipleAsRead,
  acknowledge,
  resolve,
  dismiss,
  analyzeCampaign,
  analyzeAll,
  getThresholds,
  remove
};
