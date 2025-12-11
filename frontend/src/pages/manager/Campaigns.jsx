import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaignStore } from '../../state/campaignStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { formatCurrency, formatNumber, formatROAS } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { Target, Search, Plus, RefreshCw, MoreVertical } from 'lucide-react';
import { cn, getStatusColor } from '../../utils/helpers';

const ManagerCampaigns = () => {
  const { campaigns, isLoading, pagination, fetchCampaigns } = useCampaignStore();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchCampaigns({ search, status, page: pagination.page, limit: pagination.limit });
  }, [search, status]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (page) => {
    fetchCampaigns({ search, status, page, limit: pagination.limit });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-500">Gerencie todas as campanhas dos seus clientes</p>
        </div>
        
        <Button icon={Plus}>
          Nova Campanha
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar campanhas..."
                value={search}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="paused">Pausadas</option>
            <option value="removed">Removidas</option>
          </select>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Campanha</th>
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Orçamento</th>
                    <th className="pb-3 font-medium text-right">Custo (7d)</th>
                    <th className="pb-3 font-medium text-right">Conversões</th>
                    <th className="pb-3 font-medium text-right">ROAS</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary-50 rounded-lg">
                            <Target className="w-4 h-4 text-primary-600" />
                          </div>
                          <Link 
                            to={`/manager/campaigns/${campaign.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {campaign.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="text-sm text-gray-900">{campaign.client_name}</p>
                        <p className="text-xs text-gray-500">{campaign.client_company}</p>
                      </td>
                      <td className="py-4">
                        <Badge variant={campaign.status === 'active' ? 'success' : 'default'}>
                          {campaign.status === 'active' ? 'Ativa' : campaign.status}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        {formatCurrency(campaign.budget_daily)}/dia
                      </td>
                      <td className="py-4 text-right">
                        {formatCurrency(campaign.metrics_7d?.cost || 0)}
                      </td>
                      <td className="py-4 text-right">
                        {formatNumber(campaign.metrics_7d?.conversions || 0)}
                      </td>
                      <td className="py-4 text-right">
                        <span className={cn(
                          "font-medium",
                          (campaign.metrics_7d?.cost > 0 && campaign.metrics_7d?.conversion_value / campaign.metrics_7d?.cost >= 4) 
                            ? "text-green-600" 
                            : (campaign.metrics_7d?.cost > 0 && campaign.metrics_7d?.conversion_value / campaign.metrics_7d?.cost >= 2) 
                              ? "text-yellow-600" 
                              : "text-red-600"
                        )}>
                          {campaign.metrics_7d?.cost > 0 
                            ? formatROAS(campaign.metrics_7d?.conversion_value / campaign.metrics_7d?.cost)
                            : '-'
                          }
                        </span>
                      </td>
                      <td className="py-4">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {campaigns.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma campanha encontrada
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerCampaigns;
