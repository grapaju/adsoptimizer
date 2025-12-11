// =============================================================================
// AUDIT SERVICE - Sistema de Audit Log / Histórico de Alterações
// Registra automaticamente todas as alterações importantes do sistema
// =============================================================================

import prisma from '../lib/prisma.js';

// =============================================================================
// CONSTANTES - Mapeamento de ações para descrições legíveis
// =============================================================================

const ACTION_DESCRIPTIONS = {
  CREATE: 'criou',
  UPDATE: 'atualizou',
  DELETE: 'removeu',
  STATUS_CHANGE: 'alterou status de',
  APPROVE: 'aprovou',
  REJECT: 'rejeitou',
  SYNC: 'sincronizou'
};

const ENTITY_DESCRIPTIONS = {
  CAMPAIGN: 'campanha',
  ASSET_GROUP: 'grupo de ativos',
  BUDGET: 'orçamento',
  TARGET: 'meta',
  RECOMMENDATION: 'recomendação',
  USER: 'usuário',
  CLIENT: 'cliente',
  ALERT: 'alerta'
};

const FIELD_LABELS = {
  budgetDaily: 'Orçamento Diário',
  targetRoas: 'Meta de ROAS',
  targetCpa: 'Meta de CPA',
  status: 'Status',
  name: 'Nome',
  biddingStrategy: 'Estratégia de Lances',
  startDate: 'Data de Início',
  endDate: 'Data de Término'
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Formata valor para exibição no log
 * @param {any} value - Valor a formatar
 * @param {string} field - Nome do campo
 * @returns {string} Valor formatado
 */
function formatValue(value, field) {
  if (value === null || value === undefined) return 'N/A';
  
  // Campos monetários
  if (['budgetDaily', 'targetCpa', 'cost'].includes(field)) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
  
  // ROAS
  if (field === 'targetRoas' || field === 'roas') {
    return `${parseFloat(value).toFixed(2)}x`;
  }
  
  // Status
  if (field === 'status') {
    const statusLabels = {
      ENABLED: 'Ativa',
      PAUSED: 'Pausada',
      REMOVED: 'Removida'
    };
    return statusLabels[value] || value;
  }
  
  // Datas
  if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
    return new Date(value).toLocaleDateString('pt-BR');
  }
  
  return String(value);
}

/**
 * Detecta as diferenças entre dois objetos
 * @param {object} oldObj - Objeto anterior
 * @param {object} newObj - Novo objeto
 * @param {Array} fieldsToTrack - Campos a monitorar
 * @returns {Array} Lista de mudanças
 */
function detectChanges(oldObj, newObj, fieldsToTrack = null) {
  const changes = [];
  const fields = fieldsToTrack || Object.keys(newObj);
  
  for (const field of fields) {
    const oldValue = oldObj?.[field];
    const newValue = newObj?.[field];
    
    // Comparar valores (considerando tipos diferentes)
    const oldStr = JSON.stringify(oldValue);
    const newStr = JSON.stringify(newValue);
    
    if (oldStr !== newStr) {
      changes.push({
        field,
        fieldLabel: FIELD_LABELS[field] || field,
        oldValue,
        newValue,
        oldValueFormatted: formatValue(oldValue, field),
        newValueFormatted: formatValue(newValue, field)
      });
    }
  }
  
  return changes;
}

/**
 * Gera descrição legível da alteração
 * @param {string} action - Tipo de ação
 * @param {string} entityType - Tipo de entidade
 * @param {string} entityName - Nome da entidade
 * @param {Array} changes - Lista de mudanças
 * @returns {string} Descrição legível
 */
function generateDescription(action, entityType, entityName, changes = []) {
  const actionText = ACTION_DESCRIPTIONS[action] || action;
  const entityText = ENTITY_DESCRIPTIONS[entityType] || entityType;
  
  let description = `${actionText} ${entityText}`;
  
  if (entityName) {
    description += ` "${entityName}"`;
  }
  
  // Adicionar detalhes das mudanças
  if (changes.length > 0 && changes.length <= 3) {
    const changeDescriptions = changes.map(c => 
      `${c.fieldLabel}: ${c.oldValueFormatted} → ${c.newValueFormatted}`
    );
    description += `: ${changeDescriptions.join(', ')}`;
  } else if (changes.length > 3) {
    description += ` (${changes.length} campos alterados)`;
  }
  
  return description;
}

// =============================================================================
// FUNÇÕES DE LOG
// =============================================================================

/**
 * Cria um registro de auditoria genérico
 * @param {object} data - Dados do log
 * @returns {object} Log criado
 */
export async function createAuditLog(data) {
  const {
    entityType,
    entityId,
    entityName,
    action,
    description,
    changes,
    metadata,
    userId,
    campaignId
  } = data;
  
  try {
    const log = await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        entityName,
        action,
        description,
        changes,
        metadata,
        userId,
        campaignId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        campaign: {
          select: { id: true, name: true }
        }
      }
    });
    
    console.log(`[AUDIT] ${log.description}`);
    return log;
    
  } catch (error) {
    console.error('[AUDIT] Erro ao criar log:', error);
    throw error;
  }
}

/**
 * Registra alteração em campanha
 * @param {object} params - Parâmetros
 * @example
 * await logCampaignChange({
 *   campaignId: 1,
 *   oldData: { status: 'ENABLED', budgetDaily: 100 },
 *   newData: { status: 'PAUSED', budgetDaily: 100 },
 *   userId: 1
 * });
 */
export async function logCampaignChange({
  campaignId,
  campaignName,
  oldData,
  newData,
  action = 'UPDATE',
  userId,
  metadata = {}
}) {
  const trackedFields = ['status', 'name', 'budgetDaily', 'targetRoas', 'targetCpa', 'biddingStrategy', 'startDate', 'endDate'];
  const changes = detectChanges(oldData, newData, trackedFields);
  
  if (changes.length === 0 && action === 'UPDATE') return null;
  
  const description = generateDescription(action, 'CAMPAIGN', campaignName || newData?.name, changes);
  
  return await createAuditLog({
    entityType: 'CAMPAIGN',
    entityId: campaignId,
    entityName: campaignName || newData?.name,
    action,
    description,
    changes,
    metadata,
    userId,
    campaignId
  });
}

/**
 * Registra alteração de orçamento
 * @param {object} params - Parâmetros
 * @example
 * await logBudgetChange({
 *   campaignId: 1,
 *   campaignName: 'Minha Campanha',
 *   oldBudget: 100,
 *   newBudget: 150,
 *   userId: 1
 * });
 */
export async function logBudgetChange({
  campaignId,
  campaignName,
  oldBudget,
  newBudget,
  userId,
  metadata = {}
}) {
  const changes = [{
    field: 'budgetDaily',
    fieldLabel: 'Orçamento Diário',
    oldValue: oldBudget,
    newValue: newBudget,
    oldValueFormatted: formatValue(oldBudget, 'budgetDaily'),
    newValueFormatted: formatValue(newBudget, 'budgetDaily')
  }];
  
  const percentChange = oldBudget > 0 
    ? ((newBudget - oldBudget) / oldBudget * 100).toFixed(1)
    : 0;
  
  const description = `Alterou orçamento de "${campaignName}": ${formatValue(oldBudget, 'budgetDaily')} → ${formatValue(newBudget, 'budgetDaily')} (${percentChange > 0 ? '+' : ''}${percentChange}%)`;
  
  return await createAuditLog({
    entityType: 'BUDGET',
    entityId: campaignId,
    entityName: campaignName,
    action: 'UPDATE',
    description,
    changes,
    metadata: { ...metadata, percentChange: parseFloat(percentChange) },
    userId,
    campaignId
  });
}

/**
 * Registra alteração de meta (ROAS ou CPA)
 * @param {object} params - Parâmetros
 * @example
 * await logTargetChange({
 *   campaignId: 1,
 *   campaignName: 'Minha Campanha',
 *   targetType: 'ROAS',
 *   oldTarget: 3.5,
 *   newTarget: 4.0,
 *   userId: 1
 * });
 */
export async function logTargetChange({
  campaignId,
  campaignName,
  targetType, // 'ROAS' ou 'CPA'
  oldTarget,
  newTarget,
  userId,
  metadata = {}
}) {
  const field = targetType === 'ROAS' ? 'targetRoas' : 'targetCpa';
  const label = targetType === 'ROAS' ? 'Meta de ROAS' : 'Meta de CPA';
  
  const changes = [{
    field,
    fieldLabel: label,
    oldValue: oldTarget,
    newValue: newTarget,
    oldValueFormatted: formatValue(oldTarget, field),
    newValueFormatted: formatValue(newTarget, field)
  }];
  
  const description = `Alterou ${label} de "${campaignName}": ${formatValue(oldTarget, field)} → ${formatValue(newTarget, field)}`;
  
  return await createAuditLog({
    entityType: 'TARGET',
    entityId: campaignId,
    entityName: campaignName,
    action: 'UPDATE',
    description,
    changes,
    metadata: { ...metadata, targetType },
    userId,
    campaignId
  });
}

/**
 * Registra alteração em grupo de ativos
 * @param {object} params - Parâmetros
 * @example
 * await logAssetGroupChange({
 *   assetGroupId: 5,
 *   assetGroupName: 'Grupo Principal',
 *   campaignId: 1,
 *   action: 'UPDATE',
 *   changes: [{ field: 'headlines', oldValue: 3, newValue: 5 }],
 *   userId: 1
 * });
 */
export async function logAssetGroupChange({
  assetGroupId,
  assetGroupName,
  campaignId,
  campaignName,
  action = 'UPDATE',
  oldData,
  newData,
  changes: providedChanges,
  userId,
  metadata = {}
}) {
  let changes = providedChanges;
  
  if (!changes && oldData && newData) {
    changes = detectChanges(oldData, newData);
  }
  
  const description = generateDescription(action, 'ASSET_GROUP', assetGroupName, changes || []);
  
  return await createAuditLog({
    entityType: 'ASSET_GROUP',
    entityId: assetGroupId,
    entityName: assetGroupName,
    action,
    description,
    changes,
    metadata: { ...metadata, campaignName },
    userId,
    campaignId
  });
}

/**
 * Registra aprovação/rejeição de recomendação de IA
 * @param {object} params - Parâmetros
 * @example
 * await logAIRecommendationAction({
 *   recommendationId: 10,
 *   recommendationTitle: 'Aumentar orçamento em 20%',
 *   action: 'APPROVE',
 *   campaignId: 1,
 *   userId: 1,
 *   aiDetails: { type: 'BUDGET', suggestedValue: 120 }
 * });
 */
export async function logAIRecommendationAction({
  recommendationId,
  recommendationTitle,
  recommendationType,
  action, // 'APPROVE' ou 'REJECT'
  campaignId,
  campaignName,
  userId,
  aiDetails = {},
  metadata = {}
}) {
  const actionText = action === 'APPROVE' ? 'Aprovou' : 'Rejeitou';
  const description = `${actionText} recomendação de IA "${recommendationTitle}" para campanha "${campaignName}"`;
  
  return await createAuditLog({
    entityType: 'RECOMMENDATION',
    entityId: recommendationId,
    entityName: recommendationTitle,
    action,
    description,
    changes: [{
      field: 'status',
      fieldLabel: 'Status',
      oldValue: 'PENDING',
      newValue: action === 'APPROVE' ? 'APPLIED' : 'REJECTED',
      oldValueFormatted: 'Pendente',
      newValueFormatted: action === 'APPROVE' ? 'Aplicada' : 'Rejeitada'
    }],
    metadata: { 
      ...metadata, 
      recommendationType,
      aiDetails 
    },
    userId,
    campaignId
  });
}

/**
 * Registra sincronização com Google Ads
 * @param {object} params - Parâmetros
 */
export async function logSync({
  entityType,
  entityId,
  entityName,
  campaignId,
  userId,
  syncDetails = {},
  metadata = {}
}) {
  const description = `Sincronizou ${ENTITY_DESCRIPTIONS[entityType] || entityType} "${entityName}" com Google Ads`;
  
  return await createAuditLog({
    entityType,
    entityId,
    entityName,
    action: 'SYNC',
    description,
    changes: null,
    metadata: { ...metadata, syncDetails },
    userId,
    campaignId
  });
}

// =============================================================================
// FUNÇÕES DE CONSULTA
// =============================================================================

/**
 * Lista logs de auditoria com filtros
 * @param {object} filters - Filtros de busca
 * @returns {object} Logs e paginação
 */
export async function listAuditLogs(filters = {}) {
  const {
    userId,
    entityType,
    entityId,
    campaignId,
    action,
    startDate,
    endDate,
    page = 1,
    limit = 50
  } = filters;
  
  const where = {};
  
  if (userId) where.userId = parseInt(userId);
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = parseInt(entityId);
  if (campaignId) where.campaignId = parseInt(campaignId);
  if (action) where.action = action;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        campaign: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);
  
  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Busca logs de uma entidade específica
 * @param {string} entityType - Tipo de entidade
 * @param {number} entityId - ID da entidade
 * @param {number} limit - Limite de registros
 * @returns {Array} Logs da entidade
 */
export async function getEntityHistory(entityType, entityId, limit = 50) {
  return await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId: parseInt(entityId)
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Busca logs de uma campanha específica
 * @param {number} campaignId - ID da campanha
 * @param {number} limit - Limite de registros
 * @returns {Array} Logs da campanha
 */
export async function getCampaignHistory(campaignId, limit = 100) {
  return await prisma.auditLog.findMany({
    where: { campaignId: parseInt(campaignId) },
    include: {
      user: {
        select: { id: true, name: true, avatar: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Busca logs com filtros e acesso baseado em permissão do usuário
 * Wrapper para listAuditLogs com controle de acesso
 * @param {object} user - Usuário autenticado
 * @param {object} filters - Filtros de busca
 * @param {object} pagination - Opções de paginação
 * @returns {object} Logs e paginação
 */
export async function getAuditLogs(user, filters = {}, pagination = {}) {
  const {
    entityType,
    entityId,
    action,
    userId,
    startDate,
    endDate,
    search
  } = filters;
  
  const { page = 1, limit = 50 } = pagination;
  
  const where = {};
  
  // Filtros básicos
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  if (userId) where.userId = userId;
  
  // Filtro de data
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  // Busca textual
  if (search) {
    where.OR = [
      { description: { contains: search, mode: 'insensitive' } },
      { entityName: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Controle de acesso baseado em role
  if (user.role === 'MANAGER') {
    // Manager vê apenas logs de suas campanhas/clientes
    const clients = await prisma.client.findMany({
      where: { managerId: user.id },
      select: { id: true }
    });
    const clientIds = clients.map(c => c.id);
    
    const campaigns = await prisma.campaign.findMany({
      where: { clientId: { in: clientIds } },
      select: { id: true }
    });
    const campaignIds = campaigns.map(c => c.id);
    
    where.OR = [
      { campaignId: { in: campaignIds } },
      { userId: user.id },
      { campaignId: null } // Logs do sistema
    ];
  } else if (user.role === 'CLIENT') {
    // Cliente vê apenas logs de suas campanhas
    const client = await prisma.client.findFirst({
      where: { email: user.email }
    });
    
    if (client) {
      const campaigns = await prisma.campaign.findMany({
        where: { clientId: client.id },
        select: { id: true }
      });
      where.campaignId = { in: campaigns.map(c => c.id) };
    } else {
      return { logs: [], total: 0, page, totalPages: 0 };
    }
  }
  // ADMIN vê tudo (sem filtro adicional)
  
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        campaign: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);
  
  return {
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Busca um log de auditoria por ID
 * @param {number} id - ID do log
 * @returns {object|null} Log encontrado ou null
 */
export async function getAuditLogById(id) {
  return await prisma.auditLog.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true }
      },
      campaign: {
        select: { id: true, name: true }
      }
    }
  });
}

/**
 * Busca alterações recentes do sistema
 * @param {number} hours - Número de horas para buscar
 * @returns {Array} Logs recentes
 */
export async function getRecentChanges(hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);
  
  return await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      user: {
        select: { id: true, name: true, avatar: true }
      },
      campaign: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
}

/**
 * Busca log de atividade de um usuário específico
 * @param {number} userId - ID do usuário
 * @param {object} options - Opções de busca
 * @returns {object} Atividade do usuário
 */
export async function getUserActivityLog(userId, options = {}) {
  const { limit = 100, days = 30 } = options;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const [logs, stats] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        userId: parseInt(userId),
        createdAt: { gte: startDate }
      },
      include: {
        campaign: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        userId: parseInt(userId),
        createdAt: { gte: startDate }
      },
      _count: true
    })
  ]);
  
  return {
    logs,
    stats: stats.reduce((acc, item) => {
      acc[item.action] = item._count;
      return acc;
    }, {}),
    totalActions: logs.length,
    period: `${days} dias`
  };
}

/**
 * Busca logs de um usuário específico
 * @param {number} userId - ID do usuário
 * @param {number} limit - Limite de registros
 * @returns {Array} Logs do usuário
 */
export async function getUserActivity(userId, limit = 100) {
  return await prisma.auditLog.findMany({
    where: { userId: parseInt(userId) },
    include: {
      campaign: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

/**
 * Obtém estatísticas de auditoria
 * @param {object} filters - Filtros opcionais
 * @returns {object} Estatísticas
 */
export async function getAuditStats(filters = {}) {
  const { userId, campaignId, days = 30 } = filters;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const where = {
    createdAt: { gte: startDate }
  };
  
  if (userId) where.userId = parseInt(userId);
  if (campaignId) where.campaignId = parseInt(campaignId);
  
  const [
    totalLogs,
    byAction,
    byEntityType,
    byDay,
    recentActivity
  ] = await Promise.all([
    // Total de logs
    prisma.auditLog.count({ where }),
    
    // Por ação
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true
    }),
    
    // Por tipo de entidade
    prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: true
    }),
    
    // Por dia (últimos 7 dias)
    prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= ${startDate}
      ${userId ? prisma.$queryRaw`AND user_id = ${userId}` : prisma.$queryRaw``}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    `.catch(() => []), // Fallback se a query falhar
    
    // Atividade recente
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
  ]);
  
  return {
    totalLogs,
    byAction: byAction.reduce((acc, item) => {
      acc[item.action] = item._count;
      return acc;
    }, {}),
    byEntityType: byEntityType.reduce((acc, item) => {
      acc[item.entityType] = item._count;
      return acc;
    }, {}),
    byDay,
    recentActivity
  };
}

// =============================================================================
// MIDDLEWARE HELPER
// =============================================================================

/**
 * Helper para usar em middlewares - compara antes/depois e loga
 * @param {object} params - Parâmetros
 */
export async function logModelChange({
  model,
  id,
  oldData,
  newData,
  userId,
  campaignId = null
}) {
  const entityTypeMap = {
    campaign: 'CAMPAIGN',
    assetGroup: 'ASSET_GROUP',
    user: 'USER',
    client: 'CLIENT'
  };
  
  const entityType = entityTypeMap[model] || model.toUpperCase();
  const changes = detectChanges(oldData, newData);
  
  if (changes.length === 0) return null;
  
  const description = generateDescription('UPDATE', entityType, oldData?.name || newData?.name, changes);
  
  return await createAuditLog({
    entityType,
    entityId: id,
    entityName: oldData?.name || newData?.name,
    action: 'UPDATE',
    description,
    changes,
    userId,
    campaignId
  });
}

export default {
  createAuditLog,
  logCampaignChange,
  logBudgetChange,
  logTargetChange,
  logAssetGroupChange,
  logAIRecommendationAction,
  logSync,
  listAuditLogs,
  getAuditLogs,
  getAuditLogById,
  getRecentChanges,
  getEntityHistory,
  getCampaignHistory,
  getUserActivity,
  getUserActivityLog,
  getAuditStats,
  logModelChange
};
