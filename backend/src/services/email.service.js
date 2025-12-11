// =============================================================================
// EMAIL SERVICE - Serviço de envio de emails
// Utiliza Nodemailer para enviar alertas e notificações
// =============================================================================

import nodemailer from 'nodemailer';

// =============================================================================
// CONFIGURAÇÃO DO TRANSPORTER
// =============================================================================

/**
 * Cria o transporter do Nodemailer baseado nas configurações de ambiente
 * Suporta: SMTP, Gmail, SendGrid, Mailgun, etc.
 */
function createTransporter() {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outros
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Se não houver credenciais, usar Ethereal para desenvolvimento
  if (!process.env.SMTP_USER) {
    console.warn('[EMAIL] SMTP não configurado. Emails serão simulados.');
    return null;
  }

  return nodemailer.createTransport(config);
}

const transporter = createTransporter();

// =============================================================================
// TEMPLATES DE EMAIL
// =============================================================================

/**
 * Template base HTML para emails
 * @param {object} options - Opções do template
 * @returns {string} HTML do email
 */
function baseTemplate({ title, content, footer }) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 24px;
    }
    .alert-box {
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .alert-critical { background-color: #fee2e2; border-left: 4px solid #dc2626; }
    .alert-high { background-color: #fef3c7; border-left: 4px solid #f59e0b; }
    .alert-medium { background-color: #dbeafe; border-left: 4px solid #3b82f6; }
    .alert-low { background-color: #f3f4f6; border-left: 4px solid #6b7280; }
    .metrics {
      display: flex;
      gap: 16px;
      margin: 16px 0;
    }
    .metric {
      flex: 1;
      text-align: center;
      padding: 12px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 16px;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      background-color: #f9fafb;
      padding: 16px 24px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    .footer a {
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 AdsOptimizer</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      ${footer || 'Este é um email automático do sistema AdsOptimizer.'}
      <br>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Acessar Dashboard</a>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Template para alertas de campanha
 * @param {object} alert - Dados do alerta
 * @returns {string} HTML do email
 */
function alertTemplate(alert) {
  const priorityClass = alert.priority.toLowerCase();
  const priorityLabels = {
    CRITICAL: '🔴 CRÍTICO',
    HIGH: '🟠 ALTO',
    MEDIUM: '🟡 MÉDIO',
    LOW: '🟢 BAIXO'
  };

  const typeLabels = {
    ROAS_DROP: 'Queda de ROAS',
    CPA_HIGH: 'CPA Alto',
    BUDGET_LOSS: 'Perda por Orçamento',
    RANKING_LOSS: 'Perda por Ranking',
    CTR_DECLINE: 'CTR em Declínio',
    BURN_RATE: 'Burn Rate Alto'
  };

  const content = `
    <h2>Alerta de Campanha</h2>
    
    <div class="alert-box alert-${priorityClass}">
      <strong>${priorityLabels[alert.priority] || alert.priority}</strong>
      <h3 style="margin: 8px 0;">${alert.title}</h3>
      <p>${alert.message}</p>
    </div>

    <p><strong>Campanha:</strong> ${alert.campaign?.name || 'N/A'}</p>
    <p><strong>Tipo:</strong> ${typeLabels[alert.type] || alert.type}</p>
    
    ${alert.currentValue !== null && alert.currentValue !== undefined ? `
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${formatValue(alert.currentValue, alert.type)}</div>
        <div class="metric-label">Valor Atual</div>
      </div>
      ${alert.previousValue !== null && alert.previousValue !== undefined ? `
      <div class="metric">
        <div class="metric-value">${formatValue(alert.previousValue, alert.type)}</div>
        <div class="metric-label">Valor Anterior</div>
      </div>
      ` : ''}
      ${alert.threshold !== null && alert.threshold !== undefined ? `
      <div class="metric">
        <div class="metric-value">${formatValue(alert.threshold, alert.type)}</div>
        <div class="metric-label">Limite</div>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/manager/campaigns/${alert.campaignId}" class="button">
        Ver Campanha
      </a>
    </center>
  `;

  return baseTemplate({
    title: `Alerta: ${alert.title}`,
    content,
    footer: `Você recebeu este alerta porque está configurado para monitorar esta campanha.`
  });
}

/**
 * Formata valor baseado no tipo de alerta
 * @param {number} value - Valor
 * @param {string} type - Tipo do alerta
 * @returns {string} Valor formatado
 */
function formatValue(value, type) {
  if (value === null || value === undefined) return 'N/A';
  
  switch (type) {
    case 'ROAS_DROP':
      return `${value.toFixed(2)}x`;
    case 'CPA_HIGH':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    case 'BUDGET_LOSS':
    case 'RANKING_LOSS':
    case 'CTR_DECLINE':
      return `${value.toFixed(1)}%`;
    case 'BURN_RATE':
      return `${(value * 100).toFixed(0)}%`;
    default:
      return typeof value === 'number' ? value.toFixed(2) : String(value);
  }
}

// =============================================================================
// FUNÇÕES DE ENVIO
// =============================================================================

/**
 * Envia email de alerta
 * @param {object} alert - Dados do alerta (inclui user e campaign)
 * @returns {object} Resultado do envio
 */
export async function sendAlertEmail(alert) {
  if (!transporter) {
    console.log('[EMAIL] Simulando envio de email de alerta para:', alert.user?.email);
    return { simulated: true };
  }

  const mailOptions = {
    from: `"AdsOptimizer" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: alert.user?.email,
    subject: `🚨 ${getPriorityEmoji(alert.priority)} [${alert.priority}] ${alert.title}`,
    html: alertTemplate(alert)
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Email de alerta enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar email:', error);
    throw error;
  }
}

/**
 * Envia email genérico
 * @param {object} options - Opções do email
 * @returns {object} Resultado do envio
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    console.log('[EMAIL] Simulando envio de email para:', to);
    return { simulated: true };
  }

  const mailOptions = {
    from: `"AdsOptimizer" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar email:', error);
    throw error;
  }
}

/**
 * Envia resumo diário de alertas
 * @param {object} user - Usuário destinatário
 * @param {Array} alerts - Lista de alertas do dia
 * @returns {object} Resultado do envio
 */
export async function sendDailySummary(user, alerts) {
  if (!alerts || alerts.length === 0) return { skipped: true };

  const criticalCount = alerts.filter(a => a.priority === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.priority === 'HIGH').length;
  const mediumCount = alerts.filter(a => a.priority === 'MEDIUM').length;
  const lowCount = alerts.filter(a => a.priority === 'LOW').length;

  const content = `
    <h2>Resumo Diário de Alertas</h2>
    <p>Olá ${user.name},</p>
    <p>Aqui está o resumo dos alertas das suas campanhas nas últimas 24 horas:</p>

    <div class="metrics">
      <div class="metric">
        <div class="metric-value" style="color: #dc2626;">${criticalCount}</div>
        <div class="metric-label">Críticos</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #f59e0b;">${highCount}</div>
        <div class="metric-label">Altos</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #3b82f6;">${mediumCount}</div>
        <div class="metric-label">Médios</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #6b7280;">${lowCount}</div>
        <div class="metric-label">Baixos</div>
      </div>
    </div>

    <h3>Alertas Críticos e Altos</h3>
    ${alerts
      .filter(a => ['CRITICAL', 'HIGH'].includes(a.priority))
      .map(a => `
        <div class="alert-box alert-${a.priority.toLowerCase()}">
          <strong>${a.campaign?.name || 'Campanha'}</strong>
          <p>${a.message}</p>
        </div>
      `).join('')}

    <center>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/manager/alerts" class="button">
        Ver Todos os Alertas
      </a>
    </center>
  `;

  return await sendEmail({
    to: user.email,
    subject: `📊 Resumo Diário: ${alerts.length} alertas nas suas campanhas`,
    html: baseTemplate({
      title: 'Resumo Diário de Alertas',
      content,
      footer: 'Você pode configurar suas preferências de notificação no painel.'
    })
  });
}

/**
 * Retorna emoji baseado na prioridade
 * @param {string} priority - Prioridade do alerta
 * @returns {string} Emoji
 */
function getPriorityEmoji(priority) {
  switch (priority) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    default: return '⚪';
  }
}

/**
 * Verifica se o serviço de email está configurado
 * @returns {boolean}
 */
export function isEmailConfigured() {
  return transporter !== null;
}

export default {
  sendAlertEmail,
  sendEmail,
  sendDailySummary,
  isEmailConfigured
};
