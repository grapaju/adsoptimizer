import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '../../state/chatStore';
import { useAuthStore } from '../../state/authStore';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { formatDateTime } from '../../utils/date';
import { 
  Send, 
  User as UserIcon, 
  Check, 
  CheckCheck,
  Paperclip,
  Smile
} from 'lucide-react';
import { cn } from '../../utils/helpers';

const ClientChat = () => {
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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    // Para clientes, selecionar automaticamente a primeira conversa
    if (conversations.length > 0 && !activeConversation) {
      selectConversation(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;
    
    sendMessage(activeConversation.id, newMessage.trim());
    setNewMessage('');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Chat com Gestor</h1>
        <p className="text-gray-500">Converse diretamente com seu gestor de campanhas</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col h-[calc(100vh-280px)]">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {activeConversation.participant_name || 'Seu Gestor'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {activeConversation.is_online ? (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Online
                      </span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <UserIcon className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
                    <p className="text-sm">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === user.id;
                    const showDate = index === 0 || 
                      new Date(message.created_at).toDateString() !== 
                      new Date(messages[index - 1]?.created_at).toDateString();

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-gray-200 rounded-full text-xs text-gray-600">
                              {new Date(message.created_at).toLocaleDateString('pt-BR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
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
                  })
                )}
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
              <h3 className="text-lg font-medium text-gray-900">Nenhuma conversa</h3>
              <p className="text-sm">Aguarde seu gestor iniciar uma conversa</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ClientChat;
