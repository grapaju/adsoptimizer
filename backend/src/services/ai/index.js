/**
 * Índice do módulo de IA
 * Exporta todas as funções e configurações do módulo
 */

// Configuração OpenAI
export { openai, config, checkOpenAIConnection } from './openai.config.js';

// Prompts
export {
  CAMPAIGN_DIAGNOSIS_PROMPT,
  AD_GENERATION_PROMPT,
  ASSET_REWRITE_PROMPT,
  IMAGE_ANALYSIS_PROMPT
} from './prompts.js';

// Funções principais de IA do PMax
export {
  generatePmaxRecommendations,
  generateAdSuggestions,
  rewriteLowPerformanceAssets,
  analyzeImage,
  generateAdVariations
} from './pmax.ai.service.js';

// Import para export default
import {
  generatePmaxRecommendations,
  generateAdSuggestions,
  rewriteLowPerformanceAssets,
  analyzeImage,
  generateAdVariations
} from './pmax.ai.service.js';

import { checkOpenAIConnection } from './openai.config.js';

// Export default com todas as funções
export default {
  // Diagnóstico e otimização
  generatePmaxRecommendations,
  
  // Geração de anúncios
  generateAdSuggestions,
  generateAdVariations,
  
  // Otimização de ativos
  rewriteLowPerformanceAssets,
  
  // Análise de imagens
  analyzeImage,
  
  // Utilitários
  checkOpenAIConnection
};
