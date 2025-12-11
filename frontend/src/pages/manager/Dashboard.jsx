import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../../state/dashboardStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MetricsLineChart from '../../components/charts/MetricsLineChart';
import MetricsBarChart from '../../components/charts/MetricsBarChart';
import MetricsDonutChart from '../../components/charts/MetricsDonutChart';
import { formatCurrency, formatNumber, formatROAS, formatCTR } from '../../utils/format';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  DollarSign, 
  MousePointerClick,
  Eye,
  ShoppingCart,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const ManagerDashboard = () => {
  const { managerData, isLoading, fetchManagerDashboard, period, setPeriod } = useDashboardStore();
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchManagerDashboard(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    setPeriod(newPeriod);
  };

  if (isLoading && !managerData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const stats = [
    {
      name: 'Total de Clientes',
      value: managerData?.counts?.total_clients || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Campanhas Ativas',
      value: `${managerData?.counts?.active_campaigns || 0} / ${managerData?.counts?.total_campaigns || 0}`,
      icon: Target,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Investimento Total',
      value: formatCurrency(managerData?.summary?.cost || 0),
      icon: DollarSign,
      color: 'text-yellow-600 bg-yellow-100',
    },
    {
      name: 'ROAS Médio',
      value: formatROAS(managerData?.summary?.roas || 0),
      icon: TrendingUp,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  const performanceCards = [
    {
      name: 'Impressões',
      value: formatNumber(managerData?.summary?.impressions || 0),
      icon: Eye,
    },
    {
      name: 'Cliques',
      value: formatNumber(managerData?.summary?.clicks || 0),
      icon: MousePointerClick,
    },
    {
      name: 'CTR',
      value: formatCTR(managerData?.summary?.ctr || 0),
      icon: TrendingUp,
    },
    {
      name: 'Conversões',
      value: formatNumber(managerData?.summary?.conversions || 0),
      icon: ShoppingCart,
    },
    {
      name: 'Valor de Conversão',
      value: formatCurrency(managerData?.summary?.conversionValue || 0),
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard do Gestor</h1>
          <p className="text-gray-500">Visão geral de todas as campanhas</p>
        </div>
        
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <Button
              key={p}
              variant={selectedPeriod === p ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handlePeriodChange(p)}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </Button>
          ))}
        </div>
      </div>

      {/* Alertas */}
      {managerData?.unreadAlerts > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800">
              Você tem <strong>{managerData.unreadAlerts}</strong> alertas não lidos
            </span>
          </div>
          <Link to="/manager/alerts">
            <Button variant="ghost" size="sm">
              Ver alertas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {performanceCards.map((card) => (
          <Card key={card.name}>
            <CardContent className="text-center py-4">
              <card.icon className="w-5 h-5 mx-auto text-gray-400 mb-2" />
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts - 4 tipos conforme especificado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Custo ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Custo</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsLineChart
              data={managerData?.dailyMetrics || []}
              lines={[
                { dataKey: 'cost', name: 'Custo', color: '#3b82f6' },
                { dataKey: 'conversion_value', name: 'Receita', color: '#22c55e' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Gráfico de Linha - Conversões ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Conversões</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsLineChart
              data={managerData?.dailyMetrics || []}
              lines={[
                { dataKey: 'conversions', name: 'Conversões', color: '#f59e0b' },
                { dataKey: 'clicks', name: 'Cliques', color: '#8b5cf6' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Gráfico de Barras - CTR por campanha */}
        <Card>
          <CardHeader>
            <CardTitle>CTR por Campanha</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsBarChart
              data={(managerData?.topCampaigns || []).slice(0, 5).map(c => ({
                name: c.name.substring(0, 15) + (c.name.length > 15 ? '...' : ''),
                ctr: c.ctr || 0,
                conversions: c.conversions || 0
              }))}
              bars={[
                { dataKey: 'ctr', name: 'CTR (%)', color: '#8b5cf6' }
              ]}
              height={250}
            />
          </CardContent>
        </Card>

        {/* Gráfico Donut - ROAS por status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsDonutChart
              data={[
                { name: 'ROAS > 4x (Excelente)', value: managerData?.roasDistribution?.excellent || 0, color: '#22c55e' },
                { name: 'ROAS 2-4x (Bom)', value: managerData?.roasDistribution?.good || 0, color: '#f59e0b' },
                { name: 'ROAS 1-2x (Regular)', value: managerData?.roasDistribution?.average || 0, color: '#3b82f6' },
                { name: 'ROAS < 1x (Ruim)', value: managerData?.roasDistribution?.poor || 0, color: '#ef4444' },
              ].filter(d => d.value > 0)}
              height={250}
              innerRadius={50}
              outerRadius={90}
              centerLabel={{
                value: formatROAS(managerData?.summary?.roas || 0),
                label: 'ROAS Médio'
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Campanhas por ROAS</CardTitle>
          <Link to="/manager/campaigns">
            <Button variant="ghost" size="sm">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Campanha</th>
                  <th className="pb-3 font-medium">Cliente</th>
                  <th className="pb-3 font-medium text-right">Custo</th>
                  <th className="pb-3 font-medium text-right">Conversões</th>
                  <th className="pb-3 font-medium text-right">Receita</th>
                  <th className="pb-3 font-medium text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {managerData?.topCampaigns?.map((campaign) => (
                  <tr key={campaign.id} className="border-b last:border-0">
                    <td className="py-3">
                      <Link to={`/manager/campaigns/${campaign.id}`} className="text-primary-600 hover:underline font-medium">
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-600">{campaign.client_company}</td>
                    <td className="py-3 text-right">{formatCurrency(campaign.cost)}</td>
                    <td className="py-3 text-right">{formatNumber(campaign.conversions)}</td>
                    <td className="py-3 text-right">{formatCurrency(campaign.conversion_value)}</td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        "font-medium",
                        parseFloat(campaign.roas) >= 4 ? "text-green-600" : 
                        parseFloat(campaign.roas) >= 2 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {formatROAS(campaign.roas)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
