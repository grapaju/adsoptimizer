/**
 * Página de Geração de Anúncios com IA
 * Cria anúncios completos para Performance Max
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../services/ai';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import {
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Copy,
  Check,
  Wand2,
  Image,
  Type,
  FileText,
  Lightbulb,
  Calendar,
  Plus,
  Trash2,
  Download,
  Upload,
  Eye
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const AIAdGenerator = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    product: '',
    audience: '',
    keywords: '',
    tone: 'profissional',
    brandName: '',
    brandDifferentials: '',
    brandValueProposition: ''
  });
  
  // Results state
  const [suggestions, setSuggestions] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copiedItems, setCopiedItems] = useState({});
  const [activeTab, setActiveTab] = useState('headlines');

  // Image analysis state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Variations state
  const [baseAdForVariations, setBaseAdForVariations] = useState(null);
  const [variations, setVariations] = useState(null);
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    if (!formData.product.trim()) {
      setError('Descreva o produto ou serviço');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuggestions(null);

    try {
      const response = await aiService.generateAds({
        product: formData.product,
        audience: formData.audience,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        tone: formData.tone,
        brand: {
          name: formData.brandName,
          differentials: formData.brandDifferentials,
          valueProposition: formData.brandValueProposition
        }
      });

      if (response.success) {
        setSuggestions(response.data.suggestions);
      } else {
        setError(response.error || 'Erro ao gerar sugestões');
      }
    } catch (err) {
      console.error('Erro ao gerar anúncios:', err);
      setError('Erro ao gerar anúncios. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedItems(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedItems(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleCopyAll = (items) => {
    const text = items.join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageFile) return;

    setIsAnalyzingImage(true);
    setImageAnalysis(null);

    try {
      const response = await aiService.analyzeImageFile(imageFile, formData.product);
      if (response.success) {
        setImageAnalysis(response.data.analysis);
      }
    } catch (err) {
      console.error('Erro ao analisar imagem:', err);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleGenerateVariations = async (baseAd) => {
    setBaseAdForVariations(baseAd);
    setIsGeneratingVariations(true);
    setVariations(null);

    try {
      const response = await aiService.generateVariations({
        baseAd: {
          headlines: baseAd.headlines || [baseAd.headline1, baseAd.headline2, baseAd.headline3].filter(Boolean),
          descriptions: baseAd.descriptions || [baseAd.description1, baseAd.description2].filter(Boolean)
        },
        objective: 'conversion'
      });

      if (response.success) {
        setVariations(response.data);
      }
    } catch (err) {
      console.error('Erro ao gerar variações:', err);
    } finally {
      setIsGeneratingVariations(false);
    }
  };

  const toneOptions = [
    { value: 'profissional', label: 'Profissional' },
    { value: 'casual', label: 'Casual/Amigável' },
    { value: 'urgente', label: 'Urgente' },
    { value: 'luxo', label: 'Luxo/Premium' },
    { value: 'divertido', label: 'Divertido' },
    { value: 'tecnico', label: 'Técnico' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Wand2 className="w-7 h-7 text-primary-600" />
              Gerador de Anúncios com IA
            </h1>
            <p className="text-gray-500">Crie anúncios otimizados para Performance Max</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Briefing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto/Serviço *
                </label>
                <textarea
                  name="product"
                  value={formData.product}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  placeholder="Descreva seu produto ou serviço em detalhes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Público-Alvo
                </label>
                <textarea
                  name="audience"
                  value={formData.audience}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
                  placeholder="Quem é seu cliente ideal?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Palavras-chave
                </label>
                <Input
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  placeholder="Separe por vírgulas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tom de Voz
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  {toneOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <hr />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Marca
                </label>
                <Input
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleInputChange}
                  placeholder="Sua marca"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diferenciais
                </label>
                <Input
                  name="brandDifferentials"
                  value={formData.brandDifferentials}
                  onChange={handleInputChange}
                  placeholder="O que te diferencia?"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button 
                className="w-full" 
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Anúncios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Image Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-5 h-5" />
                Análise de Imagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-40 mx-auto rounded"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setImageAnalysis(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Clique para enviar uma imagem
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

              {imageFile && !imageAnalysis && (
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzingImage}
                >
                  {isAnalyzingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Analisar Imagem
                    </>
                  )}
                </Button>
              )}

              {imageAnalysis && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Score:</span>
                    <Badge variant={
                      imageAnalysis.overallScore >= 80 ? 'success' :
                      imageAnalysis.overallScore >= 60 ? 'warning' : 'error'
                    }>
                      {imageAnalysis.overallScore}/100
                    </Badge>
                  </div>
                  {imageAnalysis.strengths && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-1">Pontos Fortes:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {imageAnalysis.strengths.slice(0, 3).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {imageAnalysis.improvements && (
                    <div>
                      <p className="text-xs font-medium text-orange-600 mb-1">Melhorias:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside">
                        {imageAnalysis.improvements.slice(0, 3).map((imp, i) => (
                          <li key={i}>{imp.suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {suggestions ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sugestões Geradas</CardTitle>
                  <div className="flex gap-2">
                    {['headlines', 'descriptions', 'ctas', 'images', 'seasonal', 'variations'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-lg transition-colors",
                          activeTab === tab 
                            ? "bg-primary-100 text-primary-700" 
                            : "text-gray-500 hover:bg-gray-100"
                        )}
                      >
                        {tab === 'headlines' && 'Headlines'}
                        {tab === 'descriptions' && 'Descrições'}
                        {tab === 'ctas' && 'CTAs'}
                        {tab === 'images' && 'Imagens'}
                        {tab === 'seasonal' && 'Sazonal'}
                        {tab === 'variations' && 'Variações'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Headlines */}
                {activeTab === 'headlines' && suggestions.headlines && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {suggestions.headlines.length} headlines gerados (máx. 30 caracteres)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyAll(suggestions.headlines)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Todos
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {suggestions.headlines.map((headline, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                        >
                          <div className="flex-1">
                            <span className="text-gray-900">{headline}</span>
                            <span className={cn(
                              "ml-2 text-xs",
                              headline.length > 30 ? "text-red-500" : "text-gray-400"
                            )}>
                              ({headline.length}/30)
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(headline, `headline-${idx}`)}
                            className="p-1.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedItems[`headline-${idx}`] ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Descriptions */}
                {activeTab === 'descriptions' && suggestions.descriptions && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {suggestions.descriptions.length} descrições (máx. 90 caracteres)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCopyAll(suggestions.descriptions)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar Todas
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {suggestions.descriptions.map((desc, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                        >
                          <div className="flex-1">
                            <span className="text-gray-900">{desc}</span>
                            <span className={cn(
                              "ml-2 text-xs",
                              desc.length > 90 ? "text-red-500" : "text-gray-400"
                            )}>
                              ({desc.length}/90)
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(desc, `desc-${idx}`)}
                            className="p-1.5 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedItems[`desc-${idx}`] ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTAs */}
                {activeTab === 'ctas' && suggestions.callToActions && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Calls to Action sugeridos
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {suggestions.callToActions.map((cta, idx) => (
                        <button 
                          key={idx}
                          onClick={() => handleCopy(cta, `cta-${idx}`)}
                          className="p-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors text-center"
                        >
                          {copiedItems[`cta-${idx}`] ? (
                            <Check className="w-4 h-4 mx-auto text-green-500" />
                          ) : (
                            cta
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Ideas */}
                {activeTab === 'images' && suggestions.imageIdeas && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      Ideias de imagens para seus anúncios
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {suggestions.imageIdeas.map((idea, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">{idea.concept}</h4>
                          <p className="text-sm text-gray-600 mb-3">{idea.description}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{idea.format}</Badge>
                            <Badge variant="secondary">{idea.mood}</Badge>
                            {idea.colors?.map((color, cIdx) => (
                              <Badge key={cIdx} variant="secondary">{color}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seasonal */}
                {activeTab === 'seasonal' && suggestions.seasonalSuggestions && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Sugestões para datas comemorativas
                    </p>
                    <div className="space-y-4">
                      {suggestions.seasonalSuggestions.map((seasonal, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-medium text-gray-900">{seasonal.event}</h4>
                            <Badge variant="warning">{seasonal.date}</Badge>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Headlines temáticos:</p>
                            {seasonal.headlines?.map((h, hIdx) => (
                              <div key={hIdx} className="text-sm text-gray-600 pl-4 border-l-2 border-primary-200">
                                {h}
                              </div>
                            ))}
                            {seasonal.description && (
                              <>
                                <p className="text-sm font-medium text-gray-700 mt-2">Descrição:</p>
                                <p className="text-sm text-gray-600 pl-4 border-l-2 border-primary-200">
                                  {seasonal.description}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ad Variations */}
                {activeTab === 'variations' && (
                  <div className="space-y-4">
                    {suggestions.adVariations?.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-500">
                          {suggestions.adVariations.length} variações de anúncio completo
                        </p>
                        <div className="space-y-4">
                          {suggestions.adVariations.map((variation, idx) => (
                            <div key={idx} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">{variation.name}</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateVariations(variation)}
                                  disabled={isGeneratingVariations}
                                >
                                  <RefreshCw className={cn(
                                    "w-4 h-4 mr-2",
                                    isGeneratingVariations && "animate-spin"
                                  )} />
                                  Gerar 5 Variações
                                </Button>
                              </div>
                              <p className="text-sm text-gray-500 mb-3">
                                Tema: {variation.theme} | Público: {variation.targetAudience}
                              </p>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-500">H1:</p>
                                  <p>{variation.headline1}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-500">H2:</p>
                                  <p>{variation.headline2}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-500">H3:</p>
                                  <p>{variation.headline3}</p>
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-500">Descrição 1:</p>
                                  <p>{variation.description1}</p>
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-500">Descrição 2:</p>
                                  <p>{variation.description2}</p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="primary">{variation.suggestedCTA}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          Gere anúncios primeiro para ver as variações
                        </p>
                      </div>
                    )}

                    {/* Generated Variations */}
                    {variations && (
                      <div className="mt-6 pt-6 border-t">
                        <h4 className="font-medium text-gray-900 mb-4">
                          5 Variações Geradas
                        </h4>
                        <div className="space-y-4">
                          {variations.variations?.map((v, idx) => (
                            <div key={idx} className="p-4 bg-primary-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="primary">{v.name}</Badge>
                                <span className="text-sm text-gray-500">{v.approach}</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <p><strong>H1:</strong> {v.headline1}</p>
                                <p><strong>H2:</strong> {v.headline2}</p>
                                <p><strong>H3:</strong> {v.headline3}</p>
                                <p><strong>D1:</strong> {v.description1}</p>
                                <p><strong>D2:</strong> {v.description2}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                {v.testHypothesis}
                              </p>
                            </div>
                          ))}
                        </div>
                        {variations.testingRecommendations && (
                          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                            <p className="font-medium text-yellow-800 mb-2">
                              Recomendações de Teste:
                            </p>
                            <ul className="text-sm text-yellow-700 list-disc list-inside">
                              {variations.testingRecommendations.tips?.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Wand2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Crie Anúncios com IA
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Preencha o briefing ao lado com informações sobre seu produto e público 
                    para gerar headlines, descrições, CTAs e ideias de imagens otimizadas 
                    para Performance Max.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Generation Info */}
      {suggestions?.generatedAt && (
        <p className="text-sm text-gray-400 text-center">
          Gerado em {new Date(suggestions.generatedAt).toLocaleString('pt-BR')}
          {suggestions.model && ` • Modelo: ${suggestions.model}`}
          {suggestions.tokensUsed && ` • Tokens: ${suggestions.tokensUsed.total}`}
        </p>
      )}
    </div>
  );
};

export default AIAdGenerator;
