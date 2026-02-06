import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
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

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
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
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
