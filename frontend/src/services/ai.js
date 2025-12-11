import api from './api';

export const aiService = {
  // ==========================================================================
  // DIAGNÓSTICO E RECOMENDAÇÕES
  // ==========================================================================

  /**
   * Gerar diagnóstico completo de campanha PMax
   * @param {number} campaignId - ID da campanha
   * @param {Object} params - Parâmetros (startDate, endDate)
   */
  getDiagnosis: async (campaignId, params = {}) => {
    const response = await api.get(`/ai/campaigns/${campaignId}/diagnosis`, { params });
    return response.data;
  },

  /**
   * Listar recomendações de uma campanha
   * @param {number} campaignId - ID da campanha
   * @param {Object} params - Filtros (status)
   */
  listRecommendations: async (campaignId, params = {}) => {
    const response = await api.get(`/ai/campaigns/${campaignId}/recommendations`, { params });
    return response.data;
  },

  /**
   * Gerar novas recomendações para campanha (legado)
   * @param {number} campaignId - ID da campanha
   */
  generateRecommendations: async (campaignId) => {
    const response = await api.post(`/ai/campaigns/${campaignId}/recommendations`);
    return response.data;
  },

  /**
   * Aplicar uma recomendação
   * @param {number} recommendationId - ID da recomendação
   */
  applyRecommendation: async (recommendationId) => {
    const response = await api.put(`/ai/recommendations/${recommendationId}/apply`);
    return response.data;
  },

  /**
   * Descartar uma recomendação
   * @param {number} recommendationId - ID da recomendação
   * @param {string} reason - Motivo do descarte
   */
  dismissRecommendation: async (recommendationId, reason = '') => {
    const response = await api.put(`/ai/recommendations/${recommendationId}/dismiss`, { reason });
    return response.data;
  },

  // ==========================================================================
  // GERAÇÃO DE ANÚNCIOS
  // ==========================================================================

  /**
   * Gerar sugestões completas de anúncios
   * @param {Object} data - Dados para geração
   * @param {string} data.product - Descrição do produto
   * @param {string} data.audience - Público-alvo
   * @param {string[]} data.keywords - Palavras-chave
   * @param {string} data.tone - Tom de voz
   * @param {Object} data.brand - Informações da marca
   */
  generateAds: async (data) => {
    const response = await api.post('/ai/generate-ads', data);
    return response.data;
  },

  /**
   * Gerar 5 variações de um anúncio
   * @param {Object} data - Dados para variações
   * @param {Object} data.baseAd - Anúncio base
   * @param {string} data.objective - Objetivo (awareness, consideration, conversion)
   */
  generateVariations: async (data) => {
    const response = await api.post('/ai/generate-variations', data);
    return response.data;
  },

  /**
   * Gerar apenas headlines
   * @param {Object} data - Dados do produto
   */
  generateHeadlines: async (data) => {
    const response = await api.post('/ai/generate-headlines', data);
    return response.data;
  },

  /**
   * Gerar apenas descrições
   * @param {Object} data - Dados do produto
   */
  generateDescriptions: async (data) => {
    const response = await api.post('/ai/generate-descriptions', data);
    return response.data;
  },

  // ==========================================================================
  // ANÁLISE E OTIMIZAÇÃO DE ASSETS
  // ==========================================================================

  /**
   * Analisar assets de uma campanha
   * @param {number} campaignId - ID da campanha
   */
  analyzeAssets: async (campaignId) => {
    const response = await api.post(`/ai/campaigns/${campaignId}/analyze-assets`);
    return response.data;
  },

  /**
   * Reescrever ativos com baixa performance
   * @param {Object} data - Dados para reescrita
   * @param {Array} data.assets - Lista de ativos
   * @param {Object} data.context - Contexto da campanha
   */
  rewriteAssets: async (data) => {
    const response = await api.post('/ai/rewrite-assets', data);
    return response.data;
  },

  /**
   * Analisar imagem para uso em anúncios
   * @param {Object} data - Dados da imagem
   * @param {string} data.imageUrl - URL ou base64 da imagem
   * @param {string} data.productContext - Contexto do produto
   */
  analyzeImage: async (data) => {
    const response = await api.post('/ai/analyze-image', data);
    return response.data;
  },

  /**
   * Analisar imagem via upload (converte para base64 antes de enviar)
   * @param {File} file - Arquivo de imagem
   * @param {string} productContext - Contexto do produto
   */
  analyzeImageFile: async (file, productContext = '') => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const response = await api.post('/ai/analyze-image', {
            imageUrl: reader.result,
            productContext
          });
          resolve(response.data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = error => reject(error);
    });
  },

  // ==========================================================================
  // SUGESTÕES
  // ==========================================================================

  /**
   * Sugerir novos anúncios para campanha
   * @param {number} campaignId - ID da campanha
   */
  suggestAds: async (campaignId) => {
    const response = await api.post(`/ai/campaigns/${campaignId}/suggest-ads`);
    return response.data;
  },

  /**
   * Gerar sugestões de assets para um asset group
   * @param {number} campaignId - ID da campanha
   * @param {number} assetGroupId - ID do asset group
   */
  generateAssetSuggestions: async (campaignId, assetGroupId) => {
    const response = await api.post(`/ai/campaigns/${campaignId}/assets`, { assetGroupId });
    return response.data;
  },

  /**
   * Analisar performance da campanha (legado)
   * @param {number} campaignId - ID da campanha
   */
  analyzePerformance: async (campaignId) => {
    const response = await api.post(`/ai/campaigns/${campaignId}/analyze`);
    return response.data;
  },

  // Alias para manter compatibilidade
  rejectRecommendation: async (recommendationId, reason) => {
    return aiService.dismissRecommendation(recommendationId, reason);
  },
};

export default aiService;
