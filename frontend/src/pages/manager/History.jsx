// =============================================================================
// HISTORY PAGE - Página de histórico de alterações / Audit Log
// Timeline visual com filtros, ícones e detalhes das mudanças
// =============================================================================

import { useEffect, useState } from 'react';
import useHistoryStore, { ACTION_CONFIG, ENTITY_CONFIG } from '../../state/historyStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { formatDateTime, formatRelative } from '../../utils/date';
import { 
  History as HistoryIcon, 
  Search, 
  Filter,
  User,
  Target,
  Settings,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Edit,
  Trash2,
  ToggleLeft,
  CheckCircle,
  XCircle,
  RefreshCcw,
  AlertCircle,
  Layers,
  Briefcase,
  Bell,
  Brain,
  List,
  LayoutList
} from 'lucide-react';
import { cn } from '../../utils/helpers';

// =============================================================================
// MAPEAMENTO DE ÍCONES LUCIDE
// =============================================================================

const LUCIDE_ICONS = {
  add_circle: PlusCircle,
  edit: Edit,
  delete: Trash2,
  toggle_on: ToggleLeft,
  check_circle: CheckCircle,
  cancel: XCircle,
  sync: RefreshCcw,
  info: AlertCircle,
  campaign: Target,
  collections: Layers,
  attach_money: DollarSign,
  track_changes: Target,
  psychology: Brain,
  person: User,
  business: Briefcase,
  notifications: Bell,
  folder: Layers,
  history: HistoryIcon,
  timeline: Clock,
  table_rows: LayoutList
};

const getLucideIcon = (iconName) => {
  return LUCIDE_ICONS[iconName] || AlertCircle;
};

// =============================================================================
// COMPONENTE DE ESTATÍSTICAS
// =============================================================================

const StatCard = ({ icon: Icon, label, value, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-600'
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={cn("p-3 rounded-lg", colorClasses[color] || colorClasses.gray)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        {trend !== undefined && trend !== null && (
          <span className={cn(
            "text-sm ml-auto",
            trend > 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </CardContent>
    </Card>
  );
};

// =============================================================================
// ITEM DA TIMELINE
// =============================================================================

const TimelineItem = ({ log, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  
  const actionConfig = ACTION_CONFIG[log.action] || { icon: 'info', bgColor: 'bg-gray-100', textColor: 'text-gray-700', label: log.action };
  const entityConfig = ENTITY_CONFIG[log.entityType] || { icon: 'folder', label: log.entityType || 'Sistema', color: 'gray' };
  
  const ActionIcon = getLucideIcon(actionConfig.icon);
  const EntityIcon = getLucideIcon(entityConfig.icon);
  
  const formattedTime = new Date(log.createdAt).toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="relative pb-6">
      {/* Linha vertical */}
      {!isLast && (
        <div className="absolute left-6 top-14 h-[calc(100%-56px)] w-0.5 bg-gray-200" />
      )}
      
      <div className="flex gap-4">
        {/* Ícone da ação */}
        <div className={cn(
          "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
          actionConfig.bgColor
        )}>
          <ActionIcon className={cn("w-5 h-5", actionConfig.textColor)} />
        </div>
        
        {/* Conteúdo */}
        <Card className="flex-1 min-w-0 hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {log.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={cn(
                    "text-xs flex items-center gap-1",
                    `bg-${entityConfig.color}-50 text-${entityConfig.color}-700 border-${entityConfig.color}-200`
                  )}>
                    <EntityIcon className="w-3 h-3" />
                    {entityConfig.label}
                  </Badge>
                  {log.entityName && (
                    <span className="text-xs font-medium text-gray-700">{log.entityName}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedTime}
              </span>
            </div>
            
            {/* User e Toggle */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-700">
                {log.user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="text-xs text-gray-600">{log.user?.name || 'Sistema'}</span>
              
              {/* Toggle details */}
              {log.changes && Array.isArray(log.changes) && log.changes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="ml-auto text-xs"
                >
                  {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                  {expanded ? 'Ocultar' : 'Ver'} detalhes
                </Button>
              )}
            </div>
            
            {/* Changes detail */}
            {expanded && log.changes && Array.isArray(log.changes) && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2">Alterações:</p>
                <div className="space-y-2">
                  {log.changes.map((change, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 rounded p-2">
                      <span className="font-medium text-gray-700 min-w-[100px]">
                        {change.fieldLabel || change.field}:
                      </span>
                      <span className="text-red-600 line-through">
                        {change.oldValueFormatted || String(change.oldValue ?? 'N/A')}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-green-600 font-medium">
                        {change.newValueFormatted || String(change.newValue ?? 'N/A')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// =============================================================================
// GRUPO DE TIMELINE (POR DATA)
// =============================================================================

const TimelineGroup = ({ date, dateFormatted, events }) => (
  <div className="mb-8">
    {/* Header da data */}
    <div className="flex items-center gap-4 mb-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-sm font-medium text-gray-500 capitalize flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        {dateFormatted}
      </span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
    
    {/* Eventos do dia */}
    <div>
      {events.map((event, idx) => (
        <TimelineItem 
          key={event.id} 
          log={event} 
          isLast={idx === events.length - 1}
        />
      ))}
    </div>
  </div>
);

// =============================================================================
// LISTA EM TABELA
// =============================================================================

const LogTable = ({ logs }) => (
  <Card>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => {
            const actionConfig = ACTION_CONFIG[log.action] || {};
            const entityConfig = ENTITY_CONFIG[log.entityType] || {};
            const ActionIcon = getLucideIcon(actionConfig.icon);
            const EntityIcon = getLucideIcon(entityConfig.icon);
            
            return (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn(
                    "text-xs flex items-center gap-1 w-fit",
                    actionConfig.bgColor,
                    actionConfig.textColor
                  )}>
                    <ActionIcon className="w-3 h-3" />
                    {actionConfig.label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                    <EntityIcon className="w-4 h-4" />
                    {entityConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-md truncate">
                  {log.description}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {log.user?.name || 'Sistema'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </Card>
);

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

const History = () => {
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' ou 'table'
  
  const {
    logs,
    stats,
    entityTypes,
    actionTypes,
    filters,
    page,
    totalPages,
    total,
    loading,
    loadingStats,
    fetchLogs,
    fetchStats,
    fetchEntityTypes,
    fetchActionTypes,
    setFilter,
    clearFilters,
    setPage
  } = useHistoryStore();
  
  // Carregar dados iniciais
  useEffect(() => {
    fetchLogs();
    fetchStats(30);
    fetchEntityTypes();
    fetchActionTypes();
  }, []);
  
  // Recarregar quando filtros mudam
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(debounce);
  }, [filters]);
  
  // Agrupar logs por data para timeline
  const groupedLogs = logs.reduce((acc, log) => {
    const dateKey = new Date(log.createdAt).toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        dateFormatted: new Date(dateKey).toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        events: []
      };
    }
    acc[dateKey].events.push(log);
    return acc;
  }, {});
  
  const timelineGroups = Object.values(groupedLogs).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Alterações</h1>
          <p className="text-gray-500">Acompanhe todas as mudanças feitas no sistema</p>
        </div>
        
        {/* Toggle de visualização */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setViewMode('timeline')}
            variant={viewMode === 'timeline' ? 'primary' : 'outline'}
            size="sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            Timeline
          </Button>
          <Button
            onClick={() => setViewMode('table')}
            variant={viewMode === 'table' ? 'primary' : 'outline'}
            size="sm"
          >
            <List className="w-4 h-4 mr-2" />
            Tabela
          </Button>
          <Button onClick={() => fetchLogs()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={HistoryIcon}
            label="Total de Alterações"
            value={stats.totalLogs || 0}
            color="blue"
          />
          <StatCard
            icon={PlusCircle}
            label="Criações"
            value={stats.byAction?.CREATE || 0}
            color="green"
          />
          <StatCard
            icon={Edit}
            label="Atualizações"
            value={stats.byAction?.UPDATE || 0}
            color="orange"
          />
          <StatCard
            icon={CheckCircle}
            label="Aprovações"
            value={stats.byAction?.APPROVE || 0}
            color="purple"
          />
          <StatCard
            icon={RefreshCcw}
            label="Sincronizações"
            value={stats.byAction?.SYNC || 0}
            color="blue"
          />
        </div>
      )}
      
      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-col lg:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar em descrições..."
              value={filters.search || ''}
              onChange={(e) => setFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Tipo de entidade */}
          <select
            value={filters.entityType || ''}
            onChange={(e) => setFilter('entityType', e.target.value || null)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos os tipos</option>
            {entityTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          {/* Ação */}
          <select
            value={filters.action || ''}
            onChange={(e) => setFilter('action', e.target.value || null)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todas as ações</option>
            {actionTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          {/* Data início */}
          <Input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilter('startDate', e.target.value || null)}
            className="w-auto"
          />
          
          {/* Data fim */}
          <Input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilter('endDate', e.target.value || null)}
            className="w-auto"
          />
          
          {/* Botão limpar */}
          <Button variant="ghost" onClick={clearFilters}>
            <XCircle className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </CardContent>
      </Card>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <span className="ml-3 text-gray-600">Carregando histórico...</span>
        </div>
      )}
      
      {/* Conteúdo */}
      {!loading && logs.length > 0 && (
        <>
          {viewMode === 'timeline' ? (
            <div>
              {timelineGroups.map(group => (
                <TimelineGroup
                  key={group.date}
                  date={group.date}
                  dateFormatted={group.dateFormatted}
                  events={group.events}
                />
              ))}
            </div>
          ) : (
            <LogTable logs={logs} />
          )}
          
          {/* Paginação */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Página {page} de {totalPages} ({total} registros)
                </p>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    variant="outline"
                    size="sm"
                  >
                    Anterior
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          variant={pageNum === page ? 'primary' : 'outline'}
                          size="sm"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Próximo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* Empty state */}
      {!loading && logs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum registro encontrado
            </h3>
            <p className="text-gray-500 mb-4">
              Não há alterações registradas com os filtros selecionados.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default History;
