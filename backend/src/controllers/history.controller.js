// =============================================================================
// HISTORY CONTROLLER - Controlador de histórico de alterações / Audit Log
// Endpoints completos para visualização de timeline e auditoria
// =============================================================================

import * as auditService from '../services/audit.service.js';
import * as historyService from '../services/history.service.js';

// =============================================================================
// LISTAR HISTÓRICO - GET /history
// =============================================================================

/**
 * GET /history
 * Lista histórico de alterações com filtros avançados
 */
export async function list(req, res, next) {
  try {
    const {
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      search
    } = req.query;

    const filters = {
      entityType: entityType || null,
      entityId: entityId ? parseInt(entityId) : null,
      action: action || null,
      userId: userId ? parseInt(userId) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      search: search || null
    };

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const result = await auditService.getAuditLogs(req.user, filters, pagination);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// BUSCAR POR ENTIDADE - GET /history/entity/:entityType/:entityId
// =============================================================================

/**
 * GET /history/entity/:entityType/:entityId
 * Busca histórico de uma entidade específica
 */
export async function getByEntity(req, res, next) {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100 } = req.query;

    const history = await auditService.getEntityHistory(
      entityType.toUpperCase(),
      parseInt(entityId),
      { limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// BUSCAR POR CAMPANHA - GET /history/campaign/:campaignId
// =============================================================================

/**
 * GET /history/campaign/:campaignId
 * Busca histórico completo de uma campanha
 */
export async function getByCampaign(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { limit = 100 } = req.query;

    const history = await auditService.getEntityHistory(
      'CAMPAIGN',
      parseInt(campaignId),
      { limit: parseInt(limit) }
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// TIMELINE DE CAMPANHA - GET /history/campaign/:campaignId/timeline
// =============================================================================

/**
 * GET /history/campaign/:campaignId/timeline
 * Retorna timeline visual de alterações de uma campanha
 */
export async function getTimeline(req, res, next) {
  try {
    const { campaignId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const history = await auditService.getEntityHistory(
      'CAMPAIGN',
      parseInt(campaignId),
      {
        limit: 500,
        startDate
      }
    );

    // Agrupar por data para timeline
    const timeline = {};
    for (const entry of history) {
      const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
      if (!timeline[dateKey]) {
        timeline[dateKey] = [];
      }
      timeline[dateKey].push({
        id: entry.id,
        time: new Date(entry.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        action: entry.action,
        entityType: entry.entityType,
        field: entry.field,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        description: entry.description,
        user: entry.user,
        icon: getActionIcon(entry.action),
        color: getActionColor(entry.action)
      });
    }

    // Converter para array ordenado
    const timelineArray = Object.entries(timeline)
      .map(([date, events]) => ({
        date,
        dateFormatted: new Date(date).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }),
        events: events.sort((a, b) => b.time.localeCompare(a.time))
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: timelineArray
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// BUSCAR POR USUÁRIO - GET /history/user/:userId
// =============================================================================

/**
 * GET /history/user/:userId
 * Busca histórico de ações de um usuário
 */
export async function getByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const { limit = 100, days = 30 } = req.query;

    const activity = await auditService.getUserActivityLog(
      parseInt(userId),
      {
        limit: parseInt(limit),
        days: parseInt(days)
      }
    );

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// ALTERAÇÕES RECENTES - GET /history/recent
// =============================================================================

/**
 * GET /history/recent
 * Retorna alterações recentes do sistema
 */
export async function getRecent(req, res, next) {
  try {
    const { hours = 24 } = req.query;

    const recent = await auditService.getRecentChanges(parseInt(hours));

    res.json({
      success: true,
      data: recent
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// ESTATÍSTICAS - GET /history/stats
// =============================================================================

/**
 * GET /history/stats
 * Estatísticas de alterações
 */
export async function getStats(req, res, next) {
  try {
    const { days = 30 } = req.query;

    const stats = await auditService.getAuditStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// TIPOS DE ENTIDADE - GET /history/entity-types
// =============================================================================

/**
 * GET /history/entity-types
 * Lista tipos de entidade disponíveis
 */
export async function getEntityTypes(req, res, next) {
  try {
    const entityTypes = [
      { value: 'CAMPAIGN', label: 'Campanha', icon: 'campaign' },
      { value: 'ASSET_GROUP', label: 'Grupo de Ativos', icon: 'collections' },
      { value: 'BUDGET', label: 'Orçamento', icon: 'attach_money' },
      { value: 'TARGET', label: 'Meta', icon: 'track_changes' },
      { value: 'RECOMMENDATION', label: 'Recomendação IA', icon: 'psychology' },
      { value: 'USER', label: 'Usuário', icon: 'person' },
      { value: 'CLIENT', label: 'Cliente', icon: 'business' },
      { value: 'ALERT', label: 'Alerta', icon: 'notifications' }
    ];

    res.json({
      success: true,
      data: entityTypes
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// TIPOS DE AÇÃO - GET /history/action-types
// =============================================================================

/**
 * GET /history/action-types
 * Lista tipos de ação disponíveis
 */
export async function getActionTypes(req, res, next) {
  try {
    const actionTypes = [
      { value: 'CREATE', label: 'Criação', icon: 'add_circle', color: 'green' },
      { value: 'UPDATE', label: 'Atualização', icon: 'edit', color: 'blue' },
      { value: 'DELETE', label: 'Remoção', icon: 'delete', color: 'red' },
      { value: 'STATUS_CHANGE', label: 'Mudança de Status', icon: 'toggle_on', color: 'orange' },
      { value: 'APPROVE', label: 'Aprovação', icon: 'check_circle', color: 'green' },
      { value: 'REJECT', label: 'Rejeição', icon: 'cancel', color: 'red' },
      { value: 'SYNC', label: 'Sincronização', icon: 'sync', color: 'purple' }
    ];

    res.json({
      success: true,
      data: actionTypes
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// BUSCAR POR ID - GET /history/:historyId
// =============================================================================

/**
 * GET /history/:historyId
 * Busca detalhes de um registro de histórico
 */
export async function getById(req, res, next) {
  try {
    const { historyId } = req.params;

    const entry = await auditService.getAuditLogById(parseInt(historyId));

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Registro não encontrado'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// CRIAR REGISTRO MANUAL - POST /history
// =============================================================================

/**
 * POST /history
 * Cria um registro de histórico manualmente
 */
export async function create(req, res, next) {
  try {
    const {
      entityType,
      entityId,
      action,
      field,
      oldValue,
      newValue,
      description,
      campaignId
    } = req.body;

    const entry = await auditService.logChange({
      entityType,
      entityId: parseInt(entityId),
      action,
      field,
      oldValue,
      newValue,
      description,
      campaignId: campaignId ? parseInt(campaignId) : null,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Retorna ícone baseado na ação
 */
function getActionIcon(action) {
  const icons = {
    CREATE: 'add_circle',
    UPDATE: 'edit',
    DELETE: 'delete',
    STATUS_CHANGE: 'toggle_on',
    APPROVE: 'check_circle',
    REJECT: 'cancel',
    SYNC: 'sync'
  };
  return icons[action] || 'info';
}

/**
 * Retorna cor baseada na ação
 */
function getActionColor(action) {
  const colors = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    STATUS_CHANGE: 'orange',
    APPROVE: 'green',
    REJECT: 'red',
    SYNC: 'purple'
  };
  return colors[action] || 'gray';
}
