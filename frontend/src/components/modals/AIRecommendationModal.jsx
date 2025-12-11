/**
 * Modal de Recomendações da IA
 * Exibe e permite aplicar/rejeitar recomendações geradas pela IA
 */
import { useState } from 'react';
import { aiService } from '../../services/ai';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { 
  X, 
  Sparkles, 
  Check, 
  XCircle,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Modal de Recomendações de IA
 * @param {boolean} isOpen - Se o modal está aberto
 * @param {function} onClose - Callback para fechar o modal
 * @param {Array} recommendations - Lista de recomendações
 * @param {function} onApply - Callback ao aplicar recomendação
 * @param {function} onReject - Callback ao rejeitar recomendação
 * @param {function} onRefresh - Callback para gerar novas recomendações
 */
const AIRecommendationModal = ({
  isOpen,
  onClose,
  recommendations = [],
  onApply,
  onReject,
  onRefresh,
  isLoading = false,
  campaignName = ''
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(null);

  // Não renderizar se não estiver aberto
  if (!isOpen) return null;

  // Mapear tipo de recomendação para ícone e cor
  const getRecommendationStyle = (type) => {
    const styles = {
      'BUDGET': { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
      'BIDDING': { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
      'ASSET': { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100' },
      'TARGETING': { icon: Target, color: 'text-orange-600', bg: 'bg-orange-100' },
      'KEYWORD': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-100' },
      'AD_COPY': { icon: Sparkles, color: 'text-pink-600', bg: 'bg-pink-100' },
      'ALERT': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' }
    };
    return styles[type] || styles['ASSET'];
  };

  // Mapear prioridade para badge
  const getPriorityBadge = (priority) => {
    const priorities = {
      'HIGH': { variant: 'error', label: 'Alta' },
      'MEDIUM': { variant: 'warning', label: 'Média' },
      'LOW': { variant: 'default', label: 'Baixa' }
    };
    const { variant, label } = priorities[priority] || priorities['MEDIUM'];
    return <Badge variant={variant} size="sm">{label}</Badge>;
  };

  // Handler para aplicar recomendação
  const handleApply = async (recommendation) => {
    setApplyingId(recommendation.id);
    try {
      await aiService.applyRecommendation(recommendation.id);
      if (onApply) {
        onApply(recommendation);
      }
    } catch (error) {
      console.error('Erro ao aplicar recomendação:', error);
    } finally {
      setApplyingId(null);
    }
  };

  // Handler para rejeitar recomendação
  const handleReject = async (recommendation) => {
    if (!rejectReason && showRejectInput !== recommendation.id) {
      setShowRejectInput(recommendation.id);
      return;
    }

    setRejectingId(recommendation.id);
    try {
      await aiService.rejectRecommendation(recommendation.id, rejectReason);
      if (onReject) {
        onReject(recommendation, rejectReason);
      }
      setShowRejectInput(null);
      setRejectReason('');
    } catch (error) {
      console.error('Erro ao rejeitar recomendação:', error);
    } finally {
      setRejectingId(null);
    }
  };

  // Copiar texto
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Agrupar recomendações por tipo
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const type = rec.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(rec);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Sparkles className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Recomendações de IA
                </h2>
                {campaignName && (
                  <p className="text-sm text-gray-500">{campaignName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                  Atualizar
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                <p className="text-gray-600">Gerando recomendações...</p>
                <p className="text-sm text-gray-400 mt-1">
                  A IA está analisando sua campanha
                </p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Lightbulb className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-600">Nenhuma recomendação disponível</p>
                <p className="text-sm text-gray-400 mt-1">
                  Clique em "Atualizar" para gerar novas recomendações
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {recommendations.length}
                    </p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {recommendations.filter(r => r.status === 'APPLIED').length}
                    </p>
                    <p className="text-sm text-gray-500">Aplicadas</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                      {recommendations.filter(r => r.priority === 'HIGH').length}
                    </p>
                    <p className="text-sm text-gray-500">Alta Prioridade</p>
                  </div>
                </div>

                {/* Lista de recomendações agrupadas */}
                {Object.entries(groupedRecommendations).map(([type, recs]) => {
                  const style = getRecommendationStyle(type);
                  const Icon = style.icon;

                  return (
                    <div key={type}>
                      <h3 className="flex items-center gap-2 font-medium text-gray-700 mb-3">
                        <Icon className={cn("w-5 h-5", style.color)} />
                        {type === 'BUDGET' && 'Orçamento'}
                        {type === 'BIDDING' && 'Lances'}
                        {type === 'ASSET' && 'Assets'}
                        {type === 'TARGETING' && 'Segmentação'}
                        {type === 'KEYWORD' && 'Palavras-chave'}
                        {type === 'AD_COPY' && 'Textos'}
                        {type === 'ALERT' && 'Alertas'}
                        <span className="text-gray-400 font-normal">({recs.length})</span>
                      </h3>

                      <div className="space-y-3">
                        {recs.map((rec) => {
                          const isExpanded = expandedId === rec.id;
                          const isApplied = rec.status === 'APPLIED';
                          const isRejected = rec.status === 'REJECTED';

                          return (
                            <div 
                              key={rec.id}
                              className={cn(
                                "border rounded-lg overflow-hidden transition-all",
                                isApplied && "border-green-200 bg-green-50/50",
                                isRejected && "border-gray-200 bg-gray-50 opacity-60"
                              )}
                            >
                              {/* Header da recomendação */}
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                                className="w-full flex items-center gap-3 p-4 text-left"
                              >
                                <div className={cn("p-2 rounded-lg", style.bg)}>
                                  <Icon className={cn("w-5 h-5", style.color)} />
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {rec.title}
                                    </span>
                                    {getPriorityBadge(rec.priority)}
                                    {isApplied && (
                                      <Badge variant="success" size="sm">
                                        <Check className="w-3 h-3 mr-1" />
                                        Aplicada
                                      </Badge>
                                    )}
                                    {isRejected && (
                                      <Badge variant="default" size="sm">
                                        Rejeitada
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                    {rec.description}
                                  </p>
                                </div>

                                {rec.estimated_impact && (
                                  <div className="text-right">
                                    <span className="text-green-600 font-medium">
                                      +{rec.estimated_impact}%
                                    </span>
                                    <p className="text-xs text-gray-400">impacto</p>
                                  </div>
                                )}

                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </button>

                              {/* Conteúdo expandido */}
                              {isExpanded && (
                                <div className="px-4 pb-4 border-t bg-gray-50/50">
                                  <div className="pt-4 space-y-4">
                                    {/* Descrição completa */}
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-700 mb-1">
                                        Descrição
                                      </h4>
                                      <p className="text-sm text-gray-600">
                                        {rec.description}
                                      </p>
                                    </div>

                                    {/* Justificativa */}
                                    {rec.rationale && (
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                                          Por que esta recomendação?
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {rec.rationale}
                                        </p>
                                      </div>
                                    )}

                                    {/* Sugestões de texto (se houver) */}
                                    {rec.suggestions && rec.suggestions.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                          Sugestões
                                        </h4>
                                        <div className="space-y-2">
                                          {rec.suggestions.map((suggestion, idx) => (
                                            <div 
                                              key={idx}
                                              className="flex items-center justify-between p-2 bg-white rounded border"
                                            >
                                              <span className="text-sm text-gray-800">
                                                {suggestion}
                                              </span>
                                              <button
                                                onClick={() => copyToClipboard(suggestion)}
                                                className="p-1 hover:bg-gray-100 rounded"
                                                title="Copiar"
                                              >
                                                <Copy className="w-4 h-4 text-gray-400" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Input para rejeição */}
                                    {showRejectInput === rec.id && (
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                                          Motivo da rejeição (opcional)
                                        </label>
                                        <input
                                          type="text"
                                          value={rejectReason}
                                          onChange={(e) => setRejectReason(e.target.value)}
                                          placeholder="Por que você está rejeitando esta recomendação?"
                                          className="w-full px-3 py-2 border rounded-lg text-sm"
                                        />
                                      </div>
                                    )}

                                    {/* Ações */}
                                    {!isApplied && !isRejected && (
                                      <div className="flex items-center gap-2 pt-2">
                                        <Button
                                          onClick={() => handleApply(rec)}
                                          disabled={applyingId === rec.id}
                                        >
                                          {applyingId === rec.id ? (
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                          ) : (
                                            <ThumbsUp className="w-4 h-4 mr-2" />
                                          )}
                                          Aplicar
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => handleReject(rec)}
                                          disabled={rejectingId === rec.id}
                                        >
                                          {rejectingId === rec.id ? (
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                          ) : (
                                            <ThumbsDown className="w-4 h-4 mr-2" />
                                          )}
                                          Rejeitar
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Recomendações geradas por IA baseadas em análise de performance
            </p>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIRecommendationModal;
