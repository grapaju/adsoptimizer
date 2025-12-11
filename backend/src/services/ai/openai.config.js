/**
 * Configuração da OpenAI API
 * 
 * CONFIGURAÇÃO:
 * 1. Crie uma conta em https://platform.openai.com
 * 2. Gere uma API Key em https://platform.openai.com/api-keys
 * 3. Adicione a chave no arquivo .env:
 *    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * 4. Opcionalmente, configure o modelo e outros parâmetros:
 *    OPENAI_MODEL=gpt-4-turbo-preview
 *    OPENAI_MAX_TOKENS=4096
 *    OPENAI_TEMPERATURE=0.7
 * 
 * MODELOS RECOMENDADOS:
 * - gpt-4-turbo-preview: Melhor qualidade, mais caro
 * - gpt-4: Alta qualidade, custo moderado
 * - gpt-3.5-turbo: Boa qualidade, mais barato
 * 
 * CUSTOS APROXIMADOS (por 1M tokens):
 * - gpt-4-turbo: $10 input / $30 output
 * - gpt-4: $30 input / $60 output
 * - gpt-3.5-turbo: $0.50 input / $1.50 output
 */

import OpenAI from 'openai';

// Verificar se a API key está configurada
const hasApiKey = !!process.env.OPENAI_API_KEY;

if (!hasApiKey) {
  console.warn('⚠️ OPENAI_API_KEY não configurada. Funcionalidades de IA estarão desabilitadas.');
}

// Instância do cliente OpenAI (só cria se tiver API key)
export const openai = hasApiKey ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Flag para verificar se IA está disponível
export const isAIEnabled = hasApiKey;

// Configurações padrão
export const config = {
  // Modelo a ser utilizado
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  
  // Máximo de tokens na resposta
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 4096,
  
  // Temperatura (0 = determinístico, 1 = criativo)
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
  
  // Modelo para análise de imagens
  visionModel: 'gpt-4-vision-preview',
  
  // Timeout em ms
  timeout: 60000,
};

/**
 * Verifica se a API OpenAI está configurada e funcionando
 */
export const checkOpenAIConnection = async () => {
  try {
    if (!isAIEnabled || !openai) {
      return { connected: false, error: 'API key não configurada' };
    }
    
    // Teste simples
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5,
    });
    
    return { connected: true, model: config.model };
  } catch (error) {
    return { connected: false, error: error.message };
  }
};

export default openai;
