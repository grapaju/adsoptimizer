// =============================================================================
// CRON JOBS - Tarefas agendadas do sistema
// Utiliza node-cron para executar tarefas em horários específicos
// =============================================================================

import cron from 'node-cron';
import { runDailyAlertAnalysis } from './alert.service.js';
import { sendDailySummary } from './email.service.js';
import prisma from '../lib/prisma.js';

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

const CRON_SCHEDULES = {
  // Análise de alertas - executa todos os dias às 08:00
  DAILY_ALERTS: process.env.CRON_DAILY_ALERTS || '0 8 * * *',
  
  // Resumo diário por email - executa todos os dias às 09:00
  DAILY_SUMMARY: process.env.CRON_DAILY_SUMMARY || '0 9 * * *',
  
  // Análise de métricas a cada 4 horas (para alertas mais urgentes)
  PERIODIC_CHECK: process.env.CRON_PERIODIC_CHECK || '0 */4 * * *',
  
  // Limpeza de alertas antigos - executa todo domingo às 02:00
  CLEANUP_OLD_ALERTS: process.env.CRON_CLEANUP || '0 2 * * 0'
};

// Flag para controlar se os jobs estão rodando
let jobsRunning = false;

// =============================================================================
// JOBS
// =============================================================================

/**
 * Job: Análise diária de alertas
 * Analisa todas as campanhas ativas e gera alertas
 */
async function dailyAlertAnalysisJob() {
  console.log('[CRON] Iniciando job: Análise Diária de Alertas');
  
  try {
    const result = await runDailyAlertAnalysis();
    console.log('[CRON] Análise diária concluída:', result);
  } catch (error) {
    console.error('[CRON] Erro na análise diária:', error);
  }
}

/**
 * Job: Envio de resumo diário por email
 * Envia email com resumo de alertas para cada gestor
 */
async function dailySummaryJob() {
  console.log('[CRON] Iniciando job: Resumo Diário por Email');
  
  try {
    // Buscar gestores ativos com alertas nas últimas 24h
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        isActive: true
      }
    });
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const manager of managers) {
      // Buscar alertas do gestor nas últimas 24h
      const alerts = await prisma.alert.findMany({
        where: {
          userId: manager.id,
          createdAt: { gte: yesterday }
        },
        include: {
          campaign: { select: { name: true } }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });
      
      if (alerts.length > 0) {
        await sendDailySummary(manager, alerts);
        console.log(`[CRON] Resumo enviado para ${manager.email}: ${alerts.length} alertas`);
      }
    }
    
    console.log('[CRON] Resumos diários enviados');
    
  } catch (error) {
    console.error('[CRON] Erro no envio de resumos:', error);
  }
}

/**
 * Job: Verificação periódica (a cada 4 horas)
 * Para detectar alertas mais urgentes durante o dia
 */
async function periodicCheckJob() {
  console.log('[CRON] Iniciando job: Verificação Periódica');
  
  try {
    // Buscar campanhas com alto gasto ou métricas críticas
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'ENABLED',
        client: { isActive: true }
      },
      include: {
        client: {
          include: { manager: true }
        },
        currentMetrics: true
      }
    });
    
    let criticalAlerts = 0;
    
    for (const campaign of campaigns) {
      // Verificar apenas alertas críticos (burn rate e perdas altas)
      const metrics = campaign.currentMetrics;
      if (!metrics) continue;
      
      // Importar funções de detecção
      const { detectBurnRate, detectBudgetLoss, detectRankingLoss, createAlert, dispatchAlert } = 
        await import('./alert.service.js');
      
      // Verificar burn rate
      const burnAlert = detectBurnRate(campaign, metrics);
      if (burnAlert && burnAlert.priority === 'CRITICAL') {
        const alert = await createAlert(burnAlert, campaign.id, campaign.client.managerId);
        await dispatchAlert(alert);
        criticalAlerts++;
      }
      
      // Verificar perda por orçamento crítica
      const budgetAlert = detectBudgetLoss(campaign, metrics, { IMPRESSION_LOSS_BUDGET_PERCENT: 60 });
      if (budgetAlert && budgetAlert.priority === 'CRITICAL') {
        const alert = await createAlert(budgetAlert, campaign.id, campaign.client.managerId);
        await dispatchAlert(alert);
        criticalAlerts++;
      }
    }
    
    console.log(`[CRON] Verificação periódica concluída: ${criticalAlerts} alertas críticos`);
    
  } catch (error) {
    console.error('[CRON] Erro na verificação periódica:', error);
  }
}

/**
 * Job: Limpeza de alertas antigos
 * Remove alertas resolvidos/descartados com mais de 30 dias
 */
async function cleanupOldAlertsJob() {
  console.log('[CRON] Iniciando job: Limpeza de Alertas Antigos');
  
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Deletar alertas antigos que foram resolvidos ou descartados
    const result = await prisma.alert.deleteMany({
      where: {
        status: { in: ['RESOLVED', 'DISMISSED'] },
        createdAt: { lt: thirtyDaysAgo }
      }
    });
    
    console.log(`[CRON] ${result.count} alertas antigos removidos`);
    
  } catch (error) {
    console.error('[CRON] Erro na limpeza de alertas:', error);
  }
}

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

/**
 * Inicializa todos os cron jobs
 */
export function startCronJobs() {
  if (jobsRunning) {
    console.warn('[CRON] Jobs já estão em execução');
    return;
  }
  
  console.log('[CRON] Iniciando cron jobs...');
  
  // Job 1: Análise diária de alertas
  cron.schedule(CRON_SCHEDULES.DAILY_ALERTS, dailyAlertAnalysisJob, {
    timezone: 'America/Sao_Paulo'
  });
  console.log(`[CRON] Análise diária agendada: ${CRON_SCHEDULES.DAILY_ALERTS}`);
  
  // Job 2: Resumo diário por email
  cron.schedule(CRON_SCHEDULES.DAILY_SUMMARY, dailySummaryJob, {
    timezone: 'America/Sao_Paulo'
  });
  console.log(`[CRON] Resumo diário agendado: ${CRON_SCHEDULES.DAILY_SUMMARY}`);
  
  // Job 3: Verificação periódica
  cron.schedule(CRON_SCHEDULES.PERIODIC_CHECK, periodicCheckJob, {
    timezone: 'America/Sao_Paulo'
  });
  console.log(`[CRON] Verificação periódica agendada: ${CRON_SCHEDULES.PERIODIC_CHECK}`);
  
  // Job 4: Limpeza semanal
  cron.schedule(CRON_SCHEDULES.CLEANUP_OLD_ALERTS, cleanupOldAlertsJob, {
    timezone: 'America/Sao_Paulo'
  });
  console.log(`[CRON] Limpeza semanal agendada: ${CRON_SCHEDULES.CLEANUP_OLD_ALERTS}`);
  
  jobsRunning = true;
  console.log('[CRON] Todos os jobs iniciados com sucesso!');
}

/**
 * Para todos os cron jobs
 */
export function stopCronJobs() {
  // node-cron não tem um método global de stop
  // Os jobs serão parados quando o processo terminar
  jobsRunning = false;
  console.log('[CRON] Flag de jobs marcada como parada');
}

/**
 * Executa um job manualmente (para testes/debug)
 * @param {string} jobName - Nome do job
 */
export async function runJobManually(jobName) {
  console.log(`[CRON] Executando job manualmente: ${jobName}`);
  
  switch (jobName) {
    case 'daily-alerts':
      await dailyAlertAnalysisJob();
      break;
    case 'daily-summary':
      await dailySummaryJob();
      break;
    case 'periodic-check':
      await periodicCheckJob();
      break;
    case 'cleanup':
      await cleanupOldAlertsJob();
      break;
    default:
      console.error(`[CRON] Job desconhecido: ${jobName}`);
  }
}

export default {
  startCronJobs,
  stopCronJobs,
  runJobManually,
  CRON_SCHEDULES
};
