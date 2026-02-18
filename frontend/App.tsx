import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { Payments } from './pages/Payments';
import { Players } from './pages/Players';
import { PlayerProfile } from './pages/PlayerProfile';
import { Leaderboard } from './pages/Leaderboard';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { AdminPanel } from './pages/AdminPanel';
import { DebugExport } from './pages/DebugExport';
import { Login } from './pages/Login';
import { Loader2, ShieldAlert } from 'lucide-react';
import { NavigationGuard } from './components/NavigationGuard';
import { UserRole } from './types';

const UnauthorizedPage = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
    <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
      <ShieldAlert className="w-12 h-12 text-red-600 dark:text-red-400" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
    <p className="text-gray-500 dark:text-gray-400 max-w-md">
      You don't have the required permissions to view this page. Please contact an administrator if you believe this is an error.
    </p>
  </div>
);

const ProtectedRoute: React.FC<{ 
  element: React.ReactElement; 
  allowedRoles?: UserRole[] 
}> = ({ element, allowedRoles }) => {
  const { isAuthenticated, currentUser } = useApp();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <UnauthorizedPage />;
  }

  return element;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading, currentUser } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">LOADING TOPSPIN HUB...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const adminRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

  return (
    <NavigationGuard>
      <Layout>
        <Routes>
          {/* Dashboard only for ADMIN/SUPER_ADMIN, STAFF redirects to Matches */}
          <Route path="/" element={
            currentUser.role === UserRole.STAFF 
              ? <Navigate to="/matches" replace /> 
              : <ProtectedRoute element={<Dashboard />} allowedRoles={adminRoles} />
          } />
          
          <Route path="/matches" element={<ProtectedRoute element={<Matches />} />} />
          <Route path="/payments" element={<ProtectedRoute element={<Payments />} />} />
          <Route path="/players" element={<ProtectedRoute element={<Players />} />} />
          <Route path="/leaderboard" element={<ProtectedRoute element={<Leaderboard />} allowedRoles={adminRoles} />} />
          <Route path="/players/:id" element={<ProtectedRoute element={<PlayerProfile />} />} />
          
          {/* Admin-only Routes */}
          <Route path="/expenses" element={<ProtectedRoute element={<Expenses />} allowedRoles={adminRoles} />} />
          <Route path="/reports" element={<ProtectedRoute element={<Reports />} allowedRoles={adminRoles} />} />
          {/* Admin Panel - Only SUPER_ADMIN */}
          <Route path="/admin" element={<ProtectedRoute element={<AdminPanel />} allowedRoles={[UserRole.SUPER_ADMIN]} />} />
          <Route path="/debug-export" element={<ProtectedRoute element={<DebugExport />} allowedRoles={[UserRole.SUPER_ADMIN]} />} />
          
          <Route path="*" element={
            currentUser.role === UserRole.STAFF 
              ? <Navigate to="/matches" replace /> 
              : <Navigate to="/" replace />
          } />
        </Routes>
      </Layout>
    </NavigationGuard>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
};

export default App;
