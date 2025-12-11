import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCampaignStore } from '../../state/campaignStore';
import { useAuthStore } from '../../state/authStore';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import MetricsLineChart from '../../components/charts/MetricsLineChart';
import MetricsBarChart from '../../components/charts/MetricsBarChart';
import { formatCurrency, formatNumber, formatPercent, formatROAS } from '../../utils/format';
import { formatDate, formatDateTime } from '../../utils/date';
import { 
  ArrowLeft, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  MousePointerClick,
  Eye,
  ShoppingCart,
  Percent,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Sparkles,
  Calendar,
  Image,
  Search,
  Grid,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const CampaignDetail = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentCampaign, 
    metrics, 
    isLoading, 
    fetchCampaignDetails,
    fetchCampaignMetrics,
    syncCampaign 
  } = useCampaignStore();
  
  const [dateRange, setDateRange] = useState('7d');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (campaignId) {
      fetchCampaignDetails(campaignId);
      fetchCampaignMetrics(campaignId, { range: dateRange });
    }
  }, [campaignId, dateRange]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncCampaign(campaignId);
      await fetchCampaignDetails(campaignId);
      await fetchCampaignMetrics(campaignId, { range: dateRange });
    } finally {
      setSyncing(false);
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const response = await api.get(`/ai/recommendations/${campaignId}`);
      setRecommendations(response.data);
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    if (campaignId) {
      loadRecommendations();
    }
  }, [campaignId]);

  if (isLoading || !currentCampaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const campaign = currentCampaign;
  const summary = metrics?.summary || {};

  // Métricas principais
  const mainMetrics = [
    {
      label: 'Custo Total',
      value: formatCurrency(summary.cost || 0),
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      label: 'Impressões',
      value: formatNumber(summary.impressions || 0),
      icon: Eye,
      color: 'text-purple-600 bg-purple-50'
    },
    {
      label: 'Cliques',
      value: formatNumber(summary.clicks || 0),
      icon: MousePointerClick,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: 'CTR',
      value: formatPercent(summary.ctr || 0),
      icon: Percent,
      color: 'text-yellow-600 bg-yellow-50'
    },
    {
      label: 'Conversões',
      value: formatNumber(summary.conversions || 0),
      icon: ShoppingCart,
      color: 'text-indigo-600 bg-indigo-50'
    },
    {
      label: 'ROAS',
      value: formatROAS(summary.roas || 0),
      icon: TrendingUp,
      color: summary.roas >= 4 ? 'text-green-600 bg-green-50' : 
             summary.roas >= 2 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <Badge variant={campaign.status === 'active' ? 'success' : 'default'}>
                {campaign.status === 'active' ? 'Ativa' : campaign.status}
              </Badge>
            </div>
            <p className="text-gray-500">
              Orçamento: {formatCurrency(campaign.budget_daily)}/dia • 
              Última atualização: {formatDateTime(campaign.updated_at)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
            Sincronizar
          </Button>
          {isManager && (
            <>
              <Button variant="outline">
                {campaign.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Ativar
                  </>
                )}
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Período:</span>
          <div className="flex gap-2">
            {[
              { value: '7d', label: '7 dias' },
              { value: '14d', label: '14 dias' },
              { value: '30d', label: '30 dias' },
              { value: '90d', label: '90 dias' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  dateRange === option.value
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {mainMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="text-center">
                <div className={cn("inline-flex p-2 rounded-lg mb-2", metric.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-sm text-gray-500">{metric.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Métricas</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsLineChart 
              data={metrics?.daily || []} 
              metrics={['cost', 'conversion_value']}
              height={300}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cliques e Conversões</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsBarChart 
              data={metrics?.daily || []} 
              metrics={['clicks', 'conversions']}
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* Links para páginas PMax */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to={`${window.location.pathname}/asset-groups`}>
          <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Image className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Asset Groups</h3>
                  <p className="text-sm text-gray-500">Gerencie imagens, vídeos e textos</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>

        <Link to={`${window.location.pathname}/search-terms`}>
          <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Search className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Search Terms</h3>
                  <p className="text-sm text-gray-500">Analise termos de busca</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>

        <Link to={`${window.location.pathname}/listing-groups`}>
          <Card className="hover:border-primary-300 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Grid className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Listing Groups</h3>
                  <p className="text-sm text-gray-500">Performance por produto/categoria</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recomendações de IA */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            Recomendações de IA
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadRecommendations}
            disabled={loadingRecs}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loadingRecs && "animate-spin")} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loadingRecs ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div 
                  key={rec.id || index}
                  className="p-4 bg-gray-50 rounded-lg border-l-4 border-primary-500"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      {rec.expected_impact && (
                        <p className="text-sm text-green-600 mt-2">
                          Impacto esperado: {rec.expected_impact}
                        </p>
                      )}
                    </div>
                    {isManager && (
                      <div className="flex gap-2">
                        <Button size="sm">Aplicar</Button>
                        <Button variant="outline" size="sm">Ignorar</Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>Nenhuma recomendação disponível no momento.</p>
              <p className="text-sm">A IA analisará os dados e gerará sugestões em breve.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações da Campanha */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">ID da Campanha</dt>
                <dd className="font-medium">{campaign.google_campaign_id || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipo</dt>
                <dd className="font-medium">Performance Max</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Orçamento Diário</dt>
                <dd className="font-medium">{formatCurrency(campaign.budget_daily)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">ROAS Alvo</dt>
                <dd className="font-medium">{campaign.target_roas ? `${campaign.target_roas}x` : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Criada em</dt>
                <dd className="font-medium">{formatDate(campaign.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-500">CPC Médio</dt>
                <dd className="font-medium">{formatCurrency(summary.cpc || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">CPM</dt>
                <dd className="font-medium">{formatCurrency(summary.cpm || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Custo por Conversão</dt>
                <dd className="font-medium">{formatCurrency(summary.cost_per_conversion || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Valor de Conversão</dt>
                <dd className="font-medium text-green-600">{formatCurrency(summary.conversion_value || 0)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Lucro Estimado</dt>
                <dd className={cn(
                  "font-medium",
                  (summary.conversion_value - summary.cost) > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency((summary.conversion_value || 0) - (summary.cost || 0))}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignDetail;
