// =============================================================================
// ALERT SERVICE - Sistema de Alertas Inteligentes
// Detecta problemas de performance e dispara alertas automáticos
// =============================================================================

import prisma from '../lib/prisma.js';
import { sendAlertEmail } from './email.service.js';
import { socketService } from './socket.service.js';

// =============================================================================
// CONSTANTES - Thresholds padrão para detecção de alertas
// =============================================================================

const DEFAULT_THRESHOLDS = {
  // Queda de ROAS - alerta quando cai X% em relação ao período anterior
  ROAS_DROP_PERCENT: 20,
  
  // CPA alto - alerta quando ultrapassa X% acima da meta
  CPA_ABOVE_TARGET_PERCENT: 20,
  
  // Perda de impressão por orçamento (Lost IS Budget)
  IMPRESSION_LOSS_BUDGET_PERCENT: 40,
  
  // Perda de impressão por ranking (Lost IS Rank)
  IMPRESSION_LOSS_RANK_PERCENT: 50,
  
  // Queda de CTR semana a semana
  CTR_DROP_WEEKS: 3, // Número de semanas consecutivas de queda
  CTR_DROP_MIN_PERCENT: 10, // Queda mínima para considerar
  
  // Burn rate - % do orçamento mensal gasto em relação ao dia do mês
  BURN_RATE_THRESHOLD: 1.3, // 30% acima do ideal
};

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Calcula a variação percentual entre dois valores
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @returns {number} Variação percentual
 */
function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Determina a prioridade do alerta baseado na severidade
 * @param {string} type - Tipo do alerta
 * @param {number} percentValue - Valor percentual de desvio
 * @returns {string} Prioridade (LOW, MEDIUM, HIGH, CRITICAL)
 */
function determinePriority(type, percentValue) {
  const absValue = Math.abs(percentValue);
  
  // Tipos críticos
  if (['BURN_RATE', 'BUDGET_LOSS', 'RANKING_LOSS'].includes(type)) {
    if (absValue >= 60) return 'CRITICAL';
    if (absValue >= 40) return 'HIGH';
    return 'MEDIUM';
  }
  
  // Outros tipos
  if (absValue >= 50) return 'CRITICAL';
  if (absValue >= 30) return 'HIGH';
  if (absValue >= 20) return 'MEDIUM';
  return 'LOW';
}

/**
 * Formata valor monetário para exibição
 * @param {number} value - Valor
 * @returns {string} Valor formatado
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

/**
 * Formata percentual para exibição
 * @param {number} value - Valor decimal (0.1 = 10%)
 * @returns {string} Valor formatado
 */
function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

// =============================================================================
// DETECTORES DE ALERTA - Cada função analisa uma métrica específica
// =============================================================================

/**
 * Detecta queda de ROAS em relação ao período anterior
 * @param {object} campaign - Campanha com métricas
 * @param {object} currentMetrics - Métricas do período atual
 * @param {object} previousMetrics - Métricas do período anterior
 * @param {object} thresholds - Thresholds customizados
 * @returns {object|null} Alerta se detectado
 */
export function detectROASDrops(campaign, currentMetrics, previousMetrics, thresholds = {}) {
  const threshold = thresholds.ROAS_DROP_PERCENT || DEFAULT_THRESHOLDS.ROAS_DROP_PERCENT;
  
  // Verificar se há dados suficientes
  if (!currentMetrics?.roas || !previousMetrics?.roas) return null;
  
  const percentChange = calculatePercentChange(currentMetrics.roas, previousMetrics.roas);
  
  // Só alerta se houver queda significativa
  if (percentChange >= -threshold) return null;
  
  const dropPercent = Math.abs(percentChange);
  
  return {
    type: 'ROAS_DROP',
    priority: determinePriority('ROAS_DROP', dropPercent),
    title: `Queda de ROAS: ${campaign.name}`,
    message: `O ROAS caiu ${dropPercent.toFixed(1)}% em relação ao período anterior. ` +
             `ROAS atual: ${currentMetrics.roas.toFixed(2)}x, anterior: ${previousMetrics.roas.toFixed(2)}x`,
    threshold,
    currentValue: currentMetrics.roas,
    previousValue: previousMetrics.roas,
    data: {
      dropPercent,
      conversionValue: currentMetrics.conversionValue,
      cost: currentMetrics.cost
    }
  };
}

/**
 * Detecta CPA acima da meta definida
 * @param {object} campaign - Campanha com métricas e metas
 * @param {object} currentMetrics - Métricas atuais
 * @param {object} thresholds - Thresholds customizados
 * @returns {object|null} Alerta se detectado
 */
export function detectHighCPA(campaign, currentMetrics, thresholds = {}) {
  const threshold = thresholds.CPA_ABOVE_TARGET_PERCENT || DEFAULT_THRESHOLDS.CPA_ABOVE_TARGET_PERCENT;
  
  // Verificar se há meta de CPA definida
  const targetCPA = campaign.targetCpa || campaign.settings?.targetCpa;
  if (!targetCPA || !currentMetrics?.cpa) return null;
  
  const percentAbove = calculatePercentChange(currentMetrics.cpa, targetCPA);
  
  // Só alerta se estiver significativamente acima
  if (percentAbove <= threshold) return null;
  
  return {
    type: 'CPA_HIGH',
    priority: determinePriority('CPA_HIGH', percentAbove),
    title: `CPA Alto: ${campaign.name}`,
    message: `O CPA está ${percentAbove.toFixed(1)}% acima da meta. ` +
             `CPA atual: ${formatCurrency(currentMetrics.cpa)}, meta: ${formatCurrency(targetCPA)}`,
    threshold: targetCPA * (1 + threshold / 100),
    currentValue: currentMetrics.cpa,
    previousValue: targetCPA,
    data: {
      percentAbove,
      conversions: currentMetrics.conversions,
      cost: currentMetrics.cost
    }
  };
}

/**
 * Detecta perda de impressões por orçamento limitado
 * @param {object} campaign - Campanha
 * @param {object} currentMetrics - Métricas atuais (inclui searchImpressionShare)
 * @param {object} thresholds - Thresholds customizados
 * @returns {object|null} Alerta se detectado
 */
export function detectBudgetLoss(campaign, currentMetrics, thresholds = {}) {
  const threshold = thresholds.IMPRESSION_LOSS_BUDGET_PERCENT || DEFAULT_THRESHOLDS.IMPRESSION_LOSS_BUDGET_PERCENT;
  
  // Verificar se há dados de perda por orçamento
  // Este dado vem do Google Ads como search_impression_share_lost_to_budget
  const lostImpShare = currentMetrics?.searchImpressionShareLostBudget || 
                       currentMetrics?.impressionShareLostBudget ||
                       currentMetrics?.lostImpressionShareBudget;
  
  if (lostImpShare === null || lostImpShare === undefined) return null;
  
  // Converter para percentual se necessário (API retorna como decimal 0.XX)
  const lostPercent = lostImpShare > 1 ? lostImpShare : lostImpShare * 100;
  
  // Só alerta se perda for significativa
  if (lostPercent < threshold) return null;
  
  return {
    type: 'BUDGET_LOSS',
    priority: determinePriority('BUDGET_LOSS', lostPercent),
    title: `Perda de Impressões por Orçamento: ${campaign.name}`,
    message: `Você está perdendo ${lostPercent.toFixed(1)}% das impressões por orçamento limitado. ` +
             `Considere aumentar o orçamento diário para capturar mais oportunidades.`,
    threshold,
    currentValue: lostPercent,
    previousValue: null,
    data: {
      impressions: currentMetrics.impressions,
      cost: currentMetrics.cost,
      dailyBudget: campaign.budget || campaign.dailyBudget
    }
  };
}

/**
 * Detecta perda de impressões por ranking baixo
 * @param {object} campaign - Campanha
 * @param {object} currentMetrics - Métricas atuais
 * @param {object} thresholds - Thresholds customizados
 * @returns {object|null} Alerta se detectado
 */
export function detectRankingLoss(campaign, currentMetrics, thresholds = {}) {
  const threshold = thresholds.IMPRESSION_LOSS_RANK_PERCENT || DEFAULT_THRESHOLDS.IMPRESSION_LOSS_RANK_PERCENT;
  
  // Verificar se há dados de perda por ranking
  const lostImpShare = currentMetrics?.searchImpressionShareLostRank || 
                       currentMetrics?.impressionShareLostRank ||
                       currentMetrics?.lostImpressionShareRank;
  
  if (lostImpShare === null || lostImpShare === undefined) return null;
  
  const lostPercent = lostImpShare > 1 ? lostImpShare : lostImpShare * 100;
  
  if (lostPercent < threshold) return null;
  
  return {
    type: 'RANKING_LOSS',
    priority: determinePriority('RANKING_LOSS', lostPercent),
    title: `Perda de Impressões por Ranking: ${campaign.name}`,
    message: `Você está perdendo ${lostPercent.toFixed(1)}% das impressões por ranking baixo. ` +
             `Revise a qualidade dos anúncios e considere ajustar os lances.`,
    threshold,
    currentValue: lostPercent,
    previousValue: null,
    data: {
      impressions: currentMetrics.impressions,
      clicks: currentMetrics.clicks,
      averageCpc: currentMetrics.averageCpc || currentMetrics.cpc
    }
  };
}

/**
 * Detecta CTR em declínio por várias semanas consecutivas
 * @param {object} campaign - Campanha
 * @param {Array} weeklyMetrics - Métricas semanais (mais recente primeiro)
 * @param {object} thresholds - Thresholds customizados
 * @returns {object|null} Alerta se detectado
 */
export function detectCTRDecline(campaign, weeklyMetrics, thresholds = {}) {
  const minWeeks = thresholds.CTR_DROP_WEEKS || DEFAULT_THRESHOLDS.CTR_DROP_WEEKS;
  const minDropPercent = thresholds.CTR_DROP_MIN_PERCENT || DEFAULT_THRESHOLDS.CTR_DROP_MIN_PERCENT;
  
  // Precisa de dados de pelo menos N semanas
  if (!weeklyMetrics || weeklyMetrics.length < minWeeks) return null;
  
  // Verificar se CTR está caindo consecutivamente
  let consecutiveDrops = 0;
  let totalDropPercent = 0;
  
  for (let i = 0; i < weeklyMetrics.length - 1; i++) {
    const currentCTR = weeklyMetrics[i].ctr;
    const previousCTR = weeklyMetrics[i + 1].ctr;
    
    if (!currentCTR || !previousCTR) break;
    
    const dropPercent = calculatePercentChange(currentCTR, previousCTR);
    
    // CTR caiu nesta semana?
    if (dropPercent < -minDropPercent) {
      consecutiveDrops++;
      totalDropPercent += Math.abs(dropPercent);
    } else {
      break; // Parar se não houver queda consecutiva
    }
    
    if (consecutiveDrops >= minWeeks - 1) break;
  }
  
  // Só alerta se houver quedas consecutivas suficientes
  if (consecutiveDrops < minWeeks - 1) return null;
  
  const latestCTR = weeklyMetrics[0].ctr;
  const oldestCTR = weeklyMetrics[minWeeks - 1].ctr;
  const overallDrop = Math.abs(calculatePercentChange(latestCTR, oldestCTR));
  
  return {
    type: 'CTR_DECLINE',
    priority: determinePriority('CTR_DECLINE', overallDrop),
    title: `CTR em Declínio: ${campaign.name}`,
    message: `O CTR está caindo há ${minWeeks} semanas consecutivas, com queda total de ${overallDrop.toFixed(1)}%. ` +
             `CTR atual: ${formatPercent(latestCTR)}, CTR há ${minWeeks} semanas: ${formatPercent(oldestCTR)}`,
    threshold: minWeeks,
    currentValue: latestCTR * 100,
    previousValue: oldestCTR * 100,
    data: {
      consecutiveDrops: consecutiveDrops + 1,
      overallDropPercent: overallDrop,
      weeklyData: weeklyMetrics.slice(0, minWeeks).map(w => ({
        week: w.week || w.date,
        ctr: w.ctr
      }))
    }
  };
}

/**
 * Detecta burn rate exagerado (gasto muito rápido em relação ao mês)
 * @param {object} campaign - Campanha com orçamento mensal
 * @param {object} currentMetrics - Métricas atuais
 * @param {object} thresholds - Thresholds customizados
 * @returns {object|null} Alerta se detectado
 */
export function detectBurnRate(campaign, currentMetrics, thresholds = {}) {
  const threshold = thresholds.BURN_RATE_THRESHOLD || DEFAULT_THRESHOLDS.BURN_RATE_THRESHOLD;
  
  // Precisa de orçamento mensal e gasto atual
  const monthlyBudget = campaign.monthlyBudget || (campaign.budget * 30.4);
  if (!monthlyBudget || !currentMetrics?.cost) return null;
  
  // Calcular dia do mês atual
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  // Calcular o gasto esperado até hoje (proporcional ao dia)
  const expectedSpendPercent = dayOfMonth / daysInMonth;
  const expectedSpend = monthlyBudget * expectedSpendPercent;
  
  // Calcular o gasto real acumulado no mês
  // Assumindo que currentMetrics.cost é o gasto acumulado do mês
  const actualSpend = currentMetrics.cost;
  
  // Calcular burn rate
  const burnRate = actualSpend / expectedSpend;
  
  // Só alerta se estiver gastando muito rápido
  if (burnRate < threshold) return null;
  
  const excessPercent = ((burnRate - 1) * 100);
  
  // Projetar gasto final do mês
  const projectedMonthlySpend = actualSpend / expectedSpendPercent;
  const projectedOverspend = projectedMonthlySpend - monthlyBudget;
  
  return {
    type: 'BURN_RATE',
    priority: burnRate >= 1.5 ? 'CRITICAL' : (burnRate >= 1.3 ? 'HIGH' : 'MEDIUM'),
    title: `Burn Rate Alto: ${campaign.name}`,
    message: `O gasto está ${excessPercent.toFixed(0)}% acima do ritmo ideal. ` +
             `Gasto atual: ${formatCurrency(actualSpend)} (esperado: ${formatCurrency(expectedSpend)}). ` +
             `Se continuar assim, vai gastar ${formatCurrency(projectedMonthlySpend)} no mês (orçamento: ${formatCurrency(monthlyBudget)}).`,
    threshold,
    currentValue: burnRate,
    previousValue: 1, // Burn rate ideal
    data: {
      actualSpend,
      expectedSpend,
      monthlyBudget,
      projectedMonthlySpend,
      projectedOverspend,
      dayOfMonth,
      daysInMonth
    }
  };
}

// =============================================================================
// FUNÇÕES PRINCIPAIS
// =============================================================================

/**
 * Analisa uma campanha e gera todos os alertas aplicáveis
 * @param {object} campaign - Campanha com métricas
 * @param {object} options - Opções de análise
 * @returns {Array} Lista de alertas detectados
 */
export async function analyzeCampaignForAlerts(campaign, options = {}) {
  const alerts = [];
  
  try {
    // Buscar métricas atuais e anteriores se não fornecidas
    const currentMetrics = options.currentMetrics || campaign.currentMetrics || 
      await getCurrentMetrics(campaign.id);
    
    const previousMetrics = options.previousMetrics || 
      await getPreviousMetrics(campaign.id);
    
    const weeklyMetrics = options.weeklyMetrics || 
      await getWeeklyMetrics(campaign.id, 4);
    
    const thresholds = options.thresholds || {};
    
    // Executar todos os detectores
    // 1. Queda de ROAS
    const roasAlert = detectROASDrops(campaign, currentMetrics, previousMetrics, thresholds);
    if (roasAlert) alerts.push(roasAlert);
    
    // 2. CPA alto
    const cpaAlert = detectHighCPA(campaign, currentMetrics, thresholds);
    if (cpaAlert) alerts.push(cpaAlert);
    
    // 3. Perda por orçamento
    const budgetLossAlert = detectBudgetLoss(campaign, currentMetrics, thresholds);
    if (budgetLossAlert) alerts.push(budgetLossAlert);
    
    // 4. Perda por ranking
    const rankingLossAlert = detectRankingLoss(campaign, currentMetrics, thresholds);
    if (rankingLossAlert) alerts.push(rankingLossAlert);
    
    // 5. CTR em declínio
    const ctrAlert = detectCTRDecline(campaign, weeklyMetrics, thresholds);
    if (ctrAlert) alerts.push(ctrAlert);
    
    // 6. Burn rate
    const burnRateAlert = detectBurnRate(campaign, currentMetrics, thresholds);
    if (burnRateAlert) alerts.push(burnRateAlert);
    
  } catch (error) {
    console.error(`Erro ao analisar alertas para campanha ${campaign.id}:`, error);
  }
  
  return alerts;
}

/**
 * Busca métricas atuais de uma campanha
 * @param {number} campaignId - ID da campanha
 * @returns {object} Métricas atuais
 */
async function getCurrentMetrics(campaignId) {
  const metrics = await prisma.campaignMetrics.findFirst({
    where: { campaignId },
    orderBy: { date: 'desc' }
  });
  
  return metrics || {};
}

/**
 * Busca métricas do período anterior
 * @param {number} campaignId - ID da campanha
 * @param {number} daysAgo - Dias atrás para comparação
 * @returns {object} Métricas anteriores
 */
async function getPreviousMetrics(campaignId, daysAgo = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo * 2);
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - daysAgo);
  
  const metrics = await prisma.campaignMetrics.findMany({
    where: {
      campaignId,
      date: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  if (metrics.length === 0) return {};
  
  // Agregar métricas do período
  return metrics.reduce((acc, m) => ({
    impressions: (acc.impressions || 0) + m.impressions,
    clicks: (acc.clicks || 0) + m.clicks,
    cost: (acc.cost || 0) + m.cost,
    conversions: (acc.conversions || 0) + m.conversions,
    conversionValue: (acc.conversionValue || 0) + m.conversionValue,
    ctr: m.ctr || acc.ctr,
    roas: m.roas || acc.roas,
    cpa: m.cpa || acc.cpa
  }), {});
}

/**
 * Busca métricas semanais para análise de tendência
 * @param {number} campaignId - ID da campanha
 * @param {number} weeks - Número de semanas
 * @returns {Array} Métricas por semana
 */
async function getWeeklyMetrics(campaignId, weeks = 4) {
  const results = [];
  
  for (let i = 0; i < weeks; i++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (i * 7));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    
    const metrics = await prisma.campaignMetrics.findMany({
      where: {
        campaignId,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });
    
    if (metrics.length > 0) {
      const aggregated = metrics.reduce((acc, m) => ({
        impressions: (acc.impressions || 0) + m.impressions,
        clicks: (acc.clicks || 0) + m.clicks,
        cost: (acc.cost || 0) + m.cost,
        conversions: (acc.conversions || 0) + m.conversions,
      }), {});
      
      results.push({
        week: i,
        startDate,
        endDate,
        ...aggregated,
        ctr: aggregated.impressions > 0 ? aggregated.clicks / aggregated.impressions : 0
      });
    }
  }
  
  return results;
}

/**
 * Cria alerta no banco de dados
 * @param {object} alertData - Dados do alerta
 * @param {number} campaignId - ID da campanha
 * @param {number} userId - ID do usuário (gestor)
 * @returns {object} Alerta criado
 */
export async function createAlert(alertData, campaignId, userId) {
  // Verificar se já existe alerta similar não resolvido
  const existingAlert = await prisma.alert.findFirst({
    where: {
      campaignId,
      type: alertData.type,
      status: 'ACTIVE',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
      }
    }
  });
  
  if (existingAlert) {
    // Atualizar alerta existente se os valores mudaram significativamente
    if (Math.abs((existingAlert.currentValue || 0) - (alertData.currentValue || 0)) > 0.1) {
      return await prisma.alert.update({
        where: { id: existingAlert.id },
        data: {
          currentValue: alertData.currentValue,
          previousValue: alertData.previousValue,
          message: alertData.message,
          data: alertData.data,
          updatedAt: new Date()
        }
      });
    }
    return existingAlert;
  }
  
  // Criar novo alerta
  const alert = await prisma.alert.create({
    data: {
      type: alertData.type,
      priority: alertData.priority,
      status: 'ACTIVE',
      title: alertData.title,
      message: alertData.message,
      threshold: alertData.threshold,
      currentValue: alertData.currentValue,
      previousValue: alertData.previousValue,
      data: alertData.data,
      campaignId,
      userId
    },
    include: {
      campaign: {
        select: { id: true, name: true, googleCampaignId: true }
      },
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });
  
  return alert;
}

/**
 * Dispara um alerta para todos os canais configurados
 * @param {object} alert - Alerta a ser disparado
 * @param {object} options - Opções de envio
 */
export async function dispatchAlert(alert, options = {}) {
  const { sendEmail = true, sendChat = true, sendSocket = true } = options;
  
  try {
    // 1. Enviar para o painel via Socket.IO
    if (sendSocket && socketService) {
      socketService.sendToUser(alert.userId, 'new_alert', {
        id: alert.id,
        type: alert.type,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        campaignId: alert.campaignId,
        campaignName: alert.campaign?.name,
        createdAt: alert.createdAt
      });
    }
    
    // 2. Enviar email
    if (sendEmail && alert.user?.email) {
      try {
        await sendAlertEmail(alert);
        await prisma.alert.update({
          where: { id: alert.id },
          data: { emailSent: true }
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de alerta:', emailError);
      }
    }
    
    // 3. Enviar no chat interno
    if (sendChat) {
      try {
        await sendAlertToChat(alert);
        await prisma.alert.update({
          where: { id: alert.id },
          data: { chatSent: true }
        });
      } catch (chatError) {
        console.error('Erro ao enviar alerta no chat:', chatError);
      }
    }
    
  } catch (error) {
    console.error('Erro ao despachar alerta:', error);
  }
}

/**
 * Envia alerta como mensagem no chat interno
 * @param {object} alert - Alerta a ser enviado
 */
async function sendAlertToChat(alert) {
  // Buscar conversa entre sistema e usuário ou criar uma
  const campaign = await prisma.campaign.findUnique({
    where: { id: alert.campaignId },
    include: { client: true }
  });
  
  if (!campaign?.client?.id) return;
  
  // Criar mensagem de sistema no chat
  // Usando o managerId como remetente (representa o sistema)
  const conversation = await prisma.chatConversation.findFirst({
    where: {
      managerId: alert.userId,
      clientId: campaign.client.id
    }
  });
  
  if (conversation) {
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: alert.userId,
        content: `🚨 **ALERTA: ${alert.title}**\n\n${alert.message}`,
        messageType: 'alert'
      }
    });
    
    // Notificar via socket
    if (socketService) {
      socketService.sendToRoom(`conversation_${conversation.id}`, 'new_message', {
        type: 'alert',
        alert: {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          priority: alert.priority
        }
      });
    }
  }
}

// =============================================================================
// FUNÇÕES DE CONSULTA
// =============================================================================

/**
 * Lista alertas do usuário com filtros
 * @param {number} userId - ID do usuário
 * @param {object} filters - Filtros de busca
 * @returns {object} Alertas e contagem
 */
export async function listAlerts(userId, filters = {}) {
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
  } = filters;
  
  const where = { userId };
  
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (type) where.type = type;
  if (campaignId) where.campaignId = parseInt(campaignId);
  if (typeof isRead === 'boolean') where.isRead = isRead;
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  const [alerts, total] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, name: true, status: true }
        }
      },
      orderBy: [
        { isRead: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.alert.count({ where })
  ]);
  
  return {
    alerts,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Obtém estatísticas de alertas
 * @param {number} userId - ID do usuário
 * @returns {object} Estatísticas
 */
export async function getAlertStats(userId) {
  const [
    totalActive,
    unread,
    bySeverity,
    byType,
    lastWeek
  ] = await Promise.all([
    // Total de alertas ativos
    prisma.alert.count({
      where: { userId, status: 'ACTIVE' }
    }),
    
    // Não lidos
    prisma.alert.count({
      where: { userId, isRead: false }
    }),
    
    // Por severidade
    prisma.alert.groupBy({
      by: ['priority'],
      where: { userId, status: 'ACTIVE' },
      _count: true
    }),
    
    // Por tipo
    prisma.alert.groupBy({
      by: ['type'],
      where: { 
        userId, 
        status: 'ACTIVE',
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      _count: true
    }),
    
    // Últimos 7 dias
    prisma.alert.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    })
  ]);
  
  return {
    totalActive,
    unread,
    lastWeek,
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.priority] = item._count;
      return acc;
    }, {}),
    byType: byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {})
  };
}

/**
 * Marca alerta como lido
 * @param {number} alertId - ID do alerta
 * @param {number} userId - ID do usuário
 */
export async function markAsRead(alertId, userId) {
  return await prisma.alert.updateMany({
    where: { id: alertId, userId },
    data: { isRead: true, readAt: new Date() }
  });
}

/**
 * Marca múltiplos alertas como lidos
 * @param {Array} alertIds - IDs dos alertas
 * @param {number} userId - ID do usuário
 */
export async function markMultipleAsRead(alertIds, userId) {
  return await prisma.alert.updateMany({
    where: { 
      id: { in: alertIds },
      userId 
    },
    data: { isRead: true, readAt: new Date() }
  });
}

/**
 * Reconhece um alerta (acknowledge)
 * @param {number} alertId - ID do alerta
 * @param {number} userId - ID do usuário
 */
export async function acknowledgeAlert(alertId, userId) {
  return await prisma.alert.updateMany({
    where: { id: alertId, userId },
    data: { 
      status: 'ACKNOWLEDGED',
      isRead: true,
      readAt: new Date()
    }
  });
}

/**
 * Resolve um alerta
 * @param {number} alertId - ID do alerta
 * @param {number} userId - ID do usuário
 */
export async function resolveAlert(alertId, userId) {
  return await prisma.alert.updateMany({
    where: { id: alertId, userId },
    data: { 
      status: 'RESOLVED',
      resolvedAt: new Date()
    }
  });
}

/**
 * Descarta um alerta
 * @param {number} alertId - ID do alerta
 * @param {number} userId - ID do usuário
 */
export async function dismissAlert(alertId, userId) {
  return await prisma.alert.updateMany({
    where: { id: alertId, userId },
    data: { 
      status: 'DISMISSED',
      resolvedAt: new Date()
    }
  });
}

// =============================================================================
// CRON JOB - Análise diária de campanhas
// =============================================================================

/**
 * Executa análise diária de todas as campanhas ativas
 * Esta função deve ser chamada pelo cron job
 */
export async function runDailyAlertAnalysis() {
  console.log('[ALERT CRON] Iniciando análise diária de alertas...');
  const startTime = Date.now();
  
  try {
    // Buscar todas as campanhas ativas
    const campaigns = await prisma.campaign.findMany({
      where: { 
        status: 'ENABLED',
        client: { isActive: true }
      },
      include: {
        client: {
          include: {
            manager: { select: { id: true, email: true, name: true } }
          }
        },
        currentMetrics: true
      }
    });
    
    console.log(`[ALERT CRON] Analisando ${campaigns.length} campanhas...`);
    
    let totalAlerts = 0;
    let errors = 0;
    
    for (const campaign of campaigns) {
      try {
        // Analisar campanha
        const alerts = await analyzeCampaignForAlerts(campaign);
        
        // Criar e despachar alertas
        for (const alertData of alerts) {
          const userId = campaign.client.managerId;
          
          // Criar alerta no banco
          const alert = await createAlert(alertData, campaign.id, userId);
          
          // Despachar para todos os canais
          await dispatchAlert(alert);
          
          totalAlerts++;
        }
        
      } catch (error) {
        console.error(`[ALERT CRON] Erro ao analisar campanha ${campaign.id}:`, error);
        errors++;
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[ALERT CRON] Análise concluída em ${duration}ms. ${totalAlerts} alertas gerados, ${errors} erros.`);
    
    return {
      campaignsAnalyzed: campaigns.length,
      alertsGenerated: totalAlerts,
      errors,
      duration
    };
    
  } catch (error) {
    console.error('[ALERT CRON] Erro fatal na análise diária:', error);
    throw error;
  }
}

// Exportar thresholds para uso externo/configuração
export const ALERT_THRESHOLDS = DEFAULT_THRESHOLDS;

export default {
  analyzeCampaignForAlerts,
  detectROASDrops,
  detectHighCPA,
  detectBudgetLoss,
  detectRankingLoss,
  detectCTRDecline,
  detectBurnRate,
  createAlert,
  dispatchAlert,
  listAlerts,
  getAlertStats,
  markAsRead,
  markMultipleAsRead,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  runDailyAlertAnalysis,
  ALERT_THRESHOLDS
};
