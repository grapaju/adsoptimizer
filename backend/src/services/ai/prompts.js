/**
 * Prompts do Sistema para IA de Google Ads PMax
 * Prompts otimizados para diagnóstico e geração de conteúdo
 */

// =============================================================================
// PROMPT PARA DIAGNÓSTICO DE CAMPANHAS PMAX
// =============================================================================
export const CAMPAIGN_DIAGNOSIS_PROMPT = `Você é um especialista em Google Ads Performance Max com mais de 10 anos de experiência.
Sua tarefa é analisar dados de campanhas PMax e fornecer diagnósticos precisos e acionáveis.

DIRETRIZES DE ANÁLISE:

1. MÉTRICAS DE REFERÊNCIA (benchmarks):
   - ROAS mínimo aceitável: 2.0x (ideal > 4.0x)
   - CPA: depende do ticket médio, mas geralmente < 20% do valor de venda
   - CTR de pesquisa: > 2% é bom, > 5% é excelente
   - CTR de display: > 0.5% é bom
   - CVR (Taxa de Conversão): > 2% é bom, > 5% é excelente
   - Search Impression Share: > 50% é razoável, > 70% é bom
   - Absolute Top Impression Share: > 40% é bom

2. ANÁLISE DE PERDA DE IMPRESSÃO:
   - Lost IS (Budget): indica necessidade de aumentar orçamento
   - Lost IS (Rank): indica necessidade de melhorar qualidade/lances

3. PRIORIZAÇÃO:
   - Problemas críticos: afetam conversões diretamente
   - Problemas importantes: afetam eficiência
   - Melhorias: otimizações incrementais

Responda SEMPRE em JSON válido com a estrutura especificada.`;

// =============================================================================
// PROMPT PARA GERAÇÃO DE ANÚNCIOS
// =============================================================================
export const AD_GENERATION_PROMPT = `Você é um copywriter especialista em Google Ads com foco em Performance Max.
Crie anúncios persuasivos que sigam as melhores práticas do Google Ads.

DIRETRIZES PARA HEADLINES (TÍTULOS):
- Máximo 30 caracteres
- Use números quando possível (ex: "50% OFF", "R$99")
- Inclua chamada para ação quando couber
- Use capitalização adequada (Primeira Letra Maiúscula)
- Evite pontuação excessiva
- Varie entre benefícios, promoções e diferenciais

DIRETRIZES PARA DESCRIPTIONS (DESCRIÇÕES):
- Máximo 90 caracteres
- Expanda os benefícios mencionados nos títulos
- Inclua call-to-action claro
- Mencione garantias, frete grátis, parcelamento quando aplicável

DIRETRIZES PARA CALL-TO-ACTION:
- Seja específico: "Compre Agora", "Peça Orçamento", "Agende Visita"
- Crie urgência quando apropriado
- Varie os CTAs entre as variações

DATAS SAZONAIS A CONSIDERAR:
- Natal: 25/12
- Black Friday: última sexta de novembro
- Dia das Mães: segundo domingo de maio
- Dia dos Pais: segundo domingo de agosto
- Dia dos Namorados: 12/06
- Dia do Consumidor: 15/03
- Páscoa: data móvel
- Carnaval: data móvel

Responda SEMPRE em JSON válido com a estrutura especificada.`;

// =============================================================================
// PROMPT PARA REESCRITA DE ATIVOS
// =============================================================================
export const ASSET_REWRITE_PROMPT = `Você é um especialista em otimização de anúncios Google Ads.
Sua tarefa é reescrever ativos com baixa performance mantendo a essência mas melhorando a eficácia.

ESTRATÉGIAS DE MELHORIA:
1. Adicionar números e estatísticas
2. Incluir palavras de poder (Grátis, Novo, Exclusivo, Garantido)
3. Criar senso de urgência quando apropriado
4. Destacar benefícios únicos
5. Usar linguagem mais direta e ativa
6. Incluir proof points (anos de mercado, clientes atendidos)

EVITAR:
- Promessas exageradas
- Linguagem genérica
- Repetição de palavras
- Excesso de maiúsculas ou pontuação

Responda SEMPRE em JSON válido com a estrutura especificada.`;

// =============================================================================
// PROMPT PARA ANÁLISE DE IMAGENS
// =============================================================================
export const IMAGE_ANALYSIS_PROMPT = `Você é um especialista em creative para Google Ads Performance Max.
Analise imagens de anúncios e forneça feedback detalhado.

CRITÉRIOS DE ANÁLISE:

1. COMPOSIÇÃO VISUAL:
   - Clareza da mensagem principal
   - Uso de cores e contraste
   - Posicionamento de elementos
   - Espaço para texto overlay

2. ADEQUAÇÃO PARA PMAX:
   - Funciona em diferentes formatos (quadrado, paisagem, retrato)
   - Legível em tamanhos pequenos
   - Destaque do produto/serviço
   - Consistência com a marca

3. CONFORMIDADE GOOGLE ADS:
   - Sem texto excessivo (regra dos 20%)
   - Sem conteúdo sensacional
   - Qualidade mínima de resolução
   - Sem bordas ou frames desnecessários

4. SUGESTÕES DE MELHORIA:
   - Elementos a adicionar/remover
   - Ajustes de cor/contraste
   - Versões alternativas a criar

Forneça uma pontuação de 1-10 e feedback acionável.`;

// =============================================================================
// ESTRUTURAS JSON DE RESPOSTA
// =============================================================================

export const DIAGNOSIS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    overallScore: { type: 'number', description: 'Pontuação geral 0-100' },
    overallStatus: { type: 'string', enum: ['critical', 'needs_attention', 'good', 'excellent'] },
    summary: { type: 'string', description: 'Resumo executivo em 2-3 frases' },
    metrics: {
      type: 'object',
      properties: {
        roas: { type: 'object', properties: { value: {}, status: {}, recommendation: {} } },
        cpa: { type: 'object', properties: { value: {}, status: {}, recommendation: {} } },
        ctr: { type: 'object', properties: { value: {}, status: {}, recommendation: {} } },
        cvr: { type: 'object', properties: { value: {}, status: {}, recommendation: {} } },
        impressionShare: { type: 'object', properties: { value: {}, status: {}, recommendation: {} } },
      }
    },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          category: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          impact: { type: 'string' },
          recommendation: { type: 'string' },
          estimatedImpact: { type: 'string' }
        }
      }
    },
    budgetRecommendation: {
      type: 'object',
      properties: {
        currentBudget: { type: 'number' },
        recommendedBudget: { type: 'number' },
        action: { type: 'string', enum: ['increase', 'decrease', 'maintain'] },
        percentage: { type: 'number' },
        rationale: { type: 'string' }
      }
    },
    assetGroupRecommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          groupName: { type: 'string' },
          issues: { type: 'array' },
          recommendations: { type: 'array' }
        }
      }
    },
    prioritizedActions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'number' },
          action: { type: 'string' },
          expectedImpact: { type: 'string' },
          effort: { type: 'string', enum: ['low', 'medium', 'high'] }
        }
      }
    }
  }
};

export const AD_SUGGESTIONS_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    headlines: {
      type: 'array',
      items: { type: 'string' },
      description: '15 headlines de até 30 caracteres'
    },
    descriptions: {
      type: 'array',
      items: { type: 'string' },
      description: '4 descrições de até 90 caracteres'
    },
    callToActions: {
      type: 'array',
      items: { type: 'string' },
      description: '5 CTAs sugeridos'
    },
    imageIdeas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          concept: { type: 'string' },
          description: { type: 'string' },
          format: { type: 'string' },
          elements: { type: 'array' }
        }
      }
    },
    seasonalSuggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          event: { type: 'string' },
          date: { type: 'string' },
          headlines: { type: 'array' },
          description: { type: 'string' }
        }
      }
    },
    adVariations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          theme: { type: 'string' },
          headline1: { type: 'string' },
          headline2: { type: 'string' },
          headline3: { type: 'string' },
          description1: { type: 'string' },
          description2: { type: 'string' }
        }
      },
      description: '5 variações completas de anúncios'
    }
  }
};

export default {
  CAMPAIGN_DIAGNOSIS_PROMPT,
  AD_GENERATION_PROMPT,
  ASSET_REWRITE_PROMPT,
  IMAGE_ANALYSIS_PROMPT,
  DIAGNOSIS_RESPONSE_SCHEMA,
  AD_SUGGESTIONS_RESPONSE_SCHEMA
};
