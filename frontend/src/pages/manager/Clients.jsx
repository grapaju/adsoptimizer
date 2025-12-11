import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { formatCurrency, formatNumber } from '../../utils/format';
import { formatDate } from '../../utils/date';
import { Users, Search, Plus, Mail, Phone, Building2, MoreVertical } from 'lucide-react';
import { cn, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ManagerClients = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  const fetchClients = async (params = {}) => {
    setIsLoading(true);
    try {
      const response = await api.get('/users/clients', { params });
      setClients(response.data.clients);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients({ search });
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">Gerencie seus clientes e suas contas</p>
        </div>
        
        <Button icon={Plus}>
          Novo Cliente
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar clientes por nome, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-medium">
                      {client.avatar_url ? (
                        <img src={client.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(client.name)
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{client.name}</h3>
                      <Badge variant={client.is_active ? 'success' : 'danger'}>
                        {client.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </div>
                  {client.company && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4" />
                      {client.company}
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      {client.phone}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{client.campaign_count}</p>
                    <p className="text-xs text-gray-500">Campanhas</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(client.spend_30d)}</p>
                    <p className="text-xs text-gray-500">Gasto (30d)</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Cliente desde {formatDate(client.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {clients.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerClients;
