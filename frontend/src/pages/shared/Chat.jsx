import { useEffect, useState, useRef, useCallback } from 'react';
import { useChatStore } from '../../state/chatStore';
import { useAuthStore } from '../../state/authStore';
import { socketService } from '../../services/socket';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { formatDateTime, formatRelative } from '../../utils/date';
import { 
  Send, 
  Search, 
  Plus, 
  User as UserIcon, 
  Check, 
  CheckCheck,
  MoreVertical,
  Paperclip,
  Image as ImageIcon,
  X,
  Download,
  ArrowLeft,
  Phone,
  Video,
  Mic
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const Chat = () => {
  const { user, token } = useAuthStore();
  const { 
    conversations, 
    currentConversation,
    messages, 
    isLoading,
    isTyping,
    fetchConversations, 
    fetchMessages,
    sendMessage,
    createConversation,
    addMessage,
    markAsRead,
    setTyping,
    uploadAttachment,
    leaveConversation
  } = useChatStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(null);

  // Inicializar socket
  useEffect(() => {
    if (token) {
      socketService.connect(token);
      
      // Configurar listeners
      socketService.onNewMessage((message) => {
        addMessage(message);
        
        // Notificar se não estiver na conversa atual
        if (message.conversationId !== currentConversation) {
          showNotification(message);
        }
      });

      socketService.onUserTyping(({ conversationId, userId }) => {
        if (userId !== user.id) {
          setTyping(conversationId, userId, true);
        }
      });

      socketService.onUserStopTyping(({ conversationId, userId }) => {
        setTyping(conversationId, userId, false);
      });

      socketService.onMessagesRead(({ conversationId, messageIds }) => {
        useChatStore.getState().updateMessagesRead(conversationId, messageIds);
      });

      socketService.onUserOnline(({ userId }) => {
        setOnlineUsers(prev => new Set([...prev, userId]));
      });

      socketService.onUserOffline(({ userId }) => {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      });
    }

    return () => {
      if (currentConversation) {
        socketService.leaveConversation(currentConversation);
      }
    };
  }, [token]);

  useEffect(() => {
    fetchConversations();
    loadClients();
  }, []);

  useEffect(() => {
    scrollToBottom();
    
    // Marcar mensagens como lidas
    if (currentConversation && messages.length > 0) {
      const unreadIds = messages
        .filter(m => !m.read && m.senderId !== user.id)
        .map(m => m.id);
      
      if (unreadIds.length > 0) {
        markAsRead(currentConversation, unreadIds);
        socketService.markAsRead(currentConversation, unreadIds);
      }
    }
  }, [messages, currentConversation]);

  const showNotification = (message) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova mensagem', {
        body: message.content?.substring(0, 100) || 'Arquivo anexado',
        icon: '/favicon.ico'
      });
    }
  };

  useEffect(() => {
    // Solicitar permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/users/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = useCallback(() => {
    if (!currentConversation) return;
    
    // Emitir evento de digitação com debounce
    const now = Date.now();
    if (!lastTypingRef.current || now - lastTypingRef.current > 2000) {
      socketService.startTyping(currentConversation);
      lastTypingRef.current = now;
    }

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Parar de digitar após 3 segundos sem atividade
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(currentConversation);
      lastTypingRef.current = null;
    }, 3000);
  }, [currentConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentConversation) return;
    
    // Parar indicador de digitação
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketService.stopTyping(currentConversation);

    // Se tiver arquivo, fazer upload primeiro
    if (selectedFile) {
      setIsUploading(true);
      const result = await uploadAttachment(currentConversation, selectedFile);
      setIsUploading(false);
      
      if (!result.success) {
        console.error('Erro ao enviar arquivo:', result.error);
      }
      
      clearFileSelection();
    }

    // Enviar mensagem de texto
    if (newMessage.trim()) {
      await sendMessage(currentConversation, newMessage.trim());
      setNewMessage('');
    }
  };

  const handleSelectConversation = async (conversationId) => {
    // Sair da conversa anterior
    if (currentConversation) {
      socketService.leaveConversation(currentConversation);
    }
    
    // Entrar na nova conversa
    await fetchMessages(conversationId);
    setShowMobileChat(true);
  };

  const handleStartNewChat = async (clientId) => {
    const result = await createConversation(clientId);
    if (result.success) {
      await handleSelectConversation(result.conversation.id);
      setShowNewChat(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo permitido: 10MB');
      return;
    }

    setSelectedFile(file);

    // Criar preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearFileSelection = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBackToList = () => {
    leaveConversation(currentConversation);
    setShowMobileChat(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.participant?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isManager = user?.role === 'manager' || user?.role === 'admin';
  const currentConversationData = conversations.find(c => c.id === currentConversation);

  const getTypingIndicator = () => {
    const typingData = isTyping[currentConversation];
    if (!typingData) return null;
    
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm px-4 py-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span>digitando...</span>
      </div>
    );
  };

  const renderMessage = (message, index) => {
    const isOwn = message.senderId === user.id;
    const showDate = index === 0 || 
      new Date(message.createdAt).toDateString() !== 
      new Date(messages[index - 1]?.createdAt).toDateString();

    const hasAttachment = message.attachmentUrl;
    const isImage = message.attachmentType?.startsWith('image/');

    return (
      <div key={message.id}>
        {showDate && (
          <div className="flex justify-center my-4">
            <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
              {new Date(message.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
        )}
        <div className={cn(
          "flex mb-2",
          isOwn ? "justify-end" : "justify-start"
        )}>
          <div className={cn(
            "max-w-[75%] rounded-2xl shadow-sm",
            isOwn 
              ? "bg-primary-600 text-white rounded-br-md" 
              : "bg-white text-gray-900 rounded-bl-md",
            hasAttachment && !message.content ? "p-1" : "px-4 py-2"
          )}>
            {/* Anexo */}
            {hasAttachment && (
              <div className={cn(
                "mb-1",
                !message.content && "p-0"
              )}>
                {isImage ? (
                  <img 
                    src={message.attachmentUrl} 
                    alt={message.attachmentName || 'Imagem'}
                    className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(message.attachmentUrl, '_blank')}
                  />
                ) : (
                  <a 
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg",
                      isOwn ? "bg-primary-700" : "bg-gray-100"
                    )}
                  >
                    <Paperclip className="w-5 h-5" />
                    <span className="flex-1 truncate text-sm">
                      {message.attachmentName || 'Arquivo'}
                    </span>
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* Conteúdo */}
            {message.content && (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}

            {/* Hora e status */}
            <div className={cn(
              "flex items-center justify-end gap-1 mt-1",
              isOwn ? "text-primary-200" : "text-gray-400"
            )}>
              <span className="text-xs">
                {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {isOwn && (
                message.read ? (
                  <CheckCheck className="w-4 h-4 text-blue-300" />
                ) : (
                  <Check className="w-4 h-4" />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Lista de Conversas */}
      <div className={cn(
        "w-full md:w-96 border-r flex flex-col bg-white",
        showMobileChat && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-primary-600 to-primary-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Conversas</h2>
            {isManager && (
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-primary-500"
                onClick={() => setShowNewChat(!showNewChat)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/60 border-0 focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Nova Conversa */}
        {showNewChat && (
          <div className="p-4 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Iniciar conversa com:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleStartNewChat(client.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{client.name}</span>
                    <p className="text-xs text-gray-500">{client.email}</p>
                  </div>
                </button>
              ))}
              {clients.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum cliente disponível
                </p>
              )}
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const isOnline = onlineUsers.has(conversation.participantId);
            const isActive = currentConversation === conversation.id;
            
            return (
              <button
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-4 border-b hover:bg-gray-50 transition-colors text-left",
                  isActive && "bg-primary-50 border-l-4 border-l-primary-600"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {conversation.participantName?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.participantName || 'Usuário'}
                    </h3>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {conversation.lastMessageAt && formatRelative(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage || 'Iniciar conversa'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full flex-shrink-0">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <UserIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>{searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-gray-100",
        !showMobileChat && !currentConversation && "hidden md:flex"
      )}>
        {currentConversation && currentConversationData ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleBackToList}
                  className="md:hidden p-1 -ml-1 text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {currentConversationData.participantName?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {onlineUsers.has(currentConversationData.participantId) && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {currentConversationData.participantName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.has(currentConversationData.participantId) ? (
                      <span className="text-green-600">Online</span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Video className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Mensagens */}
            <div 
              className="flex-1 overflow-y-auto p-4"
              style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                    <Send className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm">Envie a primeira mensagem!</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => renderMessage(message, index))}
                  {getTypingIndicator()}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preview de arquivo */}
            {selectedFile && (
              <div className="px-4 pt-2 bg-white border-t">
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-lg">
                  {filePreview ? (
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <Paperclip className="w-6 h-6 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button 
                    onClick={clearFileSelection}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
              <div className="flex items-end gap-2">
                <div className="flex gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current?.click();
                    }}
                    disabled={isUploading}
                  >
                    <ImageIcon className="w-5 h-5 text-gray-500" />
                  </Button>
                </div>
                
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Digite uma mensagem..."
                    rows={1}
                    className="w-full px-4 py-2.5 rounded-full border border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none"
                    style={{ maxHeight: '120px' }}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className="rounded-full w-10 h-10 p-0 flex items-center justify-center"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : newMessage.trim() || selectedFile ? (
                    <Send className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center mb-6">
              <Send className="w-16 h-16 text-primary-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">AdsOptimizer Chat</h3>
            <p className="text-center max-w-md">
              Selecione uma conversa na lista ou inicie uma nova para começar a trocar mensagens
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
