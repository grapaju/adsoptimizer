/**
 * Página de Search Terms
 * Lista e analisa termos de busca de campanhas Performance Max
 */
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaignStore } from '../../state/campaignStore';
import { campaignService } from '../../services/campaign.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { 
  ArrowLeft, 
  Search, 
  RefreshCw,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { formatNumber, formatCurrency, formatCTR } from '../../utils/format';
import { cn } from '../../utils/helpers';

const SearchTerms = () => {
  // Estados
  const [searchTerms, setSearchTerms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'impressions', direction: 'desc' });
  const [filters, setFilters] = useState({
    minImpressions: 0,
    minClicks: 0,
    minConversions: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  const { campaignId } = useParams();
  const { currentCampaign, fetchCampaign } = useCampaignStore();

  // Carregar dados iniciais
  useEffect(() => {
    loadSearchTerms();
    if (!currentCampaign || currentCampaign.id !== parseInt(campaignId)) {
      fetchCampaign(campaignId);
    }
  }, [campaignId]);

  // Carregar search terms
  const loadSearchTerms = async () => {
    setIsLoading(true);
    try {
      const response = await campaignService.getSearchTerms(campaignId);
      setSearchTerms(response.searchTerms || []);
    } catch (error) {
      console.error('Erro ao carregar search terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar e ordenar termos
  const filteredAndSortedTerms = useMemo(() => {
    let result = [...searchTerms];

    // Aplicar busca
    if (searchQuery) {
      result = result.filter(term => 
        term.search_term.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Aplicar filtros numéricos
    result = result.filter(term => 
      term.impressions >= filters.minImpressions &&
      term.clicks >= filters.minClicks &&
      term.conversions >= filters.minConversions
    );

    // Ordenar
    result.sort((a, b) => {
      const aValue = a[sortConfig.key] || 0;
      const bValue = b[sortConfig.key] || 0;
      
      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });

    return result;
  }, [searchTerms, searchQuery, filters, sortConfig]);

  // Handler de ordenação
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Renderizar header de coluna ordenável
  const SortableHeader = ({ label, sortKey }) => {
    const isActive = sortConfig.key === sortKey;
    return (
      <button
        onClick={() => handleSort(sortKey)}
        className={cn(
          "flex items-center gap-1 font-medium",
          isActive ? "text-primary-600" : "text-gray-700 hover:text-gray-900"
        )}
      >
        {label}
        {isActive && (
          sortConfig.direction === 'desc' 
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronUp className="w-4 h-4" />
        )}
      </button>
    );
  };

  // Calcular totais
  const totals = useMemo(() => {
    return filteredAndSortedTerms.reduce((acc, term) => ({
      impressions: acc.impressions + (term.impressions || 0),
      clicks: acc.clicks + (term.clicks || 0),
      conversions: acc.conversions + (term.conversions || 0),
      cost: acc.cost + (term.cost || 0),
      conversionValue: acc.conversionValue + (term.conversion_value || 0)
    }), { impressions: 0, clicks: 0, conversions: 0, cost: 0, conversionValue: 0 });
  }, [filteredAndSortedTerms]);

  // Exportar para CSV
  const exportToCSV = () => {
    const headers = ['Termo de Busca', 'Impressões', 'Cliques', 'CTR', 'Custo', 'Conversões', 'Valor Conv.'];
    const rows = filteredAndSortedTerms.map(term => [
      term.search_term,
      term.impressions,
      term.clicks,
      ((term.clicks / term.impressions) * 100).toFixed(2) + '%',
      term.cost,
      term.conversions,
      term.conversion_value
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search_terms_${campaignId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/manager/campaigns/${campaignId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Search Terms</h1>
            <p className="text-gray-500">
              {currentCampaign?.name || 'Campanha'} - {searchTerms.length} termos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={loadSearchTerms} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas resumidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Total Impressões</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(totals.impressions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Total Cliques</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(totals.clicks)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">CTR Médio</p>
            <p className="text-2xl font-bold text-gray-900">
              {totals.impressions > 0 ? formatCTR((totals.clicks / totals.impressions) * 100) : '0%'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Total Conversões</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(totals.conversions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500">Valor Conversões</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.conversionValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de busca e filtros */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar termos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impressões mínimas
                </label>
                <Input
                  type="number"
                  value={filters.minImpressions}
                  onChange={(e) => setFilters(prev => ({ ...prev, minImpressions: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliques mínimos
                </label>
                <Input
                  type="number"
                  value={filters.minClicks}
                  onChange={(e) => setFilters(prev => ({ ...prev, minClicks: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conversões mínimas
                </label>
                <Input
                  type="number"
                  value={filters.minConversions}
                  onChange={(e) => setFilters(prev => ({ ...prev, minConversions: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Search Terms */}
      <Card>
        <CardContent className="p-0">
          {filteredAndSortedTerms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum termo de busca encontrado</p>
              {searchQuery && <p className="text-sm mt-2">Tente ajustar sua busca</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4">
                      <SortableHeader label="Termo de Busca" sortKey="search_term" />
                    </th>
                    <th className="text-right p-4">
                      <SortableHeader label="Impressões" sortKey="impressions" />
                    </th>
                    <th className="text-right p-4">
                      <SortableHeader label="Cliques" sortKey="clicks" />
                    </th>
                    <th className="text-right p-4">
                      <SortableHeader label="CTR" sortKey="ctr" />
                    </th>
                    <th className="text-right p-4">
                      <SortableHeader label="Custo" sortKey="cost" />
                    </th>
                    <th className="text-right p-4">
                      <SortableHeader label="Conv." sortKey="conversions" />
                    </th>
                    <th className="text-right p-4">
                      <SortableHeader label="ROAS" sortKey="roas" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAndSortedTerms.map((term, index) => {
                    const ctr = term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0;
                    const roas = term.cost > 0 ? term.conversion_value / term.cost : 0;
                    
                    return (
                      <tr 
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{term.search_term}</div>
                          {term.match_type && (
                            <span className="text-xs text-gray-500">{term.match_type}</span>
                          )}
                        </td>
                        <td className="p-4 text-right text-gray-700">
                          {formatNumber(term.impressions)}
                        </td>
                        <td className="p-4 text-right text-gray-700">
                          {formatNumber(term.clicks)}
                        </td>
                        <td className="p-4 text-right">
                          <span className={cn(
                            "font-medium",
                            ctr >= 3 ? "text-green-600" : ctr >= 1 ? "text-yellow-600" : "text-gray-600"
                          )}>
                            {formatCTR(ctr)}
                          </span>
                        </td>
                        <td className="p-4 text-right text-gray-700">
                          {formatCurrency(term.cost)}
                        </td>
                        <td className="p-4 text-right">
                          <span className={cn(
                            "font-medium",
                            term.conversions > 0 ? "text-green-600" : "text-gray-600"
                          )}>
                            {formatNumber(term.conversions)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {roas >= 1 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : roas > 0 ? (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            ) : null}
                            <span className={cn(
                              "font-medium",
                              roas >= 3 ? "text-green-600" : roas >= 1 ? "text-yellow-600" : "text-gray-600"
                            )}>
                              {roas.toFixed(2)}x
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rodapé com contagem */}
      <div className="text-center text-sm text-gray-500">
        Exibindo {filteredAndSortedTerms.length} de {searchTerms.length} termos
      </div>
    </div>
  );
};

export default SearchTerms;
