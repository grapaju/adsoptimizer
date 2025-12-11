// =============================================================================
// ALERT CONTROLLER - Controlador de alertas automáticos
// Endpoints: GET /alerts, POST /alerts/generate/:campaignId, PUT /alerts/:id/read
// =============================================================================

const alertService = require('../services/alert.service');

/**
 * GET /alerts
 * Lista alertas com filtros
 */
async function list(req, res, next) {
  try {
    const { status, type, severity, campaignId, page = 1, limit = 20 } = req.query;

    const filters = {
      status,
      type,
      severity,
      campaignId: campaignId ? parseInt(campaignId) : null,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await alertService.listAlerts(req.user, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /alerts/generate/:campaignId
 * Gera alertas para uma campanha
 */
async function generate(req, res, next) {
  try {
    const { campaignId } = req.params;

    const alerts = await alertService.generateAlerts(parseInt(campaignId));

    res.json({
      success: true,
      message: `${alerts.length} alerta(s) gerado(s)`,
      data: alerts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/:id/read
 * Marca alerta como lido
 */
async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const alert = await alertService.markAsRead(parseInt(id), req.user);

    res.json({
      success: true,
      message: 'Alerta marcado como lido',
      data: alert,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/read-all
 * Marca todos os alertas como lidos
 */
async function markAllAsRead(req, res, next) {
  try {
    await alertService.markAllAsRead(req.user);

    res.json({
      success: true,
      message: 'Todos os alertas marcados como lidos',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /alerts/settings
 * Busca configurações de alertas do usuário
 */
async function getSettings(req, res, next) {
  try {
    const settings = await alertService.getSettings(req.user.id);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /alerts/settings
 * Atualiza configurações de alertas
 */
async function updateSettings(req, res, next) {
  try {
    const {
      emailEnabled,
      pushEnabled,
      cpaThreshold,
      roasThreshold,
      impressionsDropPercent,
      conversionsDropPercent,
      budgetUsagePercent,
      ctrMinimum,
    } = req.body;

    const updateData = {};
    if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
    if (pushEnabled !== undefined) updateData.pushEnabled = pushEnabled;
    if (cpaThreshold !== undefined) updateData.cpaThreshold = parseFloat(cpaThreshold);
    if (roasThreshold !== undefined) updateData.roasThreshold = parseFloat(roasThreshold);
    if (impressionsDropPercent !== undefined) updateData.impressionsDropPercent = parseInt(impressionsDropPercent);
    if (conversionsDropPercent !== undefined) updateData.conversionsDropPercent = parseInt(conversionsDropPercent);
    if (budgetUsagePercent !== undefined) updateData.budgetUsagePercent = parseInt(budgetUsagePercent);
    if (ctrMinimum !== undefined) updateData.ctrMinimum = parseFloat(ctrMinimum);

    const settings = await alertService.updateSettings(req.user.id, updateData);

    res.json({
      success: true,
      message: 'Configurações atualizadas',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /alerts/generate-all
 * Gera alertas para todas as campanhas ativas
 */
async function generateAll(req, res, next) {
  try {
    const result = await alertService.generateAllAlerts();

    res.json({
      success: true,
      message: 'Alertas gerados para todas as campanhas',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  generate,
  markAsRead,
  markAllAsRead,
  getSettings,
  updateSettings,
  generateAll,
};
