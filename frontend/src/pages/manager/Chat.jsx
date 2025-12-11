import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../state/chatStore';
import { useAuthStore } from '../../state/authStore';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
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
  Smile
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const Chat = () => {
  const { user } = useAuthStore();
  const { 
    conversations, 
    activeConversation, 
    messages, 
    isLoading,
    fetchConversations, 
    selectConversation,
    sendMessage 
  } = useChatStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    loadClients();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;
    
    sendMessage(activeConversation.id, newMessage.trim());
    setNewMessage('');
  };

  const handleStartNewChat = async (clientId) => {
    try {
      const response = await api.post('/chat/conversations', { client_id: clientId });
      await fetchConversations();
      selectConversation(response.data.id);
      setShowNewChat(false);
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participant_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isManager = user?.role === 'manager';

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-lg shadow overflow-hidden">
      {/* Lista de Conversas */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Conversas</h2>
            {isManager && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowNewChat(!showNewChat)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Nova Conversa (para managers) */}
        {showNewChat && (
          <div className="p-4 border-b bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-2">Iniciar conversa com:</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleStartNewChat(client.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-sm text-gray-700">{client.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => selectConversation(conversation.id)}
              className={cn(
                "w-full flex items-start gap-3 p-4 border-b hover:bg-gray-50 transition-colors text-left",
                activeConversation?.id === conversation.id && "bg-primary-50"
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-primary-600" />
                </div>
                {conversation.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate">
                    {conversation.participant_name}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {conversation.last_message_at && formatRelative(conversation.last_message_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mt-1">
                  {conversation.last_message || 'Nenhuma mensagem'}
                </p>
                {conversation.unread_count > 0 && (
                  <Badge variant="primary" className="mt-1">
                    {conversation.unread_count} {conversation.unread_count === 1 ? 'nova' : 'novas'}
                  </Badge>
                )}
              </div>
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </div>
          )}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {activeConversation.participant_name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeConversation.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === user.id;
                const showDate = index === 0 || 
                  new Date(message.created_at).toDateString() !== 
                  new Date(messages[index - 1]?.created_at).toDateString();

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                          {formatDateTime(message.created_at).split(' ')[0]}
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      "flex",
                      isOwn ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "max-w-[70%] rounded-lg px-4 py-2 shadow-sm",
                        isOwn 
                          ? "bg-primary-600 text-white rounded-br-none" 
                          : "bg-white text-gray-900 rounded-bl-none"
                      )}>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          isOwn ? "text-primary-200" : "text-gray-400"
                        )}>
                          <span className="text-xs">
                            {formatDateTime(message.created_at).split(' ')[1]}
                          </span>
                          {isOwn && (
                            message.read_at ? (
                              <CheckCheck className="w-4 h-4" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm">
                  <Smile className="w-5 h-5 text-gray-500" />
                </Button>
                <Button type="button" variant="ghost" size="sm">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <UserIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Selecione uma conversa</h3>
            <p className="text-sm">Escolha uma conversa na lista para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
