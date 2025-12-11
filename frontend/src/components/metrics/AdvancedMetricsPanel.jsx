/**
 * Componente de Painel de Métricas Avançadas PMax
 * Exibe Impression Share, Search Impression Share, Perdas por Orçamento/Ranking
 */
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { GaugeMetricCard } from '../charts/MetricsGaugeChart';
import MetricsBarChart from '../charts/MetricsBarChart';
import { AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Painel de Métricas Avançadas Performance Max
 * @param {object} metrics - Métricas avançadas da campanha
 * @param {boolean} isLoading - Estado de carregamento
 */
const AdvancedMetricsPanel = ({ metrics = {}, isLoading = false }) => {
  // Métricas de Impression Share
  const impressionShareMetrics = [
    {
      title: 'Search Impression Share',
      value: metrics.searchImpressionShare || 0,
      description: 'Porcentagem das impressões de pesquisa que você recebeu',
      key: 'searchImpressionShare'
    },
    {
      title: 'Search Top Impression Share',
      value: metrics.searchTopImpressionShare || 0,
      description: 'Impressões exibidas no topo da página de pesquisa',
      key: 'searchTopImpressionShare'
    },
    {
      title: 'Search Absolute Top IS',
      value: metrics.searchAbsoluteTopImpressionShare || 0,
      description: 'Impressões exibidas na primeira posição absoluta',
      key: 'searchAbsoluteTopImpressionShare'
    },
    {
      title: 'Display Impression Share',
      value: metrics.displayImpressionShare || 0,
      description: 'Porcentagem de impressões na Rede de Display',
      key: 'displayImpressionShare'
    }
  ];

  // Métricas de perda de impressão
  const lostImpressionMetrics = [
    {
      title: 'Perdas por Orçamento',
      value: metrics.searchBudgetLostImpressionShare || 0,
      description: 'Impressões perdidas devido a orçamento insuficiente',
      key: 'budgetLoss',
      type: 'negative'
    },
    {
      title: 'Perdas por Ranking',
      value: metrics.searchRankLostImpressionShare || 0,
      description: 'Impressões perdidas devido a baixa qualidade/lance',
      key: 'rankLoss',
      type: 'negative'
    },
    {
      title: 'Display - Perdas Orçamento',
      value: metrics.displayBudgetLostImpressionShare || 0,
      description: 'Impressões display perdidas por orçamento',
      key: 'displayBudgetLoss',
      type: 'negative'
    },
    {
      title: 'Display - Perdas Ranking',
      value: metrics.displayRankLostImpressionShare || 0,
      description: 'Impressões display perdidas por ranking',
      key: 'displayRankLoss',
      type: 'negative'
    }
  ];

  // Dados para gráfico de barras comparativo
  const comparisonData = [
    {
      name: 'Search',
      impressionShare: metrics.searchImpressionShare || 0,
      lostBudget: metrics.searchBudgetLostImpressionShare || 0,
      lostRank: metrics.searchRankLostImpressionShare || 0
    },
    {
      name: 'Display',
      impressionShare: metrics.displayImpressionShare || 0,
      lostBudget: metrics.displayBudgetLostImpressionShare || 0,
      lostRank: metrics.displayRankLostImpressionShare || 0
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Impression Share */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Impression Share (Participação nas Impressões)
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {impressionShareMetrics.map((metric) => (
            <GaugeMetricCard
              key={metric.key}
              title={metric.title}
              value={metric.value}
              description={metric.description}
              thresholds={[40, 70]}
            />
          ))}
        </div>
      </div>

      {/* Perdas de Impressão */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Perdas de Impression Share
          </h3>
          <div className="group relative">
            <Info className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="hidden group-hover:block absolute left-0 top-6 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg z-10">
              Percentuais altos indicam oportunidades perdidas. Valores baixos são ideais.
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lostImpressionMetrics.map((metric) => (
            <Card key={metric.key} className="border-yellow-200 bg-yellow-50/50">
              <CardContent>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className={cn(
                  "text-2xl font-bold",
                  metric.value > 30 ? 'text-red-600' : 
                  metric.value > 10 ? 'text-yellow-600' : 'text-green-600'
                )}>
                  {metric.value.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                
                {/* Barra invertida - menor é melhor */}
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      metric.value > 30 ? 'bg-red-500' : 
                      metric.value > 10 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Gráfico Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Comparação Search vs Display</CardTitle>
        </CardHeader>
        <CardContent>
          <MetricsBarChart
            data={comparisonData}
            bars={[
              { dataKey: 'impressionShare', name: 'Impression Share', color: '#3b82f6' },
              { dataKey: 'lostBudget', name: 'Perdas Orçamento', color: '#f59e0b' },
              { dataKey: 'lostRank', name: 'Perdas Ranking', color: '#ef4444' }
            ]}
            height={250}
          />
        </CardContent>
      </Card>

      {/* Insights Automáticos */}
      <ImpressionShareInsights metrics={metrics} />
    </div>
  );
};

/**
 * Componente de Insights baseados nas métricas
 */
const ImpressionShareInsights = ({ metrics }) => {
  const insights = [];

  // Analisar perdas por orçamento
  const budgetLoss = (metrics.searchBudgetLostImpressionShare || 0) + 
                     (metrics.displayBudgetLostImpressionShare || 0);
  if (budgetLoss > 20) {
    insights.push({
      type: 'warning',
      title: 'Alto percentual de perdas por orçamento',
      message: `Você está perdendo ${budgetLoss.toFixed(1)}% das impressões por orçamento insuficiente. Considere aumentar o budget diário.`,
      icon: AlertTriangle
    });
  }

  // Analisar perdas por ranking
  const rankLoss = (metrics.searchRankLostImpressionShare || 0) + 
                   (metrics.displayRankLostImpressionShare || 0);
  if (rankLoss > 30) {
    insights.push({
      type: 'warning',
      title: 'Perdas por ranking elevadas',
      message: `${rankLoss.toFixed(1)}% das impressões perdidas por baixo ranking. Revise a qualidade dos anúncios e considere ajustar lances.`,
      icon: TrendingDown
    });
  }

  // Impression share baixo
  const avgIS = ((metrics.searchImpressionShare || 0) + (metrics.displayImpressionShare || 0)) / 2;
  if (avgIS < 30) {
    insights.push({
      type: 'info',
      title: 'Impression Share abaixo do ideal',
      message: 'Seu Impression Share médio está baixo. Verifique orçamento, lances e qualidade dos anúncios.',
      icon: Info
    });
  }

  // Top impression share bom
  if (metrics.searchTopImpressionShare > 60) {
    insights.push({
      type: 'success',
      title: 'Boa posição nos resultados',
      message: `${metrics.searchTopImpressionShare.toFixed(1)}% das suas impressões aparecem no topo. Continue mantendo a qualidade!`,
      icon: TrendingUp
    });
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900">Insights e Recomendações</h3>
      {insights.map((insight, index) => (
        <div 
          key={index}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg",
            insight.type === 'warning' && 'bg-yellow-50 border border-yellow-200',
            insight.type === 'info' && 'bg-blue-50 border border-blue-200',
            insight.type === 'success' && 'bg-green-50 border border-green-200'
          )}
        >
          <insight.icon className={cn(
            "w-5 h-5 mt-0.5",
            insight.type === 'warning' && 'text-yellow-600',
            insight.type === 'info' && 'text-blue-600',
            insight.type === 'success' && 'text-green-600'
          )} />
          <div>
            <p className={cn(
              "font-medium",
              insight.type === 'warning' && 'text-yellow-800',
              insight.type === 'info' && 'text-blue-800',
              insight.type === 'success' && 'text-green-800'
            )}>
              {insight.title}
            </p>
            <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdvancedMetricsPanel;
