/**
 * GoogleAdsAuthService - Serviço de autenticação com Google Ads API
 * 
 * Gerencia autenticação OAuth2, refresh de tokens e credenciais
 * 
 * CONFIGURAÇÃO NECESSÁRIA:
 * 1. Criar projeto no Google Cloud Console (https://console.cloud.google.com)
 * 2. Ativar a Google Ads API
 * 3. Criar credenciais OAuth2 (Desktop App ou Web Application)
 * 4. Obter Developer Token na conta Google Ads (Ferramentas > Centro de API)
 * 5. Configurar as variáveis de ambiente no .env
 */

import { GoogleAdsApi } from 'google-ads-api';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../lib/prisma.js';

class GoogleAdsAuthService {
  constructor() {
    // Cliente OAuth2 para gerenciamento de tokens
    this.oauth2Client = null;
    
    // Instâncias do cliente Google Ads por customerId
    this.clientInstances = new Map();
    
    // Inicializar OAuth2 client
    this._initOAuth2Client();
  }

  /**
   * Inicializa o cliente OAuth2 com as credenciais do ambiente
   * @private
   */
  _initOAuth2Client() {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI || 'http://localhost:3001/api/google-ads/callback';

    if (!clientId || !clientSecret) {
      console.warn('⚠️ Google Ads OAuth2 credentials não configuradas');
      return;
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  /**
   * Gera URL para autorização OAuth2
   * O usuário deve acessar esta URL para autorizar o acesso à conta Google Ads
   * 
   * @param {string} state - Estado para validação (pode ser o userId)
   * @returns {string} - URL de autorização
   */
  generateAuthUrl(state = '') {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client não inicializado. Verifique as credenciais.');
    }

    const scopes = ['https://www.googleapis.com/auth/adwords'];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Necessário para obter refresh_token
      prompt: 'consent', // Força exibição do consentimento para obter refresh_token
      scope: scopes,
      state: state,
    });
  }

  /**
   * Troca o código de autorização por tokens de acesso
   * Chamado após o callback do OAuth2
   * 
   * @param {string} code - Código de autorização retornado pelo Google
   * @returns {object} - Tokens (access_token, refresh_token, expiry_date)
   */
  async exchangeCodeForTokens(code) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client não inicializado');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // Armazenar tokens no cliente OAuth2
      this.oauth2Client.setCredentials(tokens);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
      };
    } catch (error) {
      console.error('Erro ao trocar código por tokens:', error);
      throw new Error('Falha na autenticação OAuth2: ' + error.message);
    }
  }

  /**
   * Atualiza o access_token usando o refresh_token
   * 
   * @param {string} refreshToken - Refresh token armazenado
   * @returns {object} - Novo access_token e expiry_date
   */
  async refreshAccessToken(refreshToken) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client não inicializado');
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        accessToken: credentials.access_token,
        expiryDate: credentials.expiry_date,
      };
    } catch (error) {
      console.error('Erro ao atualizar access token:', error);
      throw new Error('Falha ao atualizar token: ' + error.message);
    }
  }

  /**
   * Salva as credenciais OAuth2 no banco de dados para um cliente
   * 
   * @param {string} clientId - ID do cliente no sistema
   * @param {object} tokens - Objeto com os tokens
   * @param {string} googleAdsCustomerId - ID da conta Google Ads (formato: XXX-XXX-XXXX)
   */
  async saveClientCredentials(clientId, tokens, googleAdsCustomerId) {
    try {
      await prisma.client.update({
        where: { id: parseInt(clientId) },
        data: {
          googleAdsId: googleAdsCustomerId,
          googleAdsRefreshToken: tokens.refreshToken,
          googleAdsTokenExpiry: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
        },
      });

      console.log(`✅ Credenciais salvas para cliente ${clientId}`);
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      throw error;
    }
  }

  /**
   * Obtém as credenciais OAuth2 de um cliente do banco de dados
   * 
   * @param {string} clientId - ID do cliente no sistema
   * @returns {object} - Credenciais do cliente
   */
  async getClientCredentials(clientId) {
    try {
      const client = await prisma.client.findUnique({
        where: { id: parseInt(clientId) },
        select: {
          googleAdsId: true,
          googleAdsRefreshToken: true,
          googleAdsTokenExpiry: true,
        },
      });

      if (!client) {
        throw new Error('Cliente não encontrado');
      }

      if (!client.googleAdsRefreshToken) {
        throw new Error('Cliente não possui credenciais Google Ads configuradas');
      }

      return {
        customerId: client.googleAdsId,
        refreshToken: client.googleAdsRefreshToken,
        tokenExpiry: client.googleAdsTokenExpiry,
      };
    } catch (error) {
      console.error('Erro ao obter credenciais:', error);
      throw error;
    }
  }

  /**
   * Cria uma instância autenticada do cliente Google Ads API
   * 
   * @param {string} customerId - ID da conta Google Ads (formato: 1234567890 sem hífens)
   * @param {string} refreshToken - Refresh token do OAuth2
   * @returns {object} - Cliente Google Ads autenticado
   */
  getGoogleAdsClient(customerId, refreshToken = null) {
    // Usar refresh token do ambiente se não fornecido
    const token = refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;
    
    if (!token) {
      throw new Error('Refresh token não configurado');
    }

    // Verificar se já existe instância em cache
    const cacheKey = `${customerId}_${token.substring(0, 10)}`;
    if (this.clientInstances.has(cacheKey)) {
      return this.clientInstances.get(cacheKey);
    }

    // Criar nova instância
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    // Criar customer com refresh token
    const customer = client.Customer({
      customer_id: customerId.replace(/-/g, ''), // Remove hífens se houver
      refresh_token: token,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, ''),
    });

    // Cachear instância
    this.clientInstances.set(cacheKey, customer);

    return customer;
  }

  /**
   * Obtém cliente Google Ads autenticado para um cliente do sistema
   * Busca as credenciais do banco e cria a instância
   * 
   * @param {string} clientId - ID do cliente no sistema
   * @returns {object} - Cliente Google Ads autenticado
   */
  async getClientGoogleAds(clientId) {
    const credentials = await this.getClientCredentials(clientId);
    return this.getGoogleAdsClient(credentials.customerId, credentials.refreshToken);
  }

  /**
   * Verifica se as credenciais do cliente são válidas
   * Faz uma requisição simples para testar a autenticação
   * 
   * @param {string} clientId - ID do cliente no sistema
   * @returns {boolean} - true se as credenciais são válidas
   */
  async validateCredentials(clientId) {
    try {
      const customer = await this.getClientGoogleAds(clientId);
      
      // Fazer query simples para validar
      await customer.query(`
        SELECT customer.id, customer.descriptive_name
        FROM customer
        LIMIT 1
      `);

      return true;
    } catch (error) {
      console.error('Credenciais inválidas:', error.message);
      return false;
    }
  }

  /**
   * Lista todas as contas Google Ads acessíveis com as credenciais
   * Útil para o usuário selecionar qual conta conectar
   * 
   * @param {string} refreshToken - Refresh token do OAuth2
   * @returns {array} - Lista de contas acessíveis
   */
  async listAccessibleAccounts(refreshToken) {
    try {
      const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
      });

      // Usar login_customer_id se for conta MCC
      const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '');
      
      const customer = client.Customer({
        customer_id: loginCustomerId,
        refresh_token: refreshToken,
        login_customer_id: loginCustomerId,
      });

      // Buscar contas acessíveis
      const accounts = await customer.query(`
        SELECT
          customer_client.id,
          customer_client.descriptive_name,
          customer_client.currency_code,
          customer_client.time_zone,
          customer_client.manager,
          customer_client.status
        FROM customer_client
        WHERE customer_client.status = 'ENABLED'
      `);

      return accounts.map(row => ({
        id: row.customer_client.id,
        name: row.customer_client.descriptive_name,
        currency: row.customer_client.currency_code,
        timezone: row.customer_client.time_zone,
        isManager: row.customer_client.manager,
        formattedId: this._formatCustomerId(row.customer_client.id),
      }));
    } catch (error) {
      console.error('Erro ao listar contas:', error);
      throw new Error('Falha ao listar contas Google Ads: ' + error.message);
    }
  }

  /**
   * Formata o Customer ID para o formato XXX-XXX-XXXX
   * @private
   * @param {string} customerId - ID sem formatação
   * @returns {string} - ID formatado
   */
  _formatCustomerId(customerId) {
    const id = String(customerId).replace(/\D/g, '');
    return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6, 10)}`;
  }

  /**
   * Remove o cliente do cache
   * Útil quando as credenciais são atualizadas
   * 
   * @param {string} customerId - ID da conta Google Ads
   */
  clearClientCache(customerId) {
    for (const [key] of this.clientInstances) {
      if (key.startsWith(customerId)) {
        this.clientInstances.delete(key);
      }
    }
  }
}

// Exportar instância singleton
export default new GoogleAdsAuthService();
