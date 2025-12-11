// =============================================================================
// AI SERVICE - Serviço de Inteligência Artificial
// Gera recomendações, analisa assets e sugere anúncios usando OpenAI
// =============================================================================

import OpenAI from 'openai';
import prisma from '../lib/prisma.js';

// Verificar se OpenAI está configurada
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

// Inicializar cliente OpenAI (apenas se tiver API key)
const openai = hasOpenAIKey ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

/**
 * Verifica se IA está disponível
 */
function checkAIAvailable() {
  if (!openai) {
    throw new Error('Funcionalidades de IA não estão disponíveis. Configure OPENAI_API_KEY.');
  }
}

/**
 * Gera recomendações automáticas para uma campanha
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 * @returns {Array} Lista de recomendações geradas
 */
async function generateRecommendations(campaignId, user) {
  checkAIAvailable();
  
  // Buscar dados da campanha
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: { select: { name: true, company: true, managerId: true } },
      assetGroups: true,
    },
  });

  if (!campaign) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  // Verificar permissão
  if (user.role === 'MANAGER' && campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão para esta campanha');
    error.status = 403;
    throw error;
  }

  // Buscar métricas dos últimos 14 dias
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const metrics = await prisma.campaignMetric.findMany({
    where: {
      campaignId,
      date: { gte: fourteenDaysAgo },
    },
    orderBy: { date: 'asc' },
  });

  // Calcular médias e tendências
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

  const avgMetrics = {
    impressions: totals.impressions / (metrics.length || 1),
    clicks: totals.clicks / (metrics.length || 1),
    cost: totals.cost / (metrics.length || 1),
    conversions: totals.conversions / (metrics.length || 1),
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    roas: totals.cost > 0 ? totals.conversionValue / totals.cost : 0,
  };

  // Preparar prompt para OpenAI
  const prompt = `
Você é um especialista em Google Ads Performance Max. Analise os dados abaixo e gere 3-5 recomendações práticas para otimizar a campanha.

CAMPANHA: ${campaign.name}
CLIENTE: ${campaign.client.company || campaign.client.name}
ORÇAMENTO DIÁRIO: R$ ${Number(campaign.budgetDaily).toFixed(2)}
ROAS ALVO: ${campaign.targetRoas || 'Não definido'}

MÉTRICAS DOS ÚLTIMOS 14 DIAS:
- Impressões totais: ${totals.impressions.toLocaleString()}
- Cliques totais: ${totals.clicks.toLocaleString()}
- CTR médio: ${avgMetrics.ctr.toFixed(2)}%
- Custo total: R$ ${totals.cost.toFixed(2)}
- Conversões: ${totals.conversions}
- Valor de conversão: R$ ${totals.conversionValue.toFixed(2)}
- ROAS atual: ${avgMetrics.roas.toFixed(2)}x

ASSET GROUPS:
${campaign.assetGroups.map(ag => `- ${ag.name}: ${ag.performanceLabel || 'Sem label'}`).join('\n')}

Responda em JSON com o seguinte formato:
{
  "recommendations": [
    {
      "type": "BUDGET|BIDDING|TARGETING|CREATIVE|GENERAL",
      "priority": "LOW|MEDIUM|HIGH",
      "title": "Título curto da recomendação",
      "description": "Descrição detalhada do que fazer e por quê",
      "expectedImpact": "Impacto esperado (ex: +15% ROAS)"
    }
  ]
}
`;

  try {
    // Chamar API da OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em Google Ads Performance Max. Forneça recomendações práticas e acionáveis em português brasileiro. Responda apenas em JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Extrair JSON da resposta
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido');
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    const recommendations = parsedResponse.recommendations || [];

    // Salvar recomendações no banco
    const savedRecommendations = [];
    for (const rec of recommendations) {
      const saved = await prisma.recommendation.create({
        data: {
          type: rec.type || 'GENERAL',
          status: 'PENDING',
          title: rec.title,
          description: rec.description,
          details: rec,
          expectedImpact: rec.expectedImpact,
          priority: rec.priority || 'MEDIUM',
          campaignId,
          userId: user.id,
        },
      });
      savedRecommendations.push(saved);
    }

    return savedRecommendations;
  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
    
    // Retornar recomendações padrão em caso de erro
    const defaultRecommendations = await generateDefaultRecommendations(campaignId, avgMetrics, user);
    return defaultRecommendations;
  }
}

/**
 * Gera recomendações padrão quando a IA não está disponível
 */
async function generateDefaultRecommendations(campaignId, metrics, user) {
  const recommendations = [];

  // Recomendação baseada no ROAS
  if (metrics.roas < 2) {
    recommendations.push({
      type: 'BIDDING',
      status: 'PENDING',
      title: 'Revisar estratégia de lances',
      description: 'O ROAS está abaixo de 2x. Considere ajustar a meta de ROAS ou revisar os públicos-alvo.',
      expectedImpact: 'Melhoria no retorno sobre investimento',
      priority: 'HIGH',
      campaignId,
      userId: user.id,
    });
  } else if (metrics.roas > 4) {
    recommendations.push({
      type: 'BUDGET',
      status: 'PENDING',
      title: 'Aumentar orçamento da campanha',
      description: 'O ROAS está excelente. Há oportunidade de escalar a campanha aumentando o orçamento.',
      expectedImpact: '+20-30% em conversões',
      priority: 'MEDIUM',
      campaignId,
      userId: user.id,
    });
  }

  // Recomendação baseada no CTR
  if (metrics.ctr < 2) {
    recommendations.push({
      type: 'CREATIVE',
      status: 'PENDING',
      title: 'Melhorar títulos e descrições',
      description: 'O CTR está abaixo da média. Teste novos títulos mais atrativos e CTAs mais diretos.',
      expectedImpact: '+50% em cliques',
      priority: 'MEDIUM',
      campaignId,
      userId: user.id,
    });
  }

  // Salvar recomendações
  const saved = [];
  for (const rec of recommendations) {
    const s = await prisma.recommendation.create({ data: rec });
    saved.push(s);
  }

  return saved;
}

/**
 * Analisa os assets de uma campanha e sugere melhorias
 * @param {number} campaignId - ID da campanha
 * @param {Object} user - Usuário autenticado
 */
async function analyzeAssets(campaignId, user) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: { select: { managerId: true, company: true } },
      assetGroups: true,
    },
  });

  if (!campaign) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  if (user.role === 'MANAGER' && campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão');
    error.status = 403;
    throw error;
  }

  // Analisar cada asset group
  const analysis = [];

  for (const assetGroup of campaign.assetGroups) {
    const headlines = assetGroup.headlines || [];
    const descriptions = assetGroup.descriptions || [];

    const issues = [];
    const suggestions = [];

    // Verificar quantidade de headlines
    if (headlines.length < 5) {
      issues.push(`Apenas ${headlines.length} títulos. Recomendado: 5-15.`);
      suggestions.push('Adicione mais títulos para aumentar a variação de anúncios.');
    }

    // Verificar quantidade de descriptions
    if (descriptions.length < 2) {
      issues.push(`Apenas ${descriptions.length} descrição(ões). Recomendado: 2-4.`);
      suggestions.push('Adicione mais descrições para testar diferentes mensagens.');
    }

    // Verificar performance label
    if (assetGroup.performanceLabel === 'LOW') {
      issues.push('Performance baixa detectada pelo Google.');
      suggestions.push('Revise os ativos com baixo desempenho e substitua-os.');
    }

    analysis.push({
      assetGroupId: assetGroup.id,
      name: assetGroup.name,
      status: assetGroup.status,
      performanceLabel: assetGroup.performanceLabel,
      headlinesCount: headlines.length,
      descriptionsCount: descriptions.length,
      issues,
      suggestions,
      score: calculateAssetScore(headlines.length, descriptions.length, assetGroup.performanceLabel),
    });
  }

  // Se não tem OpenAI configurado, retornar análise básica
  if (!process.env.OPENAI_API_KEY) {
    return {
      campaign: { id: campaign.id, name: campaign.name },
      assetGroups: analysis,
      overallScore: analysis.reduce((acc, a) => acc + a.score, 0) / (analysis.length || 1),
    };
  }

  // Gerar sugestões com IA
  try {
    const prompt = `
Analise os asset groups da campanha "${campaign.name}" e sugira melhorias específicas.

ASSET GROUPS:
${analysis.map(a => `
${a.name}:
- Títulos: ${a.headlinesCount}/15
- Descrições: ${a.descriptionsCount}/4
- Performance: ${a.performanceLabel || 'Não avaliada'}
- Problemas: ${a.issues.join(', ') || 'Nenhum'}
`).join('')}

EMPRESA: ${campaign.client.company || 'Não especificada'}

Forneça sugestões específicas para melhorar os assets em JSON:
{
  "suggestions": [
    {
      "assetGroupName": "nome do asset group",
      "newHeadlines": ["título 1", "título 2"],
      "newDescriptions": ["descrição 1"],
      "improvements": ["melhoria sugerida"]
    }
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em Google Ads. Sugira títulos e descrições eficazes para anúncios. Responda em JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const aiSuggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };

    return {
      campaign: { id: campaign.id, name: campaign.name },
      assetGroups: analysis,
      aiSuggestions: aiSuggestions.suggestions,
      overallScore: analysis.reduce((acc, a) => acc + a.score, 0) / (analysis.length || 1),
    };
  } catch (error) {
    console.error('Erro ao analisar assets com IA:', error);
    return {
      campaign: { id: campaign.id, name: campaign.name },
      assetGroups: analysis,
      overallScore: analysis.reduce((acc, a) => acc + a.score, 0) / (analysis.length || 1),
    };
  }
}

/**
 * Calcula score de qualidade do asset group
 */
function calculateAssetScore(headlines, descriptions, performanceLabel) {
  let score = 0;

  // Pontuação por headlines (máx 40 pontos)
  score += Math.min(headlines, 15) * (40 / 15);

  // Pontuação por descriptions (máx 30 pontos)
  score += Math.min(descriptions, 4) * (30 / 4);

  // Pontuação por performance label (máx 30 pontos)
  const labelScores = { BEST: 30, GOOD: 25, LEARNING: 15, LOW: 5 };
  score += labelScores[performanceLabel] || 10;

  return Math.round(score);
}

/**
 * Sugere novos anúncios usando IA
 * @param {number} campaignId - ID da campanha
 * @param {Object} options - Opções (tom, objetivo, etc)
 * @param {Object} user - Usuário autenticado
 */
async function suggestAds(campaignId, options, user) {
  const { tone = 'profissional', objective = 'vendas', keywords = [] } = options;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      client: { select: { managerId: true, company: true } },
      assetGroups: { take: 1 },
    },
  });

  if (!campaign) {
    const error = new Error('Campanha não encontrada');
    error.status = 404;
    throw error;
  }

  if (user.role === 'MANAGER' && campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão');
    error.status = 403;
    throw error;
  }

  // Se não tem OpenAI configurado, retornar sugestões padrão
  if (!process.env.OPENAI_API_KEY) {
    return {
      headlines: [
        'Compre Agora com Desconto',
        'Frete Grátis para Todo Brasil',
        'Qualidade Garantida',
        'Os Melhores Preços',
        'Promoção por Tempo Limitado',
      ],
      descriptions: [
        'Encontre os melhores produtos com os melhores preços. Aproveite!',
        'Compre online com segurança e receba em casa rapidamente.',
      ],
      callToActions: ['Comprar Agora', 'Ver Ofertas', 'Aproveitar Desconto'],
      generatedBy: 'template',
    };
  }

  // Gerar sugestões com IA
  const prompt = `
Crie anúncios para Google Ads Performance Max com as seguintes características:

EMPRESA: ${campaign.client.company || 'Loja Online'}
CAMPANHA: ${campaign.name}
TOM: ${tone}
OBJETIVO: ${objective}
PALAVRAS-CHAVE: ${keywords.join(', ') || 'produtos, comprar, loja'}

Crie:
- 10 títulos (máx 30 caracteres cada)
- 4 descrições (máx 90 caracteres cada)
- 5 call-to-actions curtos

Responda em JSON:
{
  "headlines": ["título1", "título2", ...],
  "descriptions": ["descrição1", ...],
  "callToActions": ["cta1", ...]
}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um copywriter especialista em Google Ads. Crie textos persuasivos e diretos. Responda apenas em JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      headlines: suggestions.headlines || [],
      descriptions: suggestions.descriptions || [],
      callToActions: suggestions.callToActions || [],
      generatedBy: 'openai',
      campaign: { id: campaign.id, name: campaign.name },
    };
  } catch (error) {
    console.error('Erro ao gerar sugestões de anúncios:', error);
    return {
      headlines: [
        'Compre Agora com Desconto',
        'Frete Grátis',
        'Qualidade Garantida',
      ],
      descriptions: ['Encontre os melhores produtos com os melhores preços.'],
      callToActions: ['Comprar Agora'],
      generatedBy: 'fallback',
    };
  }
}

/**
 * Lista recomendações de uma campanha ou do usuário
 * @param {Object} user - Usuário autenticado
 * @param {Object} options - Opções de filtro
 */
async function listRecommendations(user, options = {}) {
  const { campaignId, status, limit = 20 } = options;

  // Construir filtro
  const where = {
    userId: user.id,
    ...(campaignId && { campaignId: parseInt(campaignId) }),
    ...(status && { status }),
  };

  const recommendations = await prisma.recommendation.findMany({
    where,
    include: {
      campaign: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return recommendations;
}

/**
 * Aplica uma recomendação
 * @param {number} recommendationId - ID da recomendação
 * @param {Object} user - Usuário autenticado
 */
async function applyRecommendation(recommendationId, user) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    include: {
      campaign: {
        include: { client: { select: { managerId: true } } },
      },
    },
  });

  if (!recommendation) {
    const error = new Error('Recomendação não encontrada');
    error.status = 404;
    throw error;
  }

  if (recommendation.campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão');
    error.status = 403;
    throw error;
  }

  // Atualizar status
  const updated = await prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'APPLIED',
      appliedAt: new Date(),
    },
  });

  // Registrar no histórico
  await prisma.changeHistory.create({
    data: {
      action: 'recommendation_applied',
      description: `Recomendação aplicada: ${recommendation.title}`,
      newValue: { recommendationId, title: recommendation.title },
      campaignId: recommendation.campaignId,
      userId: user.id,
    },
  });

  return updated;
}

/**
 * Rejeita uma recomendação
 * @param {number} recommendationId - ID da recomendação
 * @param {Object} user - Usuário autenticado
 */
async function rejectRecommendation(recommendationId, user) {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    include: {
      campaign: {
        include: { client: { select: { managerId: true } } },
      },
    },
  });

  if (!recommendation) {
    const error = new Error('Recomendação não encontrada');
    error.status = 404;
    throw error;
  }

  if (recommendation.campaign.client.managerId !== user.id) {
    const error = new Error('Sem permissão');
    error.status = 403;
    throw error;
  }

  const updated = await prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
    },
  });

  return updated;
}

export {
  generateRecommendations,
  analyzeAssets,
  suggestAds,
  listRecommendations,
  applyRecommendation,
  rejectRecommendation,
};

export default {
  generateRecommendations,
  analyzeAssets,
  suggestAds,
  listRecommendations,
  applyRecommendation,
  rejectRecommendation,
};
