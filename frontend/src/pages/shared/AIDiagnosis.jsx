/**
 * Página de Diagnóstico de Campanha com IA
 * Análise completa de performance e recomendações detalhadas
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/authStore';
import { aiService } from '../../services/ai';
import { campaignService } from '../../services/campaign.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  Sparkles,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Lightbulb
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { formatCurrency, formatPercent } from '../../utils/format';

const AIDiagnosis = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [campaign, setCampaign] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSection, setExpandedSection] = useState('summary');
  const [dateRange, setDateRange] = useState('30d');
  const [error, setError] = useState(null);

  // Carregar campanha
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const response = await campaignService.getById(campaignId);
        setCampaign(response.data);
      } catch (err) {
        console.error('Erro ao carregar campanha:', err);
        setError('Campanha não encontrada');
      }
    };
    loadCampaign();
  }, [campaignId]);

  // Carregar diagnóstico
  const loadDiagnosis = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const params = {};
      const today = new Date();
      
      if (dateRange === '7d') {
        params.startDate = new Date(today.setDate(today.getDate() - 7)).toISOString();
      } else if (dateRange === '30d') {
        params.startDate = new Date(today.setDate(today.getDate() - 30)).toISOString();
      } else if (dateRange === '90d') {
        params.startDate = new Date(today.setDate(today.getDate() - 90)).toISOString();
      }
      params.endDate = new Date().toISOString();
      
      const response = await aiService.getDiagnosis(campaignId, params);
      setDiagnosis(response.data);
    } catch (err) {
      console.error('Erro ao gerar diagnóstico:', err);
      setError('Erro ao gerar diagnóstico. Tente novamente.');
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (campaign) {
      loadDiagnosis();
    }
  }, [campaign, dateRange]);

  // Score de saúde visual
  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  // Status badge
  const getStatusBadge = (status) => {
    const variants = {
      excellent: { variant: 'success', label: 'Excelente' },
      good: { variant: 'success', label: 'Bom' },
      needs_attention: { variant: 'warning', label: 'Atenção' },
      critical: { variant: 'error', label: 'Crítico' }
    };
    const { variant, label } = variants[status] || { variant: 'default', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Prioridade badge
  const getPriorityBadge = (priority) => {
    const variants = {
      1: { variant: 'error', label: 'Crítica' },
      2: { variant: 'warning', label: 'Alta' },
      3: { variant: 'default', label: 'Média' },
      4: { variant: 'secondary', label: 'Baixa' },
      5: { variant: 'secondary', label: 'Opcional' }
    };
    const { variant, label } = variants[priority] || { variant: 'default', label: `P${priority}` };
    return <Badge variant={variant} size="sm">{label}</Badge>;
  };

  // Copiar diagnóstico
  const copyDiagnosis = () => {
    if (!diagnosis?.diagnosis) return;
    const text = JSON.stringify(diagnosis.diagnosis, null, 2);
    navigator.clipboard.writeText(text);
  };

  // Loading state
  if (isLoading && !diagnosis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Analisando campanha com IA...</p>
          <p className="text-sm text-gray-400 mt-1">Isso pode levar alguns segundos</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !diagnosis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={loadDiagnosis}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const diagnosisData = diagnosis?.diagnosis;
  const healthScore = diagnosis?.diagnosis?.healthScore || diagnosis?.healthScore;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary-600" />
              Diagnóstico de IA
            </h1>
            {campaign && (
              <p className="text-gray-500">{campaign.name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={copyDiagnosis}
            disabled={!diagnosis}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar
          </Button>

          <Button 
            onClick={loadDiagnosis}
            disabled={isGenerating}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isGenerating && "animate-spin")} />
            {isGenerating ? 'Analisando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Health Score Card */}
      {healthScore && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center",
                getHealthScoreBg(healthScore.score)
              )}>
                <div className="text-center">
                  <span className={cn("text-4xl font-bold", getHealthScoreColor(healthScore.score))}>
                    {healthScore.score}
                  </span>
                  <p className="text-xs text-gray-500">de 100</p>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Score de Saúde: {healthScore.rating}
                </h3>
                
                {healthScore.factors?.length > 0 && (
                  <div className="space-y-2">
                    {healthScore.factors.map((factor, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {factor.impact < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        <span className="text-gray-600">{factor.message}</span>
                        <span className={factor.impact < 0 ? 'text-red-500' : 'text-green-500'}>
                          ({factor.impact > 0 ? '+' : ''}{factor.impact})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {diagnosisData?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Resumo Executivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {getStatusBadge(diagnosisData.overallStatus)}
              <p className="text-gray-700 flex-1">{diagnosisData.summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Analysis */}
      {diagnosisData?.metricsAnalysis && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'metrics' ? null : 'metrics')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Análise de Métricas
              </span>
              {expandedSection === 'metrics' ? <ChevronUp /> : <ChevronDown />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'metrics' && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(diagnosisData.metricsAnalysis).map(([key, data]) => (
                  <div key={key} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 uppercase">{key}</span>
                      {getStatusBadge(data.status)}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {key === 'roas' ? `${data.value}x` : 
                       key.includes('ctr') || key.includes('cvr') || key.includes('share') ? `${(data.value * 100).toFixed(2)}%` :
                       formatCurrency(data.value)}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">{data.analysis}</p>
                    {data.recommendation && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-primary-50 rounded text-sm">
                        <Lightbulb className="w-4 h-4 text-primary-600 mt-0.5" />
                        <span className="text-primary-700">{data.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Issues */}
      {diagnosisData?.issues?.length > 0 && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedSection(expandedSection === 'issues' ? null : 'issues')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Problemas Identificados ({diagnosisData.issues.length})
              </span>
              {expandedSection === 'issues' ? <ChevronUp /> : <ChevronDown />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'issues' && (
            <CardContent>
              <div className="space-y-4">
                {diagnosisData.issues.map((issue, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.severity === 'critical' ? 'error' : issue.severity === 'high' ? 'warning' : 'default'}>
                          {issue.severity}
                        </Badge>
                        <Badge variant="secondary">{issue.category}</Badge>
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{issue.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{issue.description}</p>
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="text-red-600">
                        <strong>Impacto:</strong> {issue.impact}
                      </span>
                      <span className="text-green-600">
                        <strong>Recomendação:</strong> {issue.recommendation}
                      </span>
                      {issue.estimatedImpact && (
                        <span className="text-blue-600">
                          <strong>Impacto Esperado:</strong> {issue.estimatedImpact}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Budget Recommendation */}
      {diagnosisData?.budgetRecommendation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Recomendação de Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Orçamento Atual</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(diagnosisData.budgetRecommendation.currentBudget)}
                </p>
              </div>
              <div className="text-center p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-600">Recomendado</p>
                <p className="text-2xl font-bold text-primary-700">
                  {formatCurrency(diagnosisData.budgetRecommendation.recommendedBudget)}
                </p>
                <Badge variant={
                  diagnosisData.budgetRecommendation.action === 'increase' ? 'success' :
                  diagnosisData.budgetRecommendation.action === 'decrease' ? 'error' : 'default'
                }>
                  {diagnosisData.budgetRecommendation.percentageChange > 0 ? '+' : ''}
                  {diagnosisData.budgetRecommendation.percentageChange}%
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Justificativa</p>
                <p className="text-sm text-gray-700">
                  {diagnosisData.budgetRecommendation.rationale}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prioritized Actions */}
      {diagnosisData?.prioritizedActions?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Ações Priorizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diagnosisData.prioritizedActions.map((action, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full font-bold">
                    {action.priority}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{action.action}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Badge variant="secondary" size="sm">{action.category}</Badge>
                      <span>•</span>
                      <span>Esforço: {action.effort}</span>
                      <span>•</span>
                      <span>{action.timeframe}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-green-600">
                      {action.expectedImpact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seasonal Events */}
      {diagnosis?.seasonalEvents?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-600" />
              Oportunidades Sazonais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {diagnosis.seasonalEvents.map((event, idx) => (
                <div key={idx} className="p-4 border rounded-lg text-center">
                  <p className="font-semibold text-gray-900">{event.name}</p>
                  <Badge variant={event.urgency === 'alta' ? 'error' : 'warning'} className="mt-2">
                    Urgência: {event.urgency}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Info */}
      {diagnosisData?.generatedAt && (
        <p className="text-sm text-gray-400 text-center">
          Diagnóstico gerado em {new Date(diagnosisData.generatedAt).toLocaleString('pt-BR')} 
          {diagnosisData.model && ` • Modelo: ${diagnosisData.model}`}
          {diagnosisData.tokensUsed && ` • Tokens: ${diagnosisData.tokensUsed.total}`}
        </p>
      )}
    </div>
  );
};

export default AIDiagnosis;
