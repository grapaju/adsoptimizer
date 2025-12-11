/**
 * Componente de Preview de Anúncios
 * Mostra prévia de como os anúncios aparecerão nas diferentes plataformas
 */
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import { 
  Monitor, 
  Smartphone, 
  Image as ImageIcon,
  Upload,
  X,
  ExternalLink,
  Play,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../utils/helpers';

/**
 * Componente de Preview de Anúncios PMax
 * @param {object} adData - Dados do anúncio (headlines, descriptions, images, etc)
 * @param {function} onUploadImage - Callback para upload de imagem
 */
const AdPreview = ({ 
  adData = {}, 
  onUploadImage,
  isEditable = false 
}) => {
  const [selectedDevice, setSelectedDevice] = useState('desktop');
  const [selectedFormat, setSelectedFormat] = useState('search');
  const [selectedHeadline, setSelectedHeadline] = useState(0);
  const [selectedDescription, setSelectedDescription] = useState(0);
  const [uploadedImages, setUploadedImages] = useState([]);

  const {
    headlines = [],
    descriptions = [],
    images = [],
    logoUrl,
    businessName = 'Sua Empresa',
    finalUrl = 'www.seusite.com.br',
    displayPath = ['produto', 'categoria']
  } = adData;

  // Handler de upload de imagem
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = {
          id: Date.now() + Math.random(),
          url: event.target.result,
          name: file.name,
          type: file.type
        };
        setUploadedImages(prev => [...prev, newImage]);
        if (onUploadImage) {
          onUploadImage(newImage);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remover imagem
  const handleRemoveImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Rotacionar headlines/descriptions
  const rotateHeadline = () => {
    if (headlines.length > 0) {
      setSelectedHeadline((prev) => (prev + 1) % headlines.length);
    }
  };

  const rotateDescription = () => {
    if (descriptions.length > 0) {
      setSelectedDescription((prev) => (prev + 1) % descriptions.length);
    }
  };

  // Preview de anúncio de pesquisa
  const SearchAdPreview = () => (
    <div className={cn(
      "bg-white border rounded-lg p-4",
      selectedDevice === 'mobile' ? "max-w-[320px]" : "max-w-[600px]"
    )}>
      <div className="space-y-1">
        {/* URL e badge de anúncio */}
        <div className="flex items-center gap-2 text-sm">
          <span className="px-1 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            Patrocinado
          </span>
          <span className="text-gray-600 truncate">
            {finalUrl}
            {displayPath.length > 0 && ` › ${displayPath.join(' › ')}`}
          </span>
        </div>
        
        {/* Headline */}
        <button 
          onClick={rotateHeadline}
          className="text-left group"
        >
          <h3 className="text-lg text-blue-700 hover:underline group-hover:underline">
            {headlines[selectedHeadline] || 'Seu Headline Aqui'}
          </h3>
        </button>
        
        {/* Description */}
        <button 
          onClick={rotateDescription}
          className="text-left block"
        >
          <p className="text-sm text-gray-600">
            {descriptions[selectedDescription] || 'Sua descrição do anúncio aparecerá aqui. Clique para ver outras variações.'}
          </p>
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
        <RefreshCw className="w-3 h-3" />
        Clique para ver outras variações
      </div>
    </div>
  );

  // Preview de anúncio Display
  const DisplayAdPreview = () => {
    const allImages = [...images, ...uploadedImages];
    const currentImage = allImages[0];

    return (
      <div className={cn(
        "bg-white border rounded-lg overflow-hidden",
        selectedDevice === 'mobile' ? "max-w-[300px]" : "max-w-[336px]"
      )}>
        {/* Imagem */}
        <div className="relative aspect-[1.91/1] bg-gray-100">
          {currentImage ? (
            <img 
              src={currentImage.url || currentImage} 
              alt="Ad preview" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-gray-300" />
            </div>
          )}
          
          {/* Badge patrocinado */}
          <span className="absolute top-2 left-2 px-1 py-0.5 text-xs bg-white/90 rounded text-gray-600">
            Patrocinado
          </span>
        </div>

        {/* Conteúdo */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
            {headlines[selectedHeadline] || 'Seu Headline Aqui'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {descriptions[selectedDescription] || 'Descrição do anúncio'}
          </p>
          
          {/* CTA */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {logoUrl && (
                <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded" />
              )}
              <span className="text-xs text-gray-600">{businessName}</span>
            </div>
            <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded">
              Saiba mais
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Preview de anúncio YouTube
  const YouTubeAdPreview = () => (
    <div className={cn(
      "bg-black rounded-lg overflow-hidden",
      selectedDevice === 'mobile' ? "max-w-[320px]" : "max-w-[560px]"
    )}>
      {/* Player */}
      <div className="relative aspect-video bg-gray-900">
        {images[0] ? (
          <img 
            src={images[0].url || images[0]} 
            alt="Video thumbnail" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-white/50" />
          </div>
        )}
        
        {/* Overlay de anúncio */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-4">
          <div className="flex items-center gap-3">
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-full" />
            )}
            <div className="flex-1">
              <h3 className="text-white font-medium text-sm">
                {headlines[selectedHeadline] || 'Seu Headline Aqui'}
              </h3>
              <p className="text-white/70 text-xs">
                {businessName} • Patrocinado
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded">
              Acessar
            </button>
          </div>
        </div>
        
        {/* Skip ad button */}
        <div className="absolute bottom-4 right-4 px-3 py-1 bg-gray-800/80 text-white text-xs rounded">
          Pular anúncio em 5s
        </div>
      </div>
    </div>
  );

  // Preview de Gmail
  const GmailAdPreview = () => (
    <div className="bg-white border rounded-lg max-w-[600px]">
      {/* Header do email */}
      <div className="flex items-center gap-3 p-3 border-b">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-primary-600 font-medium">
              {businessName.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{businessName}</span>
            <span className="px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded">
              Anúncio
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">
            {headlines[selectedHeadline] || 'Assunto do email promocional'}
          </p>
        </div>
      </div>
      
      {/* Conteúdo expandido */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-2">
          {headlines[selectedHeadline] || 'Seu Headline Aqui'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {descriptions[selectedDescription] || 'Descrição do anúncio aparecerá aqui com mais detalhes sobre sua oferta.'}
        </p>
        
        {images[0] && (
          <img 
            src={images[0].url || images[0]} 
            alt="Ad" 
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        
        <button className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg">
          Ver Oferta
        </button>
      </div>
    </div>
  );

  // Renderizar preview baseado no formato
  const renderPreview = () => {
    switch (selectedFormat) {
      case 'search':
        return <SearchAdPreview />;
      case 'display':
        return <DisplayAdPreview />;
      case 'youtube':
        return <YouTubeAdPreview />;
      case 'gmail':
        return <GmailAdPreview />;
      default:
        return <SearchAdPreview />;
    }
  };

  const formats = [
    { id: 'search', label: 'Pesquisa' },
    { id: 'display', label: 'Display' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'gmail', label: 'Gmail' }
  ];

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Seletor de formato */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                selectedFormat === format.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {format.label}
            </button>
          ))}
        </div>

        {/* Seletor de dispositivo */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDevice('desktop')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              selectedDevice === 'desktop'
                ? "bg-primary-100 text-primary-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            )}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedDevice('mobile')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              selectedDevice === 'mobile'
                ? "bg-primary-100 text-primary-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            )}
          >
            <Smartphone className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Área de preview */}
      <div className="bg-gray-50 rounded-xl p-6 min-h-[300px] flex items-center justify-center">
        {renderPreview()}
      </div>

      {/* Upload de imagens (se editável) */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagens do Anúncio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Imagens existentes + uploadadas */}
              {[...images, ...uploadedImages].map((image, index) => (
                <div 
                  key={image.id || index}
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
                >
                  <img 
                    src={image.url || image} 
                    alt={`Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {image.id && (
                    <button
                      onClick={() => handleRemoveImage(image.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Botão de upload */}
              <label className="aspect-square bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p>Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.</p>
              <p>Tamanhos recomendados: 1200x628 (Landscape), 1200x1200 (Square), 960x1200 (Portrait)</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Clique nos textos para ver variações
        </div>
        <div className="flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Preview aproximado
        </div>
      </div>
    </div>
  );
};

export default AdPreview;
