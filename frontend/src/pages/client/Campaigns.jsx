import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCampaignStore } from '../../state/campaignStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatNumber, formatROAS } from '../../utils/format';
import { Target, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/helpers';

const ClientCampaigns = () => {
  const { campaigns, isLoading, fetchCampaigns } = useCampaignStore();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minhas Campanhas</h1>
        <p className="text-gray-500">Acompanhe o desempenho de todas as suas campanhas</p>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-50 rounded-lg">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{campaign.name}</h3>
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

              <div className="grid grid-cols-4 gap-6 text-center lg:text-right">
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(campaign.metrics_7d?.cost || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Custo (7d)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(campaign.metrics_7d?.clicks || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Cliques</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatNumber(campaign.metrics_7d?.conversions || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Conversões</p>
                </div>
                <div>
                  <p className={cn(
                    "text-lg font-bold",
                    (campaign.metrics_7d?.cost > 0 && campaign.metrics_7d?.conversion_value / campaign.metrics_7d?.cost >= 4) 
                      ? "text-green-600" 
                      : "text-gray-900"
                  )}>
                    {campaign.metrics_7d?.cost > 0 
                      ? formatROAS(campaign.metrics_7d?.conversion_value / campaign.metrics_7d?.cost)
                      : '-'
                    }
                  </p>
                  <p className="text-xs text-gray-500">ROAS</p>
                </div>
              </div>

              <Link to={`/client/campaigns/${campaign.id}`}>
                <Button variant="outline" size="sm">
                  Ver detalhes <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}

        {campaigns.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-gray-500">
              Você ainda não tem campanhas. Entre em contato com seu gestor.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientCampaigns;
