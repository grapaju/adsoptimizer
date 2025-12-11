// =============================================================================
// ALERTS PAGE - Página de Alertas Inteligentes
// Visualização e gerenciamento de alertas de campanhas
// =============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlertStore } from '../../state/alertStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatRelative } from '../../utils/date';
import { 
  Bell, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign,
  Target,
  BarChart3,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  Eye,
  Check,
  CheckCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  ArrowUpRight,
  Flame
} from 'lucide-react';
import { cn } from '../../utils/helpers';

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/**
 * Card de estatísticas de alertas
 */
const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className={cn(
    "bg-white rounded-xl p-4 border border-gray-100 shadow-sm",
    "hover:shadow-md transition-shadow"
  )}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {trend && (
          <p className={cn(
            "text-xs mt-1",
            trend > 0 ? "text-red-500" : "text-green-500"
          )}>
            {trend > 0 ? '+' : ''}{trend}% vs última semana
          </p>
        )}
      </div>
      <div className={cn(
        "w-12 h-12 rounded-full flex items-center justify-center",
        color
      )}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </div>
);

/**
 * Retorna ícone e cor baseado no tipo de alerta
 */
const getAlertConfig = (type, priority) => {
  const configs = {
    ROAS_DROP: { 
      icon: TrendingDown, 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      label: 'Queda de ROAS'
    },
    CPA_HIGH: { 
      icon: DollarSign, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50',
      label: 'CPA Alto'
    },
    BUDGET_LOSS: { 
      icon: DollarSign, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50',
      label: 'Perda por Orçamento'
    },
    RANKING_LOSS: { 
      icon: BarChart3, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50',
      label: 'Perda por Ranking'
    },
    CTR_DECLINE: { 
      icon: Target, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      label: 'CTR em Declínio'
    },
    BURN_RATE: { 
      icon: Flame, 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      label: 'Burn Rate Alto'
    }
  };

  return configs[type] || { 
    icon: AlertTriangle, 
    color: 'text-gray-600', 
    bg: 'bg-gray-50',
    label: type
  };
};

/**
 * Badge de prioridade
 */
const PriorityBadge = ({ priority }) => {
  const configs = {
    CRITICAL: { bg: 'bg-red-100 text-red-800', label: 'Crítico' },
    HIGH: { bg: 'bg-orange-100 text-orange-800', label: 'Alto' },
    MEDIUM: { bg: 'bg-yellow-100 text-yellow-800', label: 'Médio' },
    LOW: { bg: 'bg-gray-100 text-gray-800', label: 'Baixo' }
  };
  
  const config = configs[priority] || configs.MEDIUM;
  
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bg)}>
      {config.label}
    </span>
  );
};

/**
 * Badge de status
 */
const StatusBadge = ({ status }) => {
  const configs = {
    ACTIVE: { bg: 'bg-blue-100 text-blue-800', label: 'Ativo' },
    ACKNOWLEDGED: { bg: 'bg-yellow-100 text-yellow-800', label: 'Reconhecido' },
    RESOLVED: { bg: 'bg-green-100 text-green-800', label: 'Resolvido' },
    DISMISSED: { bg: 'bg-gray-100 text-gray-800', label: 'Descartado' }
  };
  
  const config = configs[status] || configs.ACTIVE;
  
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", config.bg)}>
      {config.label}
    </span>
  );
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

const Alerts = () => {
  const { 
    alerts, 
    stats, 
    isLoading, 
    pagination,
    filters,
    fetchAlerts, 
    fetchStats,
    markAsRead,
    markAllAsRead, 
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    analyzeAllCampaigns,
    setFilters,
    clearFilters,
    setPage,
    setupSocketListeners
  } = useAlertStore();
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAlerts();
    fetchStats();
    setupSocketListeners();
  }, []);

  // Handler para análise de todas as campanhas
  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    const result = await analyzeAllCampaigns();
    setAnalyzing(false);
    
    if (result.success) {
      alert(`Análise concluída! ${result.data.totalAlerts} alertas gerados em ${result.data.campaignsWithAlerts} campanhas.`);
    }
  };

  // Filtrar alertas localmente se necessário
  const displayedAlerts = alerts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas Inteligentes</h1>
          <p className="text-gray-500 mt-1">
            Monitore problemas de performance em suas campanhas
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => { fetchAlerts(); fetchStats(); }}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleAnalyzeAll}
            disabled={analyzing}
          >
            <Zap className={cn("w-4 h-4 mr-2", analyzing && "animate-pulse")} />
            {analyzing ? 'Analisando...' : 'Analisar Campanhas'}
          </Button>
          <Button 
            onClick={markAllAsRead}
            disabled={!stats?.unread}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar Todos como Lidos
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Alertas Ativos"
          value={stats?.totalActive || 0}
          icon={Bell}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Não Lidos"
          value={stats?.unread || 0}
          icon={Eye}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          title="Críticos"
          value={stats?.bySeverity?.CRITICAL || 0}
          icon={AlertTriangle}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Últimos 7 dias"
          value={stats?.lastWeek || 0}
          icon={Clock}
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
          </Button>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ status: e.target.value || null })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="ACTIVE">Ativos</option>
                  <option value="ACKNOWLEDGED">Reconhecidos</option>
                  <option value="RESOLVED">Resolvidos</option>
                  <option value="DISMISSED">Descartados</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridade
                </label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters({ priority: e.target.value || null })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Todas</option>
                  <option value="CRITICAL">Crítico</option>
                  <option value="HIGH">Alto</option>
                  <option value="MEDIUM">Médio</option>
                  <option value="LOW">Baixo</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => setFilters({ type: e.target.value || null })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="ROAS_DROP">Queda de ROAS</option>
                  <option value="CPA_HIGH">CPA Alto</option>
                  <option value="BUDGET_LOSS">Perda por Orçamento</option>
                  <option value="RANKING_LOSS">Perda por Ranking</option>
                  <option value="CTR_DECLINE">CTR em Declínio</option>
                  <option value="BURN_RATE">Burn Rate</option>
                </select>
              </div>

              {/* Read Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leitura
                </label>
                <select
                  value={filters.isRead === true ? 'true' : filters.isRead === false ? 'false' : ''}
                  onChange={(e) => setFilters({ 
                    isRead: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null 
                  })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="false">Não lidos</option>
                  <option value="true">Lidos</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Alertas ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && displayedAlerts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : displayedAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhum alerta encontrado</h3>
              <p className="text-gray-500 mt-1">
                {filters.status || filters.priority || filters.type 
                  ? 'Tente ajustar os filtros' 
                  : 'Suas campanhas estão funcionando bem!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedAlerts.map((alert) => {
                const config = getAlertConfig(alert.type, alert.priority);
                const Icon = config.icon;
                
                return (
                  <div 
                    key={alert.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 transition-colors",
                      !alert.isRead && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        config.bg
                      )}>
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={cn(
                            "font-medium",
                            !alert.isRead ? "text-gray-900" : "text-gray-700"
                          )}>
                            {alert.title}
                          </h4>
                          <PriorityBadge priority={alert.priority} />
                          <StatusBadge status={alert.status} />
                          {!alert.isRead && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {alert.message}
                        </p>

                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className={cn("px-2 py-0.5 rounded", config.bg, config.color)}>
                            {config.label}
                          </span>
                          {alert.campaign && (
                            <Link 
                              to={`/manager/campaigns/${alert.campaignId}`}
                              className="flex items-center hover:text-primary-600"
                            >
                              {alert.campaign.name}
                              <ArrowUpRight className="w-3 h-3 ml-1" />
                            </Link>
                          )}
                          <span>{formatRelative(alert.createdAt)}</span>
                        </div>

                        {/* Metrics */}
                        {(alert.currentValue !== null || alert.threshold !== null) && (
                          <div className="flex gap-4 mt-3 text-sm">
                            {alert.currentValue !== null && (
                              <div className="bg-gray-100 px-3 py-1 rounded">
                                <span className="text-gray-500">Atual:</span>{' '}
                                <span className="font-medium">
                                  {typeof alert.currentValue === 'number' 
                                    ? alert.currentValue.toFixed(2) 
                                    : alert.currentValue}
                                </span>
                              </div>
                            )}
                            {alert.previousValue !== null && (
                              <div className="bg-gray-100 px-3 py-1 rounded">
                                <span className="text-gray-500">Anterior:</span>{' '}
                                <span className="font-medium">
                                  {typeof alert.previousValue === 'number' 
                                    ? alert.previousValue.toFixed(2) 
                                    : alert.previousValue}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                            title="Marcar como lido"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        
                        {alert.status === 'ACTIVE' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => acknowledgeAlert(alert.id)}
                              title="Reconhecer"
                              className="text-yellow-600 hover:text-yellow-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveAlert(alert.id)}
                              title="Resolver"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissAlert(alert.id)}
                              title="Descartar"
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} alertas
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="flex items-center px-3 text-sm">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Types Summary */}
      {stats?.byType && Object.keys(stats.byType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas por Tipo (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.byType).map(([type, count]) => {
                const config = getAlertConfig(type);
                const Icon = config.icon;
                
                return (
                  <div 
                    key={type}
                    className={cn(
                      "p-4 rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow",
                      config.bg
                    )}
                    onClick={() => setFilters({ type })}
                  >
                    <Icon className={cn("w-8 h-8 mx-auto mb-2", config.color)} />
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-gray-600">{config.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alerts;
