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
import { DebugExport } from './pages/DebugExport';
import { Login } from './pages/Login';
import { Loader2 } from 'lucide-react';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useApp();

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

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/players" element={<Players />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/players/:id" element={<PlayerProfile />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/debug-export" element={<DebugExport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
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
