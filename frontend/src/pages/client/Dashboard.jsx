import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardStore } from '../../state/dashboardStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import MetricsLineChart from '../../components/charts/MetricsLineChart';
import MetricsBarChart from '../../components/charts/MetricsBarChart';
import MetricsDonutChart from '../../components/charts/MetricsDonutChart';
import { formatCurrency, formatNumber, formatROAS, formatCTR } from '../../utils/format';
import { 
  TrendingUp, 
  DollarSign, 
  MousePointerClick,
  Eye,
  ShoppingCart,
  Target,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn, getStatusColor } from '../../utils/helpers';

const ClientDashboard = () => {
  const { clientData, isLoading, fetchClientDashboard, period, setPeriod } = useDashboardStore();
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchClientDashboard(selectedPeriod);
  }, [selectedPeriod]);

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    setPeriod(newPeriod);
  };

  if (isLoading && !clientData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const stats = [
    {
      name: 'Investimento',
      value: formatCurrency(clientData?.summary?.cost || 0),
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Impressões',
      value: formatNumber(clientData?.summary?.impressions || 0),
      icon: Eye,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      name: 'Cliques',
      value: formatNumber(clientData?.summary?.clicks || 0),
      icon: MousePointerClick,
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Conversões',
      value: formatNumber(clientData?.summary?.conversions || 0),
      icon: ShoppingCart,
      color: 'text-yellow-600 bg-yellow-100',
    },
  ];

  const metrics = [
    { name: 'CTR', value: formatCTR(clientData?.summary?.ctr || 0) },
    { name: 'ROAS', value: formatROAS(clientData?.summary?.roas || 0) },
    { name: 'Receita', value: formatCurrency(clientData?.summary?.conversionValue || 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Dashboard</h1>
          <p className="text-gray-500">Acompanhe o desempenho das suas campanhas</p>
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
      {clientData?.unreadAlerts > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800">
              Você tem <strong>{clientData.unreadAlerts}</strong> alertas não lidos
            </span>
          </div>
          <Link to="/client/alerts">
            <Button variant="ghost" size="sm">
              Ver alertas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="flex items-center gap-4">
              <div className={cn("p-3 rounded-lg", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="text-center py-6">
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500 mt-1">{metric.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts - 4 tipos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Linha - Custo */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Custo x Receita</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsLineChart
              data={clientData?.dailyMetrics || []}
              lines={[
                { dataKey: 'cost', name: 'Custo', color: '#3b82f6' },
                { dataKey: 'conversion_value', name: 'Receita', color: '#22c55e' },
              ]}
              height={280}
            />
          </CardContent>
        </Card>

        {/* Gráfico de Linha - Conversões */}
        <Card>
          <CardHeader>
            <CardTitle>Cliques e Conversões</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsLineChart
              data={clientData?.dailyMetrics || []}
              lines={[
                { dataKey: 'clicks', name: 'Cliques', color: '#8b5cf6' },
                { dataKey: 'conversions', name: 'Conversões', color: '#f59e0b' },
              ]}
              height={280}
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
              data={(clientData?.campaigns || []).slice(0, 5).map(c => ({
                name: c.name.substring(0, 12) + (c.name.length > 12 ? '...' : ''),
                ctr: c.ctr || 0
              }))}
              bars={[
                { dataKey: 'ctr', name: 'CTR (%)', color: '#8b5cf6' }
              ]}
              height={250}
            />
          </CardContent>
        </Card>

        {/* Gráfico Donut - ROAS */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Investimento</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsDonutChart
              data={(clientData?.campaigns || []).slice(0, 5).map((c, i) => ({
                name: c.name.substring(0, 15),
                value: c.cost || 0
              }))}
              height={250}
              innerRadius={50}
              outerRadius={90}
              centerLabel={{
                value: formatCurrency(clientData?.summary?.cost || 0),
                label: 'Total Investido'
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Minhas Campanhas</CardTitle>
          <Link to="/client/campaigns">
            <Button variant="ghost" size="sm">
              Ver todas <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientData?.campaigns?.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    <Target className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <Link 
                      to={`/client/campaigns/${campaign.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {campaign.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={campaign.status === 'active' ? 'success' : 'default'}>
                        {campaign.status === 'active' ? 'Ativa' : campaign.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Orçamento: {formatCurrency(campaign.budget_daily)}/dia
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatROAS(campaign.roas)}</p>
                  <p className="text-sm text-gray-500">ROAS</p>
                </div>
              </div>
            ))}

            {(!clientData?.campaigns || clientData.campaigns.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma campanha encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientDashboard;
