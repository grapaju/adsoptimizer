/**
 * Página de Listing Groups (Grupos de Listagem)
 * Exibe performance de produtos/categorias em campanhas Performance Max
 */
import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaignStore } from '../../state/campaignStore';
import { campaignService } from '../../services/campaign.service';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import MetricsBarChart from '../../components/charts/MetricsBarChart';
import { 
  ArrowLeft, 
  Search, 
  RefreshCw,
  Download,
  ShoppingBag,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { formatNumber, formatCurrency, formatCTR, formatROAS } from '../../utils/format';
import { cn } from '../../utils/helpers';

const ListingGroups = () => {
  // Estados
  const [listingGroups, setListingGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [selectedView, setSelectedView] = useState('tree'); // 'tree' | 'table' | 'chart'

  const { campaignId } = useParams();
  const { currentCampaign, fetchCampaign } = useCampaignStore();

  // Carregar dados iniciais
  useEffect(() => {
    loadListingGroups();
    if (!currentCampaign || currentCampaign.id !== parseInt(campaignId)) {
      fetchCampaign(campaignId);
    }
  }, [campaignId]);

  // Carregar listing groups
  const loadListingGroups = async () => {
    setIsLoading(true);
    try {
      const response = await campaignService.getListingGroups(campaignId);
      setListingGroups(response.listingGroups || []);
    } catch (error) {
      console.error('Erro ao carregar listing groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Construir árvore hierárquica
  const treeData = useMemo(() => {
    const grouped = {};
    
    listingGroups.forEach(lg => {
      const path = lg.path || 'Outros';
      const parts = path.split(' > ');
      
      let current = grouped;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            children: {},
            data: index === parts.length - 1 ? lg : null
          };
        }
        if (index === parts.length - 1) {
          current[part].data = lg;
        }
        current = current[part].children;
      });
    });

    return grouped;
  }, [listingGroups]);

  // Filtrar grupos
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return listingGroups;
    
    return listingGroups.filter(lg => 
      lg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lg.path?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [listingGroups, searchQuery]);

  // Top performers para gráfico
  const topPerformers = useMemo(() => {
    return [...listingGroups]
      .filter(lg => lg.conversions > 0)
      .sort((a, b) => (b.conversion_value || 0) - (a.conversion_value || 0))
      .slice(0, 10)
      .map(lg => ({
        name: lg.name?.substring(0, 20) || 'Sem nome',
        conversions: lg.conversions || 0,
        value: lg.conversion_value || 0,
        roas: lg.cost > 0 ? (lg.conversion_value / lg.cost) : 0
      }));
  }, [listingGroups]);

  // Toggle expandir grupo
  const toggleExpand = (path) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedGroups(newExpanded);
  };

  // Expandir todos
  const expandAll = () => {
    const allPaths = new Set();
    listingGroups.forEach(lg => {
      const parts = (lg.path || '').split(' > ');
      parts.forEach((_, i) => {
        allPaths.add(parts.slice(0, i + 1).join(' > '));
      });
    });
    setExpandedGroups(allPaths);
  };

  // Colapsar todos
  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Renderizar item da árvore
  const renderTreeItem = (node, path = '', level = 0) => {
    const fullPath = path ? `${path} > ${node.name}` : node.name;
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedGroups.has(fullPath);
    const data = node.data;

    return (
      <div key={fullPath}>
        <div 
          className={cn(
            "flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer",
            level > 0 && "ml-" + (level * 4)
          )}
          style={{ marginLeft: level * 16 }}
          onClick={() => hasChildren && toggleExpand(fullPath)}
        >
          {/* Ícone de expandir/colapsar */}
          <div className="w-5 h-5 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )
            ) : (
              <ShoppingBag className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* Ícone de pasta */}
          {hasChildren && (
            isExpanded ? (
              <FolderOpen className="w-5 h-5 text-yellow-500" />
            ) : (
              <Folder className="w-5 h-5 text-yellow-500" />
            )
          )}

          {/* Nome */}
          <span className={cn(
            "flex-1 text-gray-900",
            hasChildren && "font-medium"
          )}>
            {node.name}
          </span>

          {/* Métricas */}
          {data && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <span className="text-gray-500">Impressões:</span>
                <span className="ml-1 font-medium">{formatNumber(data.impressions || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Cliques:</span>
                <span className="ml-1 font-medium">{formatNumber(data.clicks || 0)}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Conv:</span>
                <span className={cn(
                  "ml-1 font-medium",
                  data.conversions > 0 ? "text-green-600" : "text-gray-600"
                )}>
                  {formatNumber(data.conversions || 0)}
                </span>
              </div>
              <div className="text-right min-w-[80px]">
                <span className="text-gray-500">ROAS:</span>
                <span className={cn(
                  "ml-1 font-medium",
                  data.cost > 0 && (data.conversion_value / data.cost) >= 1 
                    ? "text-green-600" 
                    : "text-gray-600"
                )}>
                  {formatROAS(data.cost > 0 ? data.conversion_value / data.cost : 0)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filhos */}
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-200 ml-6">
            {Object.values(node.children).map(child => 
              renderTreeItem(child, fullPath, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Exportar para CSV
  const exportToCSV = () => {
    const headers = ['Path', 'Nome', 'Impressões', 'Cliques', 'CTR', 'Custo', 'Conversões', 'Valor', 'ROAS'];
    const rows = listingGroups.map(lg => [
      lg.path,
      lg.name,
      lg.impressions,
      lg.clicks,
      lg.impressions > 0 ? ((lg.clicks / lg.impressions) * 100).toFixed(2) + '%' : '0%',
      lg.cost,
      lg.conversions,
      lg.conversion_value,
      lg.cost > 0 ? (lg.conversion_value / lg.cost).toFixed(2) : '0'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listing_groups_${campaignId}_${new Date().toISOString().split('T')[0]}.csv`;
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
            <h1 className="text-2xl font-bold text-gray-900">Listing Groups</h1>
            <p className="text-gray-500">
              {currentCampaign?.name || 'Campanha'} - {listingGroups.length} grupos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={loadListingGroups} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-primary-600" />
            <p className="text-sm text-gray-500">Total de Grupos</p>
            <p className="text-2xl font-bold text-gray-900">{listingGroups.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm text-gray-500">Com Conversões</p>
            <p className="text-2xl font-bold text-gray-900">
              {listingGroups.filter(lg => lg.conversions > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-sm text-gray-500">Valor Total</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(listingGroups.reduce((sum, lg) => sum + (lg.conversion_value || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="text-sm text-gray-500">Sem Performance</p>
            <p className="text-2xl font-bold text-gray-900">
              {listingGroups.filter(lg => lg.impressions === 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 por Valor de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsBarChart
              data={topPerformers}
              bars={[
                { dataKey: 'value', name: 'Valor de Conversão', color: '#22c55e' },
                { dataKey: 'conversions', name: 'Conversões', color: '#3b82f6' }
              ]}
              height={300}
            />
          </CardContent>
        </Card>
      )}

      {/* Controles */}
      <Card>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full sm:w-auto relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar grupos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expandir Todos
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Colapsar Todos
              </Button>
              <div className="border-l pl-2 flex gap-1">
                {['tree', 'table'].map((view) => (
                  <Button
                    key={view}
                    variant={selectedView === view ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedView(view)}
                  >
                    {view === 'tree' ? 'Árvore' : 'Tabela'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização */}
      <Card>
        <CardContent className="p-0">
          {listingGroups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum listing group encontrado</p>
            </div>
          ) : selectedView === 'tree' ? (
            // Visualização em árvore
            <div className="p-4">
              {Object.values(treeData).map(node => renderTreeItem(node))}
            </div>
          ) : (
            // Visualização em tabela
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Path/Nome</th>
                    <th className="text-right p-4 font-medium text-gray-700">Impressões</th>
                    <th className="text-right p-4 font-medium text-gray-700">Cliques</th>
                    <th className="text-right p-4 font-medium text-gray-700">CTR</th>
                    <th className="text-right p-4 font-medium text-gray-700">Custo</th>
                    <th className="text-right p-4 font-medium text-gray-700">Conv.</th>
                    <th className="text-right p-4 font-medium text-gray-700">Valor</th>
                    <th className="text-right p-4 font-medium text-gray-700">ROAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredGroups.map((lg, index) => {
                    const ctr = lg.impressions > 0 ? (lg.clicks / lg.impressions) * 100 : 0;
                    const roas = lg.cost > 0 ? lg.conversion_value / lg.cost : 0;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{lg.name}</div>
                          <div className="text-xs text-gray-500">{lg.path}</div>
                        </td>
                        <td className="p-4 text-right">{formatNumber(lg.impressions)}</td>
                        <td className="p-4 text-right">{formatNumber(lg.clicks)}</td>
                        <td className="p-4 text-right">{formatCTR(ctr)}</td>
                        <td className="p-4 text-right">{formatCurrency(lg.cost)}</td>
                        <td className="p-4 text-right">
                          <span className={lg.conversions > 0 ? "text-green-600 font-medium" : ""}>
                            {formatNumber(lg.conversions)}
                          </span>
                        </td>
                        <td className="p-4 text-right">{formatCurrency(lg.conversion_value)}</td>
                        <td className="p-4 text-right">
                          <span className={cn(
                            "font-medium",
                            roas >= 3 ? "text-green-600" : roas >= 1 ? "text-yellow-600" : "text-gray-600"
                          )}>
                            {formatROAS(roas)}
                          </span>
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
    </div>
  );
};

export default ListingGroups;
