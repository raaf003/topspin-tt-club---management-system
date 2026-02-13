import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, DollarSign, Save, Plus, Trash2, CheckCircle, AlertCircle, Edit3, X, TrendingUp, TrendingDown, Wallet, PieChart, RefreshCw } from 'lucide-react';
import { api } from '../api';
import { User, UserRole, AuditLog } from '../types';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';

export const AdminPanel: React.FC = () => {
  const { refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'users' | 'rates' | 'profit' | 'logs'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Profit Summary state
  const [profitSummary, setProfitSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalDistributed: 0,
    remainingProfit: 0
  });

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: UserRole.STAFF as UserRole, profitPercentage: 0 });
  const [editingUser, setEditingUser] = useState<{ id: string, name: string, email: string, password?: string, role: UserRole, profitPercentage?: number } | null>(null);
  const [rates, setRates] = useState({ rate10: 10, rate20: 20 });
  const [profitDetails, setProfitDetails] = useState({ 
    amount: 0, 
    description: '', 
    mode: 'EQUAL' as 'EQUAL' | 'PERCENTAGE' 
  });

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchRates();
    fetchProfitSummary();
  }, []);

  const fetchProfitSummary = async () => {
    try {
      const data = await api.get('/admin/profit-summary');
      setProfitSummary(data);
    } catch (err) {
      console.error('Failed to fetch profit summary', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api.get('/admin/users');
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await api.get('/admin/audit-logs');
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const fetchRates = async () => {
    try {
      const data = await api.get('/admin/match-rates');
      const r10 = data.find((r: any) => r.type === '10_POINTS')?.price || 20;
      const r20 = data.find((r: any) => r.type === '20_POINTS')?.price || 30;
      setRates({ rate10: r10, rate20: r20 });
    } catch (err) {
      console.error('Failed to fetch rates', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/users', {
        email: newUser.email.toLowerCase().trim(),
        password: newUser.password,
        name: newUser.name,
        role: newUser.role,
        profitPercentage: newUser.profitPercentage
      });
      setMessage({ type: 'success', text: 'User created successfully' });
      setNewUser({ name: '', email: '', password: '', role: UserRole.STAFF, profitPercentage: 0 });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create user' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role });
      setMessage({ type: 'success', text: 'Role updated' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    }
  };

  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);
    try {
      await api.patch(`/admin/users/${editingUser.id}`, {
        name: editingUser.name,
        email: editingUser.email.toLowerCase().trim(),
        role: editingUser.role,
        profitPercentage: editingUser.profitPercentage,
        ...(editingUser.password ? { password: editingUser.password } : {})
      });
      setMessage({ type: 'success', text: 'User details updated' });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePartner = async (user: User) => {
    try {
      await api.patch(`/admin/users/${user.id}`, { isPartner: !user.isPartner });
      setMessage({ type: 'success', text: 'Partner status toggled' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    }
  };

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/match-rates', {
        rates: [
          { type: '10_POINTS', price: rates.rate10 },
          { type: '20_POINTS', price: rates.rate20 }
        ]
      });
      setMessage({ type: 'success', text: 'Match rates updated successfully' });
      fetchRates();
      refreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDistributeProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to distribute ₹${profitDetails.amount} via ${profitDetails.mode} split?`)) return;
    setLoading(true);
    try {
      await api.post('/admin/distribute-profit', profitDetails);
      setMessage({ type: 'success', text: 'Profits distributed successfully' });
      setProfitDetails({ amount: 0, description: '', mode: 'EQUAL' });
      fetchProfitSummary();
      refreshData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Distribution failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-indigo-600" />
            Super Admin Panel
          </h1>
          <p className="text-slate-500 dark:text-slate-400">System management and audit controls</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto text-sm font-bold">DISMISS</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Users className="w-4 h-4" /> User Management
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'rates' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Activity className="w-4 h-4" /> Match Rates
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'profit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <DollarSign className="w-4 h-4" /> Profit Sharing
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <Activity className="w-4 h-4" /> Audit Logs
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Form Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingUser ? 'Edit User' : 'Create New User'}
                  </h3>
                  {editingUser && (
                    <button 
                      onClick={() => setEditingUser(null)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> CANCEL
                    </button>
                  )}
                </div>

                <form onSubmit={editingUser ? handleUpdateUserDetails : handleCreateUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="user-name" className="block text-xs font-bold text-slate-500 mb-1">NAME</label>
                      <input
                        id="user-name"
                        type="text"
                        required
                        value={editingUser ? editingUser.name : newUser.name}
                        placeholder="Full Name"
                        onChange={e => editingUser 
                          ? setEditingUser({...editingUser, name: e.target.value})
                          : setNewUser({...newUser, name: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="user-email" className="block text-xs font-bold text-slate-500 mb-1">EMAIL / USERNAME</label>
                      <input
                        id="user-email"
                        type="text"
                        required
                        value={editingUser ? editingUser.email : newUser.email}
                        placeholder="user@example.com"
                        onChange={e => editingUser
                          ? setEditingUser({...editingUser, email: e.target.value})
                          : setNewUser({...newUser, email: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="user-password" className="block text-xs font-bold text-slate-500 mb-1">
                        {editingUser ? 'NEW PASSWORD (OPT) ' : 'PASSWORD'}
                      </label>
                      <input
                        id="user-password"
                        type="password"
                        required={!editingUser}
                        value={editingUser ? (editingUser.password || '') : newUser.password}
                        placeholder={editingUser ? "Leave blank" : "••••••••"}
                        onChange={e => editingUser
                          ? setEditingUser({...editingUser, password: e.target.value})
                          : setNewUser({...newUser, password: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="user-role" className="block text-xs font-bold text-slate-500 mb-1">ROLE</label>
                      <select
                        id="user-role"
                        title="Select User Role"
                        value={editingUser ? editingUser.role : newUser.role}
                        onChange={e => editingUser
                          ? setEditingUser({...editingUser, role: e.target.value as UserRole})
                          : setNewUser({...newUser, role: e.target.value as UserRole})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={UserRole.STAFF}>Staff</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="user-profit" className="block text-xs font-bold text-slate-500 mb-1">PROFIT SHARE PERCENTAGE (%)</label>
                    <input
                      id="user-profit"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={editingUser ? (editingUser.profitPercentage || 0) : newUser.profitPercentage}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        editingUser 
                          ? setEditingUser({...editingUser, profitPercentage: val})
                          : setNewUser({...newUser, profitPercentage: val});
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 italic">Only applies if marked as PARTNER.</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 ${editingUser ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20'}`}
                    >
                      {editingUser ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {loading ? 'SAVING...' : (editingUser ? 'UPDATE USER' : 'CREATE USER')}
                    </button>
                    {editingUser && (
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* User List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Existing Users</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map(user => (
                    <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between group hover:ring-2 hover:ring-indigo-500/20 transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            user.role === UserRole.SUPER_ADMIN ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
                            user.role === UserRole.ADMIN ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{user.email}</p>
                        {user.isPartner && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <PieChart className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              {user.profitPercentage}% Profit Share
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser({ 
                            id: user.id, 
                            name: user.name, 
                            email: user.email, 
                            role: user.role, 
                            profitPercentage: user.profitPercentage 
                          })}
                          className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors shadow-sm"
                          title="Edit User Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePartner(user)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm ${user.isPartner ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                        >
                          PARTNER: {user.isPartner ? 'YES' : 'NO'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rates' && (
          <div className="max-w-2xl mx-auto py-8">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Match Rate Configuration</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Set the billing amount for different point formats used in the club.</p>
            </div>

            <form onSubmit={handleUpdateRates} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 font-bold">10</div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">10 Points Format</p>
                      <p className="text-xs text-slate-500">Short match format</p>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      value={rates.rate10}
                      onChange={e => setRates({...rates, rate10: parseInt(e.target.value)})}
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl pl-8 pr-4 py-4 text-2xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 font-bold">20</div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">20 Points Format</p>
                      <p className="text-xs text-slate-500">Regular match format</p>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      value={rates.rate20}
                      onChange={e => setRates({...rates, rate20: parseInt(e.target.value)})}
                      className="w-full bg-white dark:bg-slate-900 border-none rounded-xl pl-8 pr-4 py-4 text-2xl font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-12 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  <Save className="w-5 h-5" /> {loading ? 'UPDATING...' : 'SAVE RATE CONFIGURATION'}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'profit' && (
          <div className="space-y-8">
            {/* Profit Summary Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-emerald-500 rounded-lg text-white">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">TOTAL REVENUE</span>
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">₹{profitSummary.totalRevenue.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-rose-500 rounded-lg text-white">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">TOTAL EXPENSES</span>
                </div>
                <p className="text-2xl font-black text-rose-700 dark:text-rose-300">₹{profitSummary.totalExpenses.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl shadow-indigo-500/5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500 rounded-lg text-white">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">NET PROFIT</span>
                </div>
                <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">₹{profitSummary.netProfit.toLocaleString()}</p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500 rounded-lg text-white">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">REMAINING LIQUIDITY</span>
                </div>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-300">₹{profitSummary.remainingProfit.toLocaleString()}</p>
                <p className="text-[10px] text-amber-600/60 mt-1 uppercase font-bold">After Dist. (₹{profitSummary.totalDistributed})</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Distribution Form */}
              <div className="lg:col-span-1 space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Distribute Payout</h3>
                  <form onSubmit={handleDistributeProfit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500">DISTRIBUTION MODE</label>
                      <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setProfitDetails({...profitDetails, mode: 'EQUAL'})}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${profitDetails.mode === 'EQUAL' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          EQUAL SPLIT
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfitDetails({...profitDetails, mode: 'PERCENTAGE'})}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${profitDetails.mode === 'PERCENTAGE' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                          % BASED
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="profit-amount" className="block text-xs font-bold text-slate-500">TOTAL AMOUNT (₹)</label>
                      <div className="relative">
                        <input
                          id="profit-amount"
                          type="number"
                          required
                          value={profitDetails.amount}
                          onChange={e => setProfitDetails({...profitDetails, amount: parseFloat(e.target.value)})}
                          className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-black text-xl focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setProfitDetails({...profitDetails, amount: profitSummary.remainingProfit})}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                          USE MAX
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="profit-desc" className="block text-xs font-bold text-slate-500">DESCRIPTION</label>
                      <textarea
                        id="profit-desc"
                        value={profitDetails.description}
                        onChange={e => setProfitDetails({...profitDetails, description: e.target.value})}
                        placeholder="e.g., Monthly Profit Payout - March 2024"
                        className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white h-24 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || profitDetails.amount <= 0 || profitDetails.amount > profitSummary.remainingProfit}
                      className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      <DollarSign className="w-5 h-5" /> {loading ? 'PROCESSING...' : 'DISTRIBUTE NOW'}
                    </button>
                    {profitDetails.amount > profitSummary.remainingProfit && (
                      <p className="text-[10px] text-rose-500 font-bold text-center">Amount exceeds remaining liquidity!</p>
                    )}
                  </form>
                </div>
              </div>

              {/* Partners Preview */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Active Partners</h3>
                  <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg">
                    {users.filter(u => u.isPartner).length} PARTNERS
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {users.filter(u => u.isPartner).map(partner => (
                    <div key={partner.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{partner.name}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{partner.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase">Share</p>
                        <p className="text-xl font-black text-indigo-600">
                          {profitDetails.mode === 'PERCENTAGE' ? `${partner.profitPercentage}%` : `1/${users.filter(u => u.isPartner).length}`}
                        </p>
                        {profitDetails.amount > 0 && (
                          <p className="text-[10px] font-bold text-emerald-500">
                             + ₹{profitDetails.mode === 'PERCENTAGE' 
                              ? (profitDetails.amount * (partner.profitPercentage / 100)).toFixed(2)
                              : (profitDetails.amount / users.filter(u => u.isPartner).length).toFixed(2)
                             }
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {users.filter(u => u.isPartner).length === 0 && (
                    <div className="col-span-2 py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No partners configured</p>
                      <button onClick={() => setActiveTab('users')} className="mt-2 text-indigo-600 font-bold text-sm">SET PARTNERS IN USER TAB</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Audit Trail</h3>
                <p className="text-xs text-slate-500">Security and activity history across the platform</p>
              </div>
              <button 
                onClick={fetchLogs}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> REFRESH
              </button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white dark:bg-slate-900/50">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actor</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Context ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {logs.map(log => (
                      <tr key={log.id} className="group hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {(log.user?.name || 'S')[0]}
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.user?.name || 'System'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md tracking-tighter ${
                            log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                            log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                            'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-mono text-slate-400 italic">
                          {log.resourceId ? `${log.resourceId}` : '-'}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Activity className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm font-medium">No activity recorded yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
