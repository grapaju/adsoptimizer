/**
 * Arquivo índice para serviços Google Ads
 * Exporta todos os serviços de forma centralizada
 */

const googleAdsAuthService = require('./googleAdsAuth.service');
const googleAdsQueryService = require('./googleAdsQuery.service');
const googleAdsMetricsService = require('./googleAdsMetrics.service');

module.exports = {
  googleAdsAuthService,
  googleAdsQueryService,
  googleAdsMetricsService,
};
