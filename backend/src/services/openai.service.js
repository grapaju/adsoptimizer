/**
 * Serviço de integração com OpenAI
 * Utiliza GPT-4 para gerar recomendações, headlines, descriptions e análises
 */
const OpenAI = require('openai');

/**
 * Classe de serviço OpenAI
 * Centraliza todas as chamadas à API da OpenAI
 */
class OpenAIService {
  constructor() {
    // Inicializa o cliente OpenAI com a API key do ambiente
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Gerar recomendações de otimização baseadas em métricas
   * @param {object} campaignData - Dados da campanha
   * @param {object} metricsData - Métricas de performance
   * @returns {object} - Recomendações estruturadas
   */
  async generateRecommendations(campaignData, metricsData) {
    try {
      const prompt = `
        Você é um especialista em Google Ads Performance Max. Analise os dados abaixo e forneça recomendações detalhadas para otimização.

        DADOS DA CAMPANHA:
        - Nome: ${campaignData.name}
        - Status: ${campaignData.status}
        - Orçamento Diário: R$ ${campaignData.budget_daily}
        - Target ROAS: ${campaignData.target_roas}x
        - Target CPA: R$ ${campaignData.target_cpa || 'Não definido'}

        MÉTRICAS (últimos 7 dias):
        - Impressões: ${metricsData.totalImpressions}
        - Cliques: ${metricsData.totalClicks}
        - CTR: ${metricsData.avgCtr}%
        - CPC Médio: R$ ${metricsData.avgCpc}
        - Custo Total: R$ ${metricsData.totalCost}
        - Conversões: ${metricsData.totalConversions}
        - Valor de Conversão: R$ ${metricsData.totalConversionValue}
        - ROAS: ${metricsData.roas}x
        - CPA: R$ ${metricsData.cpa}

        Por favor, forneça:
        1. Análise geral da performance
        2. 3-5 recomendações específicas de otimização
        3. Pontos de atenção e riscos
        4. Próximos passos sugeridos

        Responda em formato JSON com a estrutura:
        {
          "analysis": "string",
          "recommendations": [{"title": "string", "description": "string", "impact": "high|medium|low", "priority": 1-5}],
          "risks": ["string"],
          "nextSteps": ["string"]
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Você é um especialista em Google Ads e marketing digital. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
      throw error;
    }
  }

  // Gerar headlines para Performance Max
  async generateHeadlines(product, targetAudience, benefits, currentHeadlines = []) {
    try {
      const prompt = `
        Crie headlines para uma campanha Google Ads Performance Max.

        PRODUTO/SERVIÇO: ${product}
        PÚBLICO-ALVO: ${targetAudience}
        BENEFÍCIOS: ${benefits.join(', ')}
        
        ${currentHeadlines.length > 0 ? `HEADLINES ATUAIS (evite repetir): ${currentHeadlines.join(', ')}` : ''}

        Regras:
        - Headlines curtas: máximo 30 caracteres
        - Headlines longas: máximo 90 caracteres
        - Seja persuasivo e use calls-to-action
        - Inclua benefícios principais
        - Varie o estilo (perguntas, afirmações, urgência)

        Responda em JSON:
        {
          "shortHeadlines": ["string (max 30 chars)", ...] (gere 10),
          "longHeadlines": ["string (max 90 chars)", ...] (gere 5)
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Você é um copywriter especialista em anúncios Google Ads. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Erro ao gerar headlines:', error);
      throw error;
    }
  }

  // Gerar descriptions para Performance Max
  async generateDescriptions(product, targetAudience, benefits, currentDescriptions = []) {
    try {
      const prompt = `
        Crie descriptions para uma campanha Google Ads Performance Max.

        PRODUTO/SERVIÇO: ${product}
        PÚBLICO-ALVO: ${targetAudience}
        BENEFÍCIOS: ${benefits.join(', ')}
        
        ${currentDescriptions.length > 0 ? `DESCRIPTIONS ATUAIS (evite repetir): ${currentDescriptions.join(' | ')}` : ''}

        Regras:
        - Máximo 90 caracteres cada
        - Complemente as headlines
        - Destaque diferenciais
        - Inclua calls-to-action variados

        Responda em JSON:
        {
          "descriptions": ["string (max 90 chars)", ...] (gere 5)
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Você é um copywriter especialista em anúncios Google Ads. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Erro ao gerar descriptions:', error);
      throw error;
    }
  }

  // Gerar sugestões de assets completas
  async generateAssetSuggestions(campaignInfo, assetGroupData) {
    try {
      const prompt = `
        Analise o asset group abaixo e sugira melhorias completas.

        CAMPANHA: ${campaignInfo.name}
        ASSET GROUP: ${assetGroupData.name}
        AD STRENGTH ATUAL: ${assetGroupData.adStrength || 'Desconhecido'}

        HEADLINES ATUAIS:
        ${assetGroupData.headlines?.join('\n') || 'Nenhuma'}

        DESCRIPTIONS ATUAIS:
        ${assetGroupData.descriptions?.join('\n') || 'Nenhuma'}

        Analise e sugira:
        1. Gaps nos assets atuais
        2. Novas headlines otimizadas
        3. Novas descriptions
        4. Sugestões de imagens (descrições)
        5. Sugestões de vídeos (temas/roteiros)
        6. Como melhorar o Ad Strength

        Responda em JSON:
        {
          "analysis": {
            "currentStrength": "string",
            "gaps": ["string"],
            "improvements": ["string"]
          },
          "suggestedHeadlines": {
            "short": ["string (max 30 chars)"],
            "long": ["string (max 90 chars)"]
          },
          "suggestedDescriptions": ["string (max 90 chars)"],
          "imageIdeas": [{"description": "string", "purpose": "string"}],
          "videoIdeas": [{"theme": "string", "duration": "string", "keyPoints": ["string"]}],
          "expectedAdStrength": "string"
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Você é um especialista em otimização de anúncios Performance Max. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Erro ao gerar sugestões de assets:', error);
      throw error;
    }
  }

  // Análise de performance com insights
  async analyzePerformance(historicalData, goals) {
    try {
      const prompt = `
        Analise o histórico de performance da campanha e identifique padrões.

        DADOS HISTÓRICOS (últimos 30 dias):
        ${JSON.stringify(historicalData, null, 2)}

        METAS:
        - ROAS Alvo: ${goals.targetRoas}x
        - CPA Alvo: R$ ${goals.targetCpa}
        - Orçamento Diário: R$ ${goals.dailyBudget}

        Analise:
        1. Tendências de performance
        2. Dias/horários com melhor performance
        3. Anomalias detectadas
        4. Projeção para próximos 7 dias
        5. Ações recomendadas

        Responda em JSON:
        {
          "trends": {
            "overall": "improving|stable|declining",
            "details": "string"
          },
          "bestPerformance": {
            "dayOfWeek": "string",
            "observation": "string"
          },
          "anomalies": [{"date": "string", "metric": "string", "description": "string"}],
          "projection": {
            "expectedConversions": number,
            "expectedCost": number,
            "expectedRoas": number,
            "confidence": "high|medium|low"
          },
          "actions": [{"priority": number, "action": "string", "expectedImpact": "string"}]
        }
      `;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Você é um analista de dados especializado em Google Ads. Responda sempre em português brasileiro.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Erro ao analisar performance:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();
