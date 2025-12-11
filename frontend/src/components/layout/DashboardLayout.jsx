import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../state/authStore';
import { useAlertStore } from '../../state/alertStore';
import { useChatStore } from '../../state/chatStore';
import { socketService } from '../../services/socket';
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  MessageSquare, 
  Bell, 
  History, 
  Sparkles,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User
} from 'lucide-react';
import { cn, getInitials } from '../../utils/helpers';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { unreadCount, fetchUnreadCount, addMessage } = useChatStore();
  const navigate = useNavigate();

  const isManager = user?.role?.toUpperCase() === 'MANAGER';
  const basePath = isManager ? '/manager' : '/client';

  // Count unread alerts safely
  const unreadAlertsCount = Array.isArray(alerts) ? alerts.filter(a => !a.isRead).length : 0;

  const navigation = [
    { name: 'Dashboard', href: `${basePath}/dashboard`, icon: LayoutDashboard },
    ...(isManager ? [{ name: 'Clientes', href: `${basePath}/clients`, icon: Users }] : []),
    { name: 'Campanhas', href: `${basePath}/campaigns`, icon: Target },
    { name: 'Chat', href: `${basePath}/chat`, icon: MessageSquare, badge: unreadCount || 0 },
    { name: 'Alertas', href: `${basePath}/alerts`, icon: Bell, badge: unreadAlertsCount },
    { name: 'Histórico', href: `${basePath}/history`, icon: History },
    { name: 'IA & Recomendações', href: `${basePath}/ai`, icon: Sparkles },
  ];

  useEffect(() => {
    // Connect socket
    if (user?.id) {
      const socket = socketService.connect(user.id);
      
      // Listen for new messages
      socketService.onNewMessage((message) => {
        addMessage(message);
      });
    }

    // Fetch initial data
    fetchAlerts();
    fetchUnreadCount();

    return () => {
      socketService.removeAllListeners();
    };
  }, [user?.id]);

  const handleLogout = () => {
    socketService.disconnect();
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">AdsOptimizer</h1>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary-50 text-primary-600" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
              {item.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* User menu */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role === 'manager' ? 'Gestor' : 'Cliente'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <NavLink
                    to={`${basePath}/profile`}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="w-4 h-4" />
                    Meu Perfil
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
