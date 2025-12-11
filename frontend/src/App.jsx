import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './state/authStore';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';
import AuthLayout from './components/layout/AuthLayout';

// Pages - Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Pages - Manager
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerClients from './pages/manager/Clients';
import ManagerCampaigns from './pages/manager/Campaigns';
import ManagerAlerts from './pages/manager/Alerts';
import ManagerHistory from './pages/manager/History';
import ManagerSettings from './pages/manager/Settings';

// Pages - Client
import ClientDashboard from './pages/client/Dashboard';
import ClientCampaigns from './pages/client/Campaigns';
import ClientSettings from './pages/client/Settings';

// Pages - Shared
import CampaignDetail from './pages/shared/CampaignDetail';
import AIRecommendations from './pages/shared/AIRecommendations';
import AIDiagnosis from './pages/shared/AIDiagnosis';
import AIAdGenerator from './pages/shared/AIAdGenerator';
import AssetGroups from './pages/shared/AssetGroups';
import SearchTerms from './pages/shared/SearchTerms';
import ListingGroups from './pages/shared/ListingGroups';
import Chat from './pages/shared/Chat';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    return user?.role === 'manager' ? '/manager/dashboard' : '/client/dashboard';
  };

  return (
    <Routes>
      {/* Redirect root */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Manager Routes */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ManagerDashboard />} />
        <Route path="clients" element={<ManagerClients />} />
        <Route path="campaigns" element={<ManagerCampaigns />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
        <Route path="campaigns/:campaignId/asset-groups" element={<AssetGroups />} />
        <Route path="campaigns/:campaignId/search-terms" element={<SearchTerms />} />
        <Route path="campaigns/:campaignId/listing-groups" element={<ListingGroups />} />
        <Route path="chat" element={<Chat />} />
        <Route path="alerts" element={<ManagerAlerts />} />
        <Route path="history" element={<ManagerHistory />} />
        <Route path="ai" element={<AIRecommendations />} />
        <Route path="ai/diagnosis/:campaignId" element={<AIDiagnosis />} />
        <Route path="ai/generator" element={<AIAdGenerator />} />
        <Route path="settings" element={<ManagerSettings />} />
      </Route>

      {/* Client Routes */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={['client']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="campaigns" element={<ClientCampaigns />} />
        <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
        <Route path="campaigns/:campaignId/asset-groups" element={<AssetGroups />} />
        <Route path="campaigns/:campaignId/search-terms" element={<SearchTerms />} />
        <Route path="campaigns/:campaignId/listing-groups" element={<ListingGroups />} />
        <Route path="chat" element={<Chat />} />
        <Route path="ai" element={<AIRecommendations />} />
        <Route path="ai/diagnosis/:campaignId" element={<AIDiagnosis />} />
        <Route path="ai/generator" element={<AIAdGenerator />} />
        <Route path="alerts" element={<ManagerAlerts />} />
        <Route path="history" element={<ManagerHistory />} />
        <Route path="settings" element={<ClientSettings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

export default App;
