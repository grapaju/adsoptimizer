import { useEffect, useState } from 'react';
import { useAuthStore } from '../../state/authStore';
import { useCampaignStore } from '../../state/campaignStore';
import { aiService } from '../../services/ai';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { 
  Sparkles, 
  RefreshCw, 
  Check, 
  X, 
  Target,
  TrendingUp,
  Lightbulb,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { formatDateTime } from '../../utils/date';

const AIRecommendations = () => {
  const { user } = useAuthStore();
  const { campaigns, fetchCampaigns } = useCampaignStore();
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [expandedRec, setExpandedRec] = useState(null);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    fetchCampaigns();
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/ai/recommendations');
      setRecommendations(response.data);
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewRecommendations = async (campaignId) => {
    setGenerating(true);
    try {
      const response = await aiService.generateRecommendations(campaignId);
      await loadRecommendations();
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyRecommendation = async (recId) => {
    try {
      await api.post(`/ai/recommendations/${recId}/apply`);
      setRecommendations(prev => 
        prev.map(rec => rec.id === recId ? { ...rec, status: 'applied' } : rec)
      );
    } catch (error) {
      console.error('Erro ao aplicar recomendação:', error);
    }
  };

  const handleRejectRecommendation = async (recId) => {
    try {
      await api.post(`/ai/recommendations/${recId}/reject`);
      setRecommendations(prev => 
        prev.map(rec => rec.id === recId ? { ...rec, status: 'rejected' } : rec)
      );
    } catch (error) {
      console.error('Erro ao rejeitar recomendação:', error);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'budget':
        return <TrendingUp className="w-5 h-5" />;
      case 'targeting':
        return <Target className="w-5 h-5" />;
      case 'creative':
        return <Lightbulb className="w-5 h-5" />;
      case 'bidding':
        return <Zap className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'budget':
        return 'bg-blue-50 text-blue-600';
      case 'targeting':
        return 'bg-purple-50 text-purple-600';
      case 'creative':
        return 'bg-yellow-50 text-yellow-600';
      case 'bidding':
        return 'bg-green-50 text-green-600';
      default:
        return 'bg-gray-50 text-gray-600';
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      budget: 'Orçamento',
      targeting: 'Segmentação',
      creative: 'Criativos',
      bidding: 'Lances',
      general: 'Geral'
    };
    return labels[type] || type;
  };

  const filteredRecommendations = selectedCampaign === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.campaign_id === parseInt(selectedCampaign));

  const pendingCount = recommendations.filter(r => r.status === 'pending').length;
  const appliedCount = recommendations.filter(r => r.status === 'applied').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary-600" />
            Recomendações de IA
          </h1>
          <p className="text-gray-500">
            Otimizações sugeridas pela inteligência artificial
          </p>
        </div>
        
        {isManager && (
          <Button 
            onClick={() => generateNewRecommendations(selectedCampaign !== 'all' ? selectedCampaign : null)}
            disabled={generating}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", generating && "animate-spin")} />
            {generating ? 'Gerando...' : 'Gerar Novas'}
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-gray-900">{recommendations.length}</p>
            <p className="text-sm text-gray-500">Total de Recomendações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-3xl font-bold text-green-600">{appliedCount}</p>
            <p className="text-sm text-gray-500">Aplicadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por Campanha */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Filtrar por campanha:</span>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Todas as campanhas</option>
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Lista de Recomendações */}
      <div className="space-y-4">
        {filteredRecommendations.map((rec) => (
          <Card 
            key={rec.id}
            className={cn(
              "transition-all",
              rec.status === 'applied' && "opacity-60",
              rec.status === 'rejected' && "opacity-40"
            )}
          >
            <CardContent>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-lg",
                  getTypeColor(rec.type)
                )}>
                  {getTypeIcon(rec.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                        <Badge variant={
                          rec.priority === 'high' ? 'danger' :
                          rec.priority === 'medium' ? 'warning' : 'default'
                        }>
                          {rec.priority === 'high' ? 'Alta' :
                           rec.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                        <Badge>{getTypeLabel(rec.type)}</Badge>
                        {rec.status !== 'pending' && (
                          <Badge variant={rec.status === 'applied' ? 'success' : 'default'}>
                            {rec.status === 'applied' ? 'Aplicada' : 'Rejeitada'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {rec.campaign_name} • {formatDateTime(rec.created_at)}
                      </p>
                    </div>

                    {isManager && rec.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleApplyRecommendation(rec.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aplicar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRejectRecommendation(rec.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Ignorar
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Detalhes Expansíveis */}
                  {rec.details && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        {expandedRec === rec.id ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Ocultar detalhes
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Ver detalhes
                          </>
                        )}
                      </button>

                      {expandedRec === rec.id && (
                        <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                          <div className="prose prose-sm max-w-none text-gray-600">
                            <pre className="whitespace-pre-wrap font-sans">
                              {typeof rec.details === 'string' 
                                ? rec.details 
                                : JSON.stringify(rec.details, null, 2)
                              }
                            </pre>
                          </div>
                          {rec.expected_impact && (
                            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                              <p className="text-sm font-medium text-green-800">
                                Impacto Esperado: {rec.expected_impact}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRecommendations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhuma recomendação</h3>
              <p className="text-gray-500 mb-4">
                {selectedCampaign !== 'all' 
                  ? 'Esta campanha não tem recomendações no momento.'
                  : 'Não há recomendações disponíveis.'
                }
              </p>
              {isManager && (
                <Button onClick={() => generateNewRecommendations(selectedCampaign !== 'all' ? selectedCampaign : null)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Recomendações
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;
