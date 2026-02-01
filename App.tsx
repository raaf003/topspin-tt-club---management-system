
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Matches } from './pages/Matches';
import { Payments } from './pages/Payments';
import { Players } from './pages/Players';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';

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
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
};

export default App;
