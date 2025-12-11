/**
 * GoogleAdsController - Controller para endpoints da Google Ads API
 * 
 * Endpoints para autenticação OAuth2, busca de métricas e dados de campanhas
 */

import {
  googleAdsAuthService,
  googleAdsQueryService,
  googleAdsMetricsService,
} from '../services/googleAds/index.js';
import prisma from '../lib/prisma.js';

class GoogleAdsController {
  // ==========================================================================
  // ENDPOINTS DE AUTENTICAÇÃO OAUTH2
  // ==========================================================================

  /**
   * GET /api/google-ads/auth/url
   * Gera URL para autorização OAuth2
   * O usuário deve acessar esta URL para autorizar o acesso à conta Google Ads
   */
  async getAuthUrl(req, res, next) {
    try {
      const { clientId } = req.query;
      
      // Usar clientId ou odId do usuário como state
      const state = clientId || req.userId;
      const authUrl = googleAdsAuthService.generateAuthUrl(state);

      res.json({
        success: true,
        data: {
          authUrl,
          message: 'Acesse a URL para autorizar o acesso ao Google Ads',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/auth/callback
   * Callback do OAuth2 após autorização do usuário
   * Troca o código de autorização por tokens de acesso
   */
  async authCallback(req, res, next) {
    try {
      const { code, state, error } = req.query;

      // Verificar se houve erro na autorização
      if (error) {
        return res.status(400).json({
          success: false,
          error: `Erro na autorização: ${error}`,
        });
      }

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Código de autorização não fornecido',
        });
      }

      // Trocar código por tokens
      const tokens = await googleAdsAuthService.exchangeCodeForTokens(code);

      // Retornar o refresh token para o usuário copiar
      // A listagem de contas requer um MCC ID válido configurado
      res.json({
        success: true,
        data: {
          refreshToken: tokens.refreshToken,
          expiryDate: tokens.expiryDate,
          state,
          message: 'Autorização concluída! Copie o refreshToken acima e adicione no seu arquivo .env como GOOGLE_ADS_REFRESH_TOKEN',
          instructions: [
            '1. Copie o refreshToken acima',
            '2. Adicione no seu .env: GOOGLE_ADS_REFRESH_TOKEN=seu_token_aqui',
            '3. Reinicie o servidor backend',
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/google-ads/auth/connect
   * Conecta uma conta Google Ads a um cliente do sistema
   */
  async connectAccount(req, res, next) {
    try {
      const { clientId, googleAdsCustomerId, refreshToken } = req.body;

      if (!clientId || !googleAdsCustomerId || !refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'clientId, googleAdsCustomerId e refreshToken são obrigatórios',
        });
      }

      // Verificar permissão (apenas gestor do cliente pode conectar)
      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          error: 'Cliente não encontrado',
        });
      }

      if (req.user.role === 'MANAGER' && client.managerId !== req.userId) {
        return res.status(403).json({
          success: false,
          error: 'Sem permissão para conectar esta conta',
        });
      }

      // Salvar credenciais
      await googleAdsAuthService.saveClientCredentials(
        clientId,
        { refreshToken },
        googleAdsCustomerId
      );

      // Validar conexão
      const isValid = await googleAdsAuthService.validateCredentials(clientId);

      res.json({
        success: true,
        data: {
          connected: isValid,
          googleAdsCustomerId,
          message: isValid ? 'Conta conectada com sucesso' : 'Conta conectada, mas as credenciais parecem inválidas',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/google-ads/auth/validate
   * Valida se as credenciais de um cliente são válidas
   */
  async validateCredentials(req, res, next) {
    try {
      const { clientId } = req.body;

      if (!clientId) {
        return res.status(400).json({
          success: false,
          error: 'clientId é obrigatório',
        });
      }

      const isValid = await googleAdsAuthService.validateCredentials(clientId);

      res.json({
        success: true,
        data: {
          valid: isValid,
          message: isValid ? 'Credenciais válidas' : 'Credenciais inválidas ou expiradas',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/accounts
   * Lista contas Google Ads acessíveis com as credenciais do ambiente
   */
  async listAccounts(req, res, next) {
    try {
      const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token não configurado no ambiente',
        });
      }

      const accounts = await googleAdsAuthService.listAccessibleAccounts(refreshToken);

      res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // ENDPOINTS DE CAMPANHAS
  // ==========================================================================

  /**
   * GET /api/google-ads/campaigns
   * Lista campanhas Performance Max de uma conta
   */
  async listCampaigns(req, res, next) {
    try {
      const { customerId, status } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const campaigns = await googleAdsQueryService.getPerformanceMaxCampaigns(
        customerId,
        { status }
      );

      res.json({
        success: true,
        data: campaigns,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // ENDPOINTS DE MÉTRICAS
  // ==========================================================================

  /**
   * GET /api/google-ads/metrics/campaign/:campaignId
   * Busca métricas gerais de uma campanha
   */
  async getCampaignMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getCampaignMetrics(
        customerId,
        campaignId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/metrics/campaign/:campaignId/advanced
   * Busca métricas avançadas (impression share, etc)
   */
  async getAdvancedMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getAdvancedMetrics(
        customerId,
        campaignId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/metrics/campaign/:campaignId/daily
   * Busca métricas diárias para gráficos
   */
  async getDailyMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getDailyMetrics(
        customerId,
        campaignId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/metrics/campaign/:campaignId/all
   * Busca todas as métricas de uma campanha (dashboard)
   */
  async getAllMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getAllCampaignMetrics(
        customerId,
        campaignId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/metrics/campaign/:campaignId/compare
   * Compara métricas entre dois períodos
   */
  async compareMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, currentStart, currentEnd, previousStart, previousEnd } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const comparison = await googleAdsMetricsService.compareMetrics(
        customerId,
        campaignId,
        { currentStart, currentEnd, previousStart, previousEnd }
      );

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // ENDPOINTS DE ASSET GROUPS
  // ==========================================================================

  /**
   * GET /api/google-ads/campaigns/:campaignId/asset-groups
   * Lista Asset Groups de uma campanha
   */
  async getAssetGroups(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const assetGroups = await googleAdsQueryService.getAssetGroups(
        customerId,
        campaignId
      );

      res.json({
        success: true,
        data: assetGroups,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/campaigns/:campaignId/asset-groups/metrics
   * Busca métricas de Asset Groups
   */
  async getAssetGroupMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getAssetGroupMetrics(
        customerId,
        campaignId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/asset-groups/:assetGroupId/assets
   * Lista Assets de um Asset Group
   */
  async getAssets(req, res, next) {
    try {
      const { assetGroupId } = req.params;
      const { customerId } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const assets = await googleAdsQueryService.getAssetGroupAssets(
        customerId,
        assetGroupId
      );

      res.json({
        success: true,
        data: assets,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/asset-groups/:assetGroupId/metrics
   * Busca métricas de Assets individuais
   */
  async getAssetMetrics(req, res, next) {
    try {
      const { assetGroupId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getAssetMetrics(
        customerId,
        assetGroupId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // ENDPOINTS DE LISTING GROUPS
  // ==========================================================================

  /**
   * GET /api/google-ads/campaigns/:campaignId/listing-groups
   * Lista Listing Groups de uma campanha
   */
  async getListingGroups(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const listingGroups = await googleAdsQueryService.getListingGroups(
        customerId,
        campaignId
      );

      res.json({
        success: true,
        data: listingGroups,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/campaigns/:campaignId/listing-groups/metrics
   * Busca métricas de Listing Groups
   */
  async getListingGroupMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getListingGroupMetrics(
        customerId,
        campaignId,
        { startDate, endDate }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // ENDPOINTS DE SEARCH TERMS
  // ==========================================================================

  /**
   * GET /api/google-ads/campaigns/:campaignId/search-terms
   * Lista termos de pesquisa de uma campanha
   */
  async getSearchTerms(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate, limit } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const searchTerms = await googleAdsQueryService.getSearchTerms(
        customerId,
        campaignId,
        { startDate, endDate, limit: limit ? parseInt(limit) : 100 }
      );

      res.json({
        success: true,
        data: searchTerms,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/google-ads/campaigns/:campaignId/search-terms/metrics
   * Busca métricas detalhadas de termos de pesquisa
   */
  async getSearchTermMetrics(req, res, next) {
    try {
      const { campaignId } = req.params;
      const { customerId, startDate, endDate, limit } = req.query;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'customerId é obrigatório',
        });
      }

      const metrics = await googleAdsMetricsService.getSearchTermMetrics(
        customerId,
        campaignId,
        { startDate, endDate, limit: limit ? parseInt(limit) : 100 }
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // UTILITÁRIOS
  // ==========================================================================

  /**
   * POST /api/google-ads/cache/clear
   * Limpa o cache de queries
   */
  async clearCache(req, res, next) {
    try {
      const { customerId } = req.body;

      googleAdsQueryService.clearCache(customerId);

      if (customerId) {
        googleAdsAuthService.clearClientCache(customerId);
      }

      res.json({
        success: true,
        message: customerId ? 
          `Cache limpo para conta ${customerId}` : 
          'Cache global limpo',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new GoogleAdsController();
