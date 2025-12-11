/**
 * Página de Asset Groups
 * Lista e gerencia Asset Groups de uma campanha Performance Max
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCampaignStore } from '../../state/campaignStore';
import { campaignService } from '../../services/campaign.service';
import { aiService } from '../../services/ai';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { 
  ArrowLeft, 
  Image, 
  Type, 
  FileText, 
  Video,
  Plus,
  Sparkles,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const AssetGroups = () => {
  // Estados
  const [assetGroups, setAssetGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { campaignId } = useParams();
  const { currentCampaign, fetchCampaign } = useCampaignStore();

  // Carregar dados iniciais
  useEffect(() => {
    loadAssetGroups();
    if (!currentCampaign || currentCampaign.id !== parseInt(campaignId)) {
      fetchCampaign(campaignId);
    }
  }, [campaignId]);

  // Carregar asset groups
  const loadAssetGroups = async () => {
    setIsLoading(true);
    try {
      const response = await campaignService.getAssetGroups(campaignId);
      setAssetGroups(response.assetGroups || []);
    } catch (error) {
      console.error('Erro ao carregar asset groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar assets de um grupo
  const loadAssets = async (groupId) => {
    setIsLoadingAssets(true);
    try {
      const response = await campaignService.getAssets(campaignId, groupId);
      setAssets(response.assets || []);
    } catch (error) {
      console.error('Erro ao carregar assets:', error);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  // Selecionar um grupo
  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    loadAssets(group.id);
    setShowAISuggestions(false);
    setAiSuggestions(null);
  };

  // Gerar sugestões de IA
  const handleGenerateAISuggestions = async () => {
    if (!selectedGroup) return;
    
    setIsGeneratingAI(true);
    try {
      const response = await aiService.generateAssetSuggestions(campaignId, selectedGroup.id);
      setAiSuggestions(response);
      setShowAISuggestions(true);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Mapear status para badge
  const getStatusBadge = (status) => {
    const statusMap = {
      'ENABLED': { variant: 'success', label: 'Ativo' },
      'PAUSED': { variant: 'warning', label: 'Pausado' },
      'REMOVED': { variant: 'error', label: 'Removido' },
      'UNKNOWN': { variant: 'default', label: 'Desconhecido' }
    };
    const { variant, label } = statusMap[status] || statusMap['UNKNOWN'];
    return <Badge variant={variant}>{label}</Badge>;
  };

  // Mapear tipo de asset para ícone
  const getAssetIcon = (type) => {
    const iconMap = {
      'HEADLINE': Type,
      'DESCRIPTION': FileText,
      'IMAGE': Image,
      'YOUTUBE_VIDEO': Video,
      'LOGO': Image,
      'MARKETING_IMAGE': Image,
      'CALL_TO_ACTION': Type
    };
    return iconMap[type] || FileText;
  };

  // Mapear performance de asset
  const getPerformanceBadge = (performance) => {
    const perfMap = {
      'BEST': { variant: 'success', label: 'Melhor', icon: CheckCircle },
      'GOOD': { variant: 'success', label: 'Bom', icon: CheckCircle },
      'LOW': { variant: 'warning', label: 'Baixo', icon: AlertCircle },
      'LEARNING': { variant: 'default', label: 'Aprendendo', icon: Clock },
      'UNKNOWN': { variant: 'default', label: '-', icon: null }
    };
    const { variant, label, icon: Icon } = perfMap[performance] || perfMap['UNKNOWN'];
    return (
      <div className="flex items-center gap-1">
        {Icon && <Icon className={cn(
          "w-4 h-4",
          variant === 'success' && 'text-green-500',
          variant === 'warning' && 'text-yellow-500',
          variant === 'default' && 'text-gray-400'
        )} />}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Asset Groups</h1>
            <p className="text-gray-500">
              {currentCampaign?.name || 'Campanha'} - {assetGroups.length} grupos
            </p>
          </div>
        </div>

        <Button onClick={loadAssetGroups} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Asset Groups */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grupos de Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {assetGroups.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Nenhum asset group encontrado
                </div>
              ) : (
                <div className="divide-y">
                  {assetGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between",
                        selectedGroup?.id === group.id && "bg-primary-50"
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(group.status)}
                          <span className="text-sm text-gray-500">
                            {group.asset_count || 0} assets
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalhes do Asset Group */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedGroup ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Selecione um Asset Group para ver os detalhes</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Header do grupo selecionado */}
              <Card>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedGroup.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      {getStatusBadge(selectedGroup.status)}
                      {selectedGroup.final_url && (
                        <a 
                          href={selectedGroup.final_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline"
                        >
                          {selectedGroup.final_url}
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateAISuggestions}
                    disabled={isGeneratingAI}
                  >
                    {isGeneratingAI ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Sugestões IA
                  </Button>
                </CardContent>
              </Card>

              {/* Sugestões de IA */}
              {showAISuggestions && aiSuggestions && (
                <Card className="border-primary-200 bg-primary-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary-600" />
                      Sugestões da IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiSuggestions.headlines && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Headlines Sugeridos</h4>
                        <div className="space-y-2">
                          {aiSuggestions.headlines.map((headline, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className="text-gray-800">{headline}</span>
                              <Button size="sm" variant="ghost">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiSuggestions.descriptions && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">Descrições Sugeridas</h4>
                        <div className="space-y-2">
                          {aiSuggestions.descriptions.map((desc, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className="text-gray-800 text-sm">{desc}</span>
                              <Button size="sm" variant="ghost">
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Lista de Assets */}
              <Card>
                <CardHeader>
                  <CardTitle>Assets do Grupo</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAssets ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum asset encontrado neste grupo
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Agrupar assets por tipo */}
                      {['HEADLINE', 'DESCRIPTION', 'IMAGE', 'YOUTUBE_VIDEO', 'LOGO'].map((type) => {
                        const typeAssets = assets.filter(a => a.type === type);
                        if (typeAssets.length === 0) return null;
                        
                        const Icon = getAssetIcon(type);
                        const typeLabels = {
                          'HEADLINE': 'Headlines',
                          'DESCRIPTION': 'Descrições',
                          'IMAGE': 'Imagens',
                          'YOUTUBE_VIDEO': 'Vídeos',
                          'LOGO': 'Logos'
                        };

                        return (
                          <div key={type}>
                            <h4 className="flex items-center gap-2 font-medium text-gray-700 mb-2">
                              <Icon className="w-4 h-4" />
                              {typeLabels[type]} ({typeAssets.length})
                            </h4>
                            <div className="space-y-2 pl-6">
                              {typeAssets.map((asset) => (
                                <div 
                                  key={asset.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex-1">
                                    {asset.type === 'IMAGE' || asset.type === 'LOGO' ? (
                                      <img 
                                        src={asset.content} 
                                        alt={asset.name}
                                        className="h-12 w-auto rounded"
                                      />
                                    ) : (
                                      <p className="text-gray-800">{asset.content}</p>
                                    )}
                                  </div>
                                  {getPerformanceBadge(asset.performance_label)}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetGroups;
