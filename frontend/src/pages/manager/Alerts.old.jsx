import { useEffect, useState } from 'react';
import { useAlertStore } from '../../state/alertStore';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatDateTime, formatRelative } from '../../utils/date';
import { 
  Bell, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Target,
  CheckCircle,
  XCircle,
  Filter,
  MoreVertical,
  Eye,
  Check
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const Alerts = () => {
  const { alerts, unreadCount, fetchAlerts, markAsRead, markAllAsRead } = useAlertStore();
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchAlerts();
  }, []);

  const getAlertIcon = (type) => {
    switch (type) {
      case 'budget_exceeded':
        return <DollarSign className="w-5 h-5" />;
      case 'roas_drop':
        return <TrendingDown className="w-5 h-5" />;
      case 'roas_increase':
        return <TrendingUp className="w-5 h-5" />;
      case 'conversion_drop':
        return <Target className="w-5 h-5" />;
      case 'campaign_paused':
        return <XCircle className="w-5 h-5" />;
      case 'campaign_activated':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type, priority) => {
    if (priority === 'critical') return 'text-red-600 bg-red-50';
    if (priority === 'high') return 'text-orange-600 bg-orange-50';
    
    switch (type) {
      case 'roas_increase':
      case 'campaign_activated':
        return 'text-green-600 bg-green-50';
      case 'roas_drop':
      case 'conversion_drop':
        return 'text-red-600 bg-red-50';
      case 'budget_exceeded':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const getAlertLabel = (type) => {
    const labels = {
      budget_exceeded: 'Orçamento Excedido',
      roas_drop: 'Queda no ROAS',
      roas_increase: 'Aumento no ROAS',
      conversion_drop: 'Queda nas Conversões',
      campaign_paused: 'Campanha Pausada',
      campaign_activated: 'Campanha Ativada',
      performance_alert: 'Alerta de Performance'
    };
    return labels[type] || type;
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread' && alert.read_at) return false;
    if (filter === 'read' && !alert.read_at) return false;
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    return true;
  });

  const alertTypes = [...new Set(alerts.map(a => a.type))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
          <p className="text-gray-500">
            {unreadCount > 0 
              ? `Você tem ${unreadCount} ${unreadCount === 1 ? 'alerta não lido' : 'alertas não lidos'}`
              : 'Todos os alertas foram lidos'
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <Check className="w-4 h-4 mr-2" />
            Marcar todos como lidos
          </Button>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Filtros:</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos</option>
            <option value="unread">Não lidos</option>
            <option value="read">Lidos</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Todos os tipos</option>
            {alertTypes.map(type => (
              <option key={type} value={type}>{getAlertLabel(type)}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <Card 
            key={alert.id} 
            className={cn(
              "transition-all",
              !alert.read_at && "border-l-4 border-l-primary-500 bg-primary-50/30"
            )}
          >
            <CardContent className="flex items-start gap-4">
              <div className={cn(
                "p-3 rounded-lg",
                getAlertColor(alert.type, alert.priority)
              )}>
                {getAlertIcon(alert.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                      <Badge variant={
                        alert.priority === 'critical' ? 'danger' :
                        alert.priority === 'high' ? 'warning' : 'default'
                      }>
                        {alert.priority === 'critical' ? 'Crítico' :
                         alert.priority === 'high' ? 'Alto' : 'Normal'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Campanha: {alert.campaign_name}</span>
                      <span>{formatRelative(alert.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!alert.read_at && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Métricas do Alerta */}
                {alert.data && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      {alert.data.current_value !== undefined && (
                        <div>
                          <span className="text-gray-500">Valor Atual:</span>
                          <span className="ml-2 font-medium">{alert.data.current_value}</span>
                        </div>
                      )}
                      {alert.data.previous_value !== undefined && (
                        <div>
                          <span className="text-gray-500">Valor Anterior:</span>
                          <span className="ml-2 font-medium">{alert.data.previous_value}</span>
                        </div>
                      )}
                      {alert.data.threshold !== undefined && (
                        <div>
                          <span className="text-gray-500">Limite:</span>
                          <span className="ml-2 font-medium">{alert.data.threshold}</span>
                        </div>
                      )}
                      {alert.data.change_percent !== undefined && (
                        <div>
                          <span className="text-gray-500">Variação:</span>
                          <span className={cn(
                            "ml-2 font-medium",
                            alert.data.change_percent > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {alert.data.change_percent > 0 ? '+' : ''}{alert.data.change_percent}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAlerts.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Nenhum alerta</h3>
              <p className="text-gray-500">
                {filter !== 'all' || typeFilter !== 'all'
                  ? 'Nenhum alerta encontrado com os filtros selecionados.'
                  : 'Você não tem alertas no momento.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            <p className="text-sm text-gray-500">Total de Alertas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-primary-600">{unreadCount}</p>
            <p className="text-sm text-gray-500">Não Lidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.priority === 'critical').length}
            </p>
            <p className="text-sm text-gray-500">Críticos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.priority === 'high').length}
            </p>
            <p className="text-sm text-gray-500">Alta Prioridade</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Alerts;
