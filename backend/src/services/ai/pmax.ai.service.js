/**
 * Módulo de IA para Diagnóstico e Otimização de Campanhas Performance Max
 * 
 * Funções principais:
 * - generatePmaxRecommendations: Diagnóstico completo de campanhas
 * - generateAdSuggestions: Geração de anúncios e variações
 * - rewriteLowPerformanceAssets: Reescrita de ativos com baixa performance
 * - analyzeImage: Análise de imagens com GPT-4 Vision
 * - generateAdVariations: Criar 5 variações de anúncios
 */

import { openai, config, isAIEnabled } from './openai.config.js';
import { 
  CAMPAIGN_DIAGNOSIS_PROMPT,
  AD_GENERATION_PROMPT,
  ASSET_REWRITE_PROMPT,
  IMAGE_ANALYSIS_PROMPT
} from './prompts.js';

// =============================================================================
// HELPER - Verificar se IA está disponível
// =============================================================================

function checkAIEnabled() {
  if (!isAIEnabled || !openai) {
    throw new Error('Funcionalidades de IA não estão disponíveis. Configure OPENAI_API_KEY nas variáveis de ambiente.');
  }
}

// =============================================================================
// 1. DIAGNÓSTICO COMPLETO DE CAMPANHAS PMAX
// =============================================================================

/**
 * Gera diagnóstico completo e recomendações para campanhas Performance Max
 * 
 * @param {Object} metrics - Métricas da campanha
 * @param {number} metrics.cost - Custo total
 * @param {number} metrics.conversions - Número de conversões
 * @param {number} metrics.conversionValue - Valor total de conversões
 * @param {number} metrics.impressions - Impressões
 * @param {number} metrics.clicks - Cliques
 * @param {number} metrics.ctr - Taxa de cliques
 * @param {number} metrics.roas - Return on Ad Spend
 * @param {number} metrics.cpa - Custo por aquisição
 * @param {number} metrics.searchImpressionShare - Impression share de pesquisa
 * @param {number} metrics.searchBudgetLostIS - IS perdido por orçamento
 * @param {number} metrics.searchRankLostIS - IS perdido por ranking
 * @param {number} metrics.budget - Orçamento diário
 * 
 * @param {Array} assetGroups - Grupos de ativos
 * @param {Array} listingGroups - Grupos de listagem
 * @param {Array} searchTerms - Termos de busca
 * 
 * @returns {Promise<Object>} Diagnóstico completo com recomendações
 */
export async function generatePmaxRecommendations(metrics, assetGroups = [], listingGroups = [], searchTerms = []) {
  checkAIEnabled();
  
  try {
    // Preparar contexto detalhado para a IA
    const campaignContext = buildCampaignContext(metrics, assetGroups, listingGroups, searchTerms);
    
    const userPrompt = `
Analise a seguinte campanha Performance Max e forneça um diagnóstico completo:

## MÉTRICAS DA CAMPANHA
${JSON.stringify(campaignContext.metrics, null, 2)}

## ASSET GROUPS (${assetGroups.length} grupos)
${JSON.stringify(campaignContext.assetGroupsSummary, null, 2)}

## LISTING GROUPS (${listingGroups.length} grupos)
${JSON.stringify(campaignContext.listingGroupsSummary, null, 2)}

## SEARCH TERMS (Top 20 por performance)
${JSON.stringify(campaignContext.searchTermsSummary, null, 2)}

## ANÁLISE DE PERDA DE IMPRESSÃO
- Perdas por orçamento (Search): ${metrics.searchBudgetLostIS || 0}%
- Perdas por ranking (Search): ${metrics.searchRankLostIS || 0}%
- Perdas por orçamento (Display): ${metrics.displayBudgetLostIS || 0}%
- Perdas por ranking (Display): ${metrics.displayRankLostIS || 0}%

Forneça sua análise no seguinte formato JSON:
{
  "overallScore": <número 0-100>,
  "overallStatus": "<critical|needs_attention|good|excellent>",
  "summary": "<resumo executivo em 2-3 frases>",
  "metricsAnalysis": {
    "roas": {
      "value": ${metrics.roas || 0},
      "status": "<critical|warning|good|excellent>",
      "analysis": "<análise>",
      "recommendation": "<recomendação>"
    },
    "cpa": {
      "value": ${metrics.cpa || 0},
      "status": "<status>",
      "analysis": "<análise>",
      "recommendation": "<recomendação>"
    },
    "ctr": {
      "value": ${metrics.ctr || 0},
      "status": "<status>",
      "analysis": "<análise>",
      "recommendation": "<recomendação>"
    },
    "cvr": {
      "value": ${metrics.cvr || 0},
      "status": "<status>",
      "analysis": "<análise>",
      "recommendation": "<recomendação>"
    },
    "impressionShare": {
      "value": ${metrics.searchImpressionShare || 0},
      "status": "<status>",
      "analysis": "<análise>",
      "recommendation": "<recomendação>"
    }
  },
  "issues": [
    {
      "severity": "<critical|high|medium|low>",
      "category": "<budget|assets|targeting|bidding|quality>",
      "title": "<título do problema>",
      "description": "<descrição detalhada>",
      "impact": "<impacto estimado>",
      "recommendation": "<ação recomendada>",
      "estimatedImpact": "<impacto esperado da correção>"
    }
  ],
  "impressionLossAnalysis": {
    "totalLoss": <porcentagem total>,
    "primaryCause": "<budget|rank>",
    "analysis": "<análise detalhada>",
    "recommendations": ["<recomendação 1>", "<recomendação 2>"]
  },
  "budgetRecommendation": {
    "currentBudget": ${metrics.budget || 0},
    "recommendedBudget": <valor recomendado>,
    "action": "<increase|decrease|maintain>",
    "percentageChange": <porcentagem>,
    "rationale": "<justificativa>"
  },
  "assetGroupRecommendations": [
    {
      "groupName": "<nome>",
      "status": "<status>",
      "issues": ["<problema 1>"],
      "recommendations": ["<recomendação 1>"],
      "priority": <1-5>
    }
  ],
  "prioritizedActions": [
    {
      "priority": 1,
      "action": "<ação>",
      "category": "<categoria>",
      "expectedImpact": "<impacto esperado>",
      "effort": "<low|medium|high>",
      "timeframe": "<imediato|curto prazo|médio prazo>"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: CAMPAIGN_DIAGNOSIS_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.3, // Mais determinístico para análise
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Adicionar metadados
    result.generatedAt = new Date().toISOString();
    result.model = config.model;
    result.tokensUsed = response.usage?.total_tokens || 0;

    return result;

  } catch (error) {
    console.error('Erro ao gerar recomendações PMax:', error);
    throw new Error(`Falha ao gerar diagnóstico: ${error.message}`);
  }
}

// =============================================================================
// 2. GERAÇÃO DE ANÚNCIOS COMPLETOS
// =============================================================================

/**
 * Gera sugestões completas de anúncios para Performance Max
 * 
 * @param {Object} product - Informações do produto/serviço
 * @param {string} product.name - Nome do produto
 * @param {string} product.description - Descrição
 * @param {number} product.price - Preço
 * @param {string} product.category - Categoria
 * @param {Array} product.benefits - Lista de benefícios
 * @param {Array} product.differentials - Diferenciais
 * 
 * @param {Object} audience - Informações do público
 * @param {string} audience.demographics - Demografia
 * @param {string} audience.interests - Interesses
 * @param {string} audience.painPoints - Dores/problemas
 * 
 * @param {Array} keywords - Palavras-chave principais
 * 
 * @returns {Promise<Object>} Sugestões completas de anúncios
 */
export async function generateAdSuggestions(product, audience, keywords = []) {
  try {
    // Identificar datas sazonais próximas
    const upcomingSeasonalEvents = getUpcomingSeasonalEvents();
    
    const userPrompt = `
Crie anúncios completos para Google Ads Performance Max:

## PRODUTO/SERVIÇO
- Nome: ${product.name}
- Descrição: ${product.description}
- Preço: ${product.price ? `R$ ${product.price}` : 'Não informado'}
- Categoria: ${product.category || 'Não especificada'}
- Benefícios: ${(product.benefits || []).join(', ') || 'Não informados'}
- Diferenciais: ${(product.differentials || []).join(', ') || 'Não informados'}

## PÚBLICO-ALVO
- Demografia: ${audience?.demographics || 'Não especificada'}
- Interesses: ${audience?.interests || 'Não especificados'}
- Problemas/Dores: ${audience?.painPoints || 'Não especificados'}

## PALAVRAS-CHAVE PRINCIPAIS
${keywords.join(', ') || 'Nenhuma especificada'}

## DATAS SAZONAIS PRÓXIMAS
${upcomingSeasonalEvents.map(e => `- ${e.name}: ${e.date} (em ${e.daysUntil} dias)`).join('\n')}

Gere sua resposta no seguinte formato JSON:
{
  "headlines": [
    "<15 headlines únicos de até 30 caracteres cada>"
  ],
  "descriptions": [
    "<4 descrições de até 90 caracteres cada>"
  ],
  "callToActions": [
    "<5 CTAs diferentes>"
  ],
  "imageIdeas": [
    {
      "concept": "<conceito da imagem>",
      "description": "<descrição detalhada>",
      "format": "<quadrado|paisagem|retrato>",
      "elements": ["<elemento 1>", "<elemento 2>"],
      "mood": "<mood/estilo>",
      "colors": ["<cor 1>", "<cor 2>"]
    }
  ],
  "videoIdeas": [
    {
      "concept": "<conceito do vídeo>",
      "duration": "<duração sugerida>",
      "scenes": ["<cena 1>", "<cena 2>"],
      "callToAction": "<CTA do vídeo>"
    }
  ],
  "seasonalSuggestions": [
    {
      "event": "<nome do evento>",
      "date": "<data>",
      "headlines": ["<3 headlines temáticos>"],
      "description": "<descrição temática>",
      "imageIdea": "<ideia de imagem temática>"
    }
  ],
  "adVariations": [
    {
      "name": "Variação 1 - <tema>",
      "theme": "<tema/abordagem>",
      "targetAudience": "<segmento específico>",
      "headline1": "<headline principal - 30 chars>",
      "headline2": "<headline secundário - 30 chars>",
      "headline3": "<headline terciário - 30 chars>",
      "description1": "<descrição 1 - 90 chars>",
      "description2": "<descrição 2 - 90 chars>",
      "suggestedCTA": "<CTA recomendado>"
    }
  ]
}

IMPORTANTE:
- Crie exatamente 5 variações de anúncios completos
- Headlines devem ter no máximo 30 caracteres
- Descrições devem ter no máximo 90 caracteres
- Varie abordagens: benefício, urgência, prova social, garantia, preço
`;

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: AD_GENERATION_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.8, // Mais criativo para geração de conteúdo
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validar e limpar resultados
    result.headlines = validateAndTrimHeadlines(result.headlines || []);
    result.descriptions = validateAndTrimDescriptions(result.descriptions || []);
    
    // Adicionar metadados
    result.generatedAt = new Date().toISOString();
    result.model = config.model;
    result.tokensUsed = response.usage?.total_tokens || 0;

    return result;

  } catch (error) {
    console.error('Erro ao gerar sugestões de anúncios:', error);
    throw new Error(`Falha ao gerar sugestões: ${error.message}`);
  }
}

// =============================================================================
// 3. REESCREVER ATIVOS COM PERFORMANCE BAIXA
// =============================================================================

/**
 * Reescreve ativos com baixa performance
 * 
 * @param {Array} assets - Ativos a serem reescritos
 * @param {string} assets[].type - Tipo (headline, description)
 * @param {string} assets[].content - Conteúdo atual
 * @param {string} assets[].performanceLabel - Label de performance (LOW, LEARNING, etc)
 * @param {Object} context - Contexto da campanha
 * 
 * @returns {Promise<Array>} Ativos reescritos com sugestões
 */
export async function rewriteLowPerformanceAssets(assets, context = {}) {
  try {
    const assetsToRewrite = assets.filter(a => 
      ['LOW', 'POOR', 'LEARNING'].includes(a.performanceLabel?.toUpperCase())
    );

    if (assetsToRewrite.length === 0) {
      return { message: 'Nenhum ativo com baixa performance encontrado', rewrites: [] };
    }

    const userPrompt = `
Reescreva os seguintes ativos de baixa performance:

## ATIVOS PARA REESCREVER
${assetsToRewrite.map((a, i) => `
${i + 1}. Tipo: ${a.type}
   Conteúdo atual: "${a.content}"
   Performance: ${a.performanceLabel}
   ${a.impressions ? `Impressões: ${a.impressions}` : ''}
   ${a.clicks ? `Cliques: ${a.clicks}` : ''}
`).join('\n')}

## CONTEXTO DA CAMPANHA
- Produto/Serviço: ${context.productName || 'Não especificado'}
- Público: ${context.audience || 'Não especificado'}
- Tom de voz: ${context.tone || 'Profissional'}

Para cada ativo, forneça 3 versões alternativas no seguinte formato JSON:
{
  "rewrites": [
    {
      "originalContent": "<conteúdo original>",
      "originalType": "<headline|description>",
      "performanceLabel": "<label original>",
      "suggestions": [
        {
          "content": "<nova versão 1>",
          "strategy": "<estratégia usada>",
          "rationale": "<por que deve performar melhor>"
        },
        {
          "content": "<nova versão 2>",
          "strategy": "<estratégia usada>",
          "rationale": "<justificativa>"
        },
        {
          "content": "<nova versão 3>",
          "strategy": "<estratégia usada>",
          "rationale": "<justificativa>"
        }
      ]
    }
  ],
  "generalTips": [
    "<dica geral 1>",
    "<dica geral 2>"
  ]
}

LEMBRE-SE:
- Headlines: máximo 30 caracteres
- Descriptions: máximo 90 caracteres
`;

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: ASSET_REWRITE_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    result.generatedAt = new Date().toISOString();
    result.assetsAnalyzed = assetsToRewrite.length;

    return result;

  } catch (error) {
    console.error('Erro ao reescrever ativos:', error);
    throw new Error(`Falha ao reescrever ativos: ${error.message}`);
  }
}

// =============================================================================
// 4. ANALISAR IMAGENS ENVIADAS
// =============================================================================

/**
 * Analisa imagens de anúncios usando GPT-4 Vision
 * 
 * @param {string} imageUrl - URL da imagem ou base64
 * @param {Object} context - Contexto do anúncio
 * 
 * @returns {Promise<Object>} Análise detalhada da imagem
 */
export async function analyzeImage(imageUrl, context = {}) {
  try {
    const response = await openai.chat.completions.create({
      model: config.visionModel,
      messages: [
        {
          role: 'system',
          content: IMAGE_ANALYSIS_PROMPT
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `
Analise esta imagem para uso em Google Ads Performance Max.

CONTEXTO:
- Produto/Serviço: ${context.productName || 'Não especificado'}
- Objetivo: ${context.objective || 'Conversões'}
- Público-alvo: ${context.audience || 'Não especificado'}

Forneça sua análise no seguinte formato JSON:
{
  "overallScore": <1-10>,
  "overallAssessment": "<excelente|boa|regular|precisa melhorar>",
  "composition": {
    "score": <1-10>,
    "feedback": "<feedback sobre composição>",
    "strengths": ["<ponto forte 1>"],
    "weaknesses": ["<ponto fraco 1>"]
  },
  "brandConsistency": {
    "score": <1-10>,
    "feedback": "<feedback>"
  },
  "pmaxCompatibility": {
    "squareFormat": "<adequado|precisa ajuste>",
    "landscapeFormat": "<adequado|precisa ajuste>",
    "portraitFormat": "<adequado|precisa ajuste>",
    "smallSizeReadability": "<boa|regular|ruim>",
    "issues": ["<problema 1>"]
  },
  "googleAdsCompliance": {
    "isCompliant": <true|false>,
    "issues": ["<problema de compliance>"],
    "textPercentage": "<estimativa de % de texto>"
  },
  "improvements": [
    {
      "priority": "<alta|média|baixa>",
      "suggestion": "<sugestão de melhoria>",
      "rationale": "<justificativa>"
    }
  ],
  "alternativeVersions": [
    "<sugestão de versão alternativa 1>",
    "<sugestão de versão alternativa 2>"
  ]
}
`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2048,
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    result.analyzedAt = new Date().toISOString();
    result.model = config.visionModel;

    return result;

  } catch (error) {
    console.error('Erro ao analisar imagem:', error);
    throw new Error(`Falha ao analisar imagem: ${error.message}`);
  }
}

// =============================================================================
// 5. CRIAR 5 VARIAÇÕES DE ANÚNCIOS
// =============================================================================

/**
 * Gera 5 variações completas de anúncios baseadas em um template
 * 
 * @param {Object} baseAd - Anúncio base
 * @param {Object} context - Contexto adicional
 * 
 * @returns {Promise<Array>} 5 variações de anúncios
 */
export async function generateAdVariations(baseAd, context = {}) {
  try {
    const userPrompt = `
Crie 5 variações únicas deste anúncio para teste A/B:

## ANÚNCIO BASE
- Headline 1: "${baseAd.headline1 || ''}"
- Headline 2: "${baseAd.headline2 || ''}"
- Headline 3: "${baseAd.headline3 || ''}"
- Descrição 1: "${baseAd.description1 || ''}"
- Descrição 2: "${baseAd.description2 || ''}"

## CONTEXTO
- Produto: ${context.productName || 'Não especificado'}
- Público: ${context.audience || 'Geral'}
- Objetivo: ${context.objective || 'Conversões'}

Crie 5 variações diferentes usando estas abordagens:
1. Foco em BENEFÍCIO principal
2. Foco em URGÊNCIA/escassez
3. Foco em PROVA SOCIAL
4. Foco em OFERTA/preço
5. Foco em DIFERENCIAL competitivo

Formato JSON:
{
  "variations": [
    {
      "id": 1,
      "name": "Variação Benefício",
      "approach": "<abordagem usada>",
      "headline1": "<max 30 chars>",
      "headline2": "<max 30 chars>",
      "headline3": "<max 30 chars>",
      "description1": "<max 90 chars>",
      "description2": "<max 90 chars>",
      "expectedStrength": "<abordagem forte para qual público>",
      "testHypothesis": "<hipótese para teste>"
    }
  ],
  "testingRecommendations": {
    "duration": "<duração recomendada do teste>",
    "minBudget": "<orçamento mínimo recomendado>",
    "successMetric": "<métrica principal para avaliar>",
    "tips": ["<dica 1>", "<dica 2>"]
  }
}
`;

    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: AD_GENERATION_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validar limites de caracteres
    if (result.variations) {
      result.variations = result.variations.map(v => ({
        ...v,
        headline1: (v.headline1 || '').substring(0, 30),
        headline2: (v.headline2 || '').substring(0, 30),
        headline3: (v.headline3 || '').substring(0, 30),
        description1: (v.description1 || '').substring(0, 90),
        description2: (v.description2 || '').substring(0, 90),
      }));
    }

    result.generatedAt = new Date().toISOString();
    result.baseAdUsed = baseAd;

    return result;

  } catch (error) {
    console.error('Erro ao gerar variações:', error);
    throw new Error(`Falha ao gerar variações: ${error.message}`);
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Constrói contexto estruturado da campanha para análise
 */
function buildCampaignContext(metrics, assetGroups, listingGroups, searchTerms) {
  return {
    metrics: {
      cost: metrics.cost || 0,
      conversions: metrics.conversions || 0,
      conversionValue: metrics.conversionValue || 0,
      impressions: metrics.impressions || 0,
      clicks: metrics.clicks || 0,
      ctr: metrics.ctr || 0,
      cvr: metrics.clicks > 0 ? ((metrics.conversions / metrics.clicks) * 100).toFixed(2) : 0,
      roas: metrics.roas || 0,
      cpa: metrics.conversions > 0 ? (metrics.cost / metrics.conversions).toFixed(2) : 0,
      cpc: metrics.clicks > 0 ? (metrics.cost / metrics.clicks).toFixed(2) : 0,
      budget: metrics.budget || 0,
      searchImpressionShare: metrics.searchImpressionShare || 0,
      searchBudgetLostIS: metrics.searchBudgetLostIS || 0,
      searchRankLostIS: metrics.searchRankLostIS || 0
    },
    assetGroupsSummary: assetGroups.slice(0, 10).map(ag => ({
      name: ag.name,
      status: ag.status,
      assetCount: ag.assetCount || 0,
      headlines: ag.headlines?.length || 0,
      descriptions: ag.descriptions?.length || 0,
      images: ag.images?.length || 0,
      adStrength: ag.adStrength
    })),
    listingGroupsSummary: listingGroups.slice(0, 10).map(lg => ({
      name: lg.name,
      path: lg.path,
      impressions: lg.impressions,
      clicks: lg.clicks,
      conversions: lg.conversions,
      cost: lg.cost
    })),
    searchTermsSummary: searchTerms
      .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 20)
      .map(st => ({
        term: st.searchTerm || st.search_term,
        impressions: st.impressions,
        clicks: st.clicks,
        conversions: st.conversions,
        cost: st.cost
      }))
  };
}

/**
 * Obtém eventos sazonais próximos (próximos 60 dias)
 */
function getUpcomingSeasonalEvents() {
  const events = [
    { name: 'Ano Novo', month: 0, day: 1 },
    { name: 'Carnaval', month: 1, day: 13 }, // Aproximado
    { name: 'Dia do Consumidor', month: 2, day: 15 },
    { name: 'Páscoa', month: 3, day: 20 }, // Aproximado
    { name: 'Dia das Mães', month: 4, day: 11 }, // Segundo domingo de maio (aproximado)
    { name: 'Dia dos Namorados', month: 5, day: 12 },
    { name: 'Dia dos Pais', month: 7, day: 11 }, // Segundo domingo de agosto (aproximado)
    { name: 'Dia do Cliente', month: 8, day: 15 },
    { name: 'Dia das Crianças', month: 9, day: 12 },
    { name: 'Black Friday', month: 10, day: 29 }, // Última sexta de novembro (aproximado)
    { name: 'Natal', month: 11, day: 25 },
  ];

  const today = new Date();
  const upcoming = [];

  events.forEach(event => {
    let eventDate = new Date(today.getFullYear(), event.month, event.day);
    
    // Se já passou, pegar do próximo ano
    if (eventDate < today) {
      eventDate = new Date(today.getFullYear() + 1, event.month, event.day);
    }

    const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= 60) {
      upcoming.push({
        name: event.name,
        date: eventDate.toLocaleDateString('pt-BR'),
        daysUntil
      });
    }
  });

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Valida e ajusta headlines para limite de 30 caracteres
 */
function validateAndTrimHeadlines(headlines) {
  return headlines.map(h => {
    if (typeof h !== 'string') return '';
    return h.substring(0, 30);
  }).filter(h => h.length > 0);
}

/**
 * Valida e ajusta descriptions para limite de 90 caracteres
 */
function validateAndTrimDescriptions(descriptions) {
  return descriptions.map(d => {
    if (typeof d !== 'string') return '';
    return d.substring(0, 90);
  }).filter(d => d.length > 0);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  generatePmaxRecommendations,
  generateAdSuggestions,
  rewriteLowPerformanceAssets,
  analyzeImage,
  generateAdVariations
};
