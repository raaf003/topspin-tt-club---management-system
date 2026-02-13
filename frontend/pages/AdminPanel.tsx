import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, DollarSign, Save, Plus, Trash2, CheckCircle, AlertCircle, Edit3, X, TrendingUp, TrendingDown, Wallet, PieChart, RefreshCw, Mail } from 'lucide-react';
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
  const [showAddForm, setShowAddForm] = useState(false);
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
      setShowAddForm(false);
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
    <div className="space-y-4 md:space-y-5 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 md:gap-3 italic tracking-tight">
            <Shield className="w-6 h-6 md:w-7 md:h-7 text-indigo-600 animate-pulse" />
            Super Admin
          </h1>
          <p className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">System Controls & Audit</p>
        </div>
        
        {activeTab === 'logs' && (
          <button 
            onClick={fetchLogs}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] md:text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:shadow-md transition-all active:scale-95 uppercase tracking-widest"
          >
            <RefreshCw className="w-3 h-3" /> REFRESH LOGS
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3.5 rounded-2xl md:rounded-[1.5rem] flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-100 dark:border-rose-800'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="text-xs font-bold flex-1">{message.text}</span>
      <button 
        title="Close notification"
        onClick={() => setMessage(null)} 
        className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
      >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs - Scrollable on mobile */}
      <div className="flex bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-1 rounded-2xl md:rounded-[1.5rem] shadow-inner border border-white/20 dark:border-slate-800/50 overflow-x-auto no-scrollbar scroll-smooth gap-1 md:gap-1.5">
        <TabButton 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')} 
          icon={<Users className="w-3.5 h-3.5" />} 
          label="Users" 
        />
        <TabButton 
          active={activeTab === 'rates'} 
          onClick={() => setActiveTab('rates')} 
          icon={<Activity className="w-3.5 h-3.5" />} 
          label="Rates" 
        />
        <TabButton 
          active={activeTab === 'profit'} 
          onClick={() => setActiveTab('profit')} 
          icon={<DollarSign className="w-3.5 h-3.5" />} 
          label="Profits" 
        />
        <TabButton 
          active={activeTab === 'logs'} 
          onClick={() => setActiveTab('logs')} 
          icon={<Shield className="w-3.5 h-3.5" />} 
          label="Logs" 
        />
      </div>

      {/* Content wrapper */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'users' && (
          <div className="space-y-8 pb-8">
            {/* Form Section - Wider and centered for better balance */}
            <div className="max-w-3xl mx-auto">
              <div className={`bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group transition-all duration-300 ${(!showAddForm && !editingUser) ? 'p-3' : 'p-4 md:p-6'}`}>
                <div className={`flex items-center justify-between relative z-10 ${(!showAddForm && !editingUser) ? 'mb-0' : 'mb-5'}`}>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight flex items-center gap-2">
                      {editingUser ? 'Update Profile' : 'New Identity'}
                    </h3>
                    {(!showAddForm && !editingUser) ? (
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5 whitespace-nowrap">
                        Register a new system actor
                      </p>
                    ) : (
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                        {editingUser ? 'Modifying existing account' : 'Register system actor'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {editingUser ? (
                      <button 
                        title="Cancel Edit"
                        onClick={() => setEditingUser(null)}
                        className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all border border-rose-100 dark:border-rose-800"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`p-1.5 rounded-lg transition-all border flex items-center gap-2 px-3 ${
                          showAddForm 
                            ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500 border-rose-100 dark:border-rose-800' 
                            : 'bg-indigo-600 dark:bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                        }`}
                      >
                        {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-black uppercase tracking-tight">{showAddForm ? 'Close' : 'Add User'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {(showAddForm || editingUser) && (
                  <form onSubmit={editingUser ? handleUpdateUserDetails : handleCreateUser} className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Display Name</label>
                          <div className="relative group/input">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors">
                              <Users className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={editingUser ? editingUser.name : newUser.name}
                              placeholder="e.g., John Doe"
                              onChange={e => editingUser 
                                ? setEditingUser({...editingUser, name: e.target.value})
                                : setNewUser({...newUser, name: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-slate-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Email / ID</label>
                          <div className="relative group/input">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors">
                              <Mail className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              required
                              value={editingUser ? editingUser.email : newUser.email}
                              placeholder="john@topspin.com"
                              onChange={e => editingUser
                                ? setEditingUser({...editingUser, email: e.target.value})
                                : setNewUser({...newUser, email: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 focus:bg-white dark:focus:bg-slate-800/50 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 font-bold uppercase tracking-widest">
                             <label className="text-[9px] text-slate-400 pl-1">Secret Key</label>
                             <input
                              type="password"
                              required={!editingUser}
                              value={editingUser ? (editingUser.password || '') : newUser.password}
                              placeholder={editingUser ? "Leave blank" : "••••••••"}
                              onChange={e => editingUser
                                ? setEditingUser({...editingUser, password: e.target.value})
                                : setNewUser({...newUser, password: e.target.value})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white transition-all outline-none"
                            />
                          </div>
                          <div className="space-y-1 uppercase font-bold tracking-widest">
                            <label className="text-[9px] text-slate-400 pl-1">Level</label>
                            <select
                              title="Role"
                              value={editingUser ? editingUser.role : newUser.role}
                              onChange={e => editingUser
                                ? setEditingUser({...editingUser, role: e.target.value as UserRole})
                                : setNewUser({...newUser, role: e.target.value as UserRole})}
                              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-xl px-4 py-2.5 text-sm font-black text-slate-900 dark:text-white transition-all outline-none appearance-none"
                            >
                              <option value={UserRole.STAFF}>STAFF</option>
                              <option value={UserRole.ADMIN}>ADMIN</option>
                              <option value={UserRole.SUPER_ADMIN}>SUPER ADMIN</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                          <div className="flex items-center justify-between mb-2">
                             <label className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                               <PieChart className="w-3 h-3" /> Profit Cut %
                             </label>
                          </div>
                          <div className="relative">
                            <input
                              title="Profit Percentage"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editingUser ? (editingUser.profitPercentage || 0) : newUser.profitPercentage}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0;
                                const clamped = Math.min(100, Math.max(0, val));
                                editingUser 
                                  ? setEditingUser({...editingUser, profitPercentage: clamped})
                                  : setNewUser({...newUser, profitPercentage: clamped});
                              }}
                              className="w-full bg-white dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/20 rounded-xl px-4 py-2 text-sm font-black text-indigo-700 dark:text-indigo-300 transition-all outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-indigo-400 pointer-events-none">%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
                      <p className="flex-1 text-[8px] text-slate-400 font-bold uppercase italic leading-tight text-center md:text-left">
                        Account creation grants restricted access. User profit cuts only activate for PARTNER-enabled actors.
                      </p>
                      <button
                        type="submit"
                        disabled={loading}
                        className={`w-full md:w-auto md:min-w-[200px] text-white font-black py-3 px-8 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] ${editingUser ? 'shadow-none' : ''} ${editingUser ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 dark:shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'}`}
                      >
                        {editingUser ? <Save className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                        <span className="text-sm uppercase tracking-tighter">{loading ? 'Processing...' : (editingUser ? 'Commit Changes' : 'Initialize Account')}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* User List Section - Responsive Grid Layout */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                   <Users className="w-4 h-4 text-indigo-600" />
                   Active Identities
                 </h3>
                 <div className="flex items-center gap-2">
                   <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                     {users.length} Total
                   </span>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {users.map(user => (
                  <div key={user.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner border transition-colors ${
                          user.role === UserRole.SUPER_ADMIN ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 border-rose-100 dark:border-rose-900/50' :
                          user.role === UserRole.ADMIN ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-indigo-100 dark:border-indigo-900/50' :
                          'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700'
                        }`}>
                          {user.name[0].toUpperCase()}
                        </div>
                        <span className={`text-[7px] font-black px-2 py-1 rounded-lg tracking-widest uppercase ${
                          user.role === UserRole.SUPER_ADMIN ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-400' :
                          user.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                      
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight">{user.email}</p>
                      </div>

                      {user.isPartner && (
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 w-fit px-2 py-1 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
                          <PieChart className="w-3 h-3 text-emerald-500" />
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                            {user.profitPercentage}% SHARE
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50 dark:border-slate-800">
                      <button
                        onClick={() => setEditingUser({ 
                          id: user.id, 
                          name: user.name, 
                          email: user.email, 
                          role: user.role, 
                          profitPercentage: user.profitPercentage 
                        })}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest border border-transparent hover:border-indigo-100/50"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleTogglePartner(user)}
                        className={`flex-1 px-3 py-2 rounded-xl text-[8px] font-black tracking-widest uppercase transition-all ${user.isPartner ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                         {user.isPartner ? 'PARTNER' : '+ PARTNER'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rates' && (
          <div className="max-w-xl mx-auto py-2 md:py-4 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6 px-4">
              <div className="inline-flex p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-xl shadow-indigo-100 dark:shadow-none mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white italic tracking-tight">Economic Policy</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[9px] max-w-sm mx-auto font-medium mt-1 leading-relaxed uppercase tracking-widest">Define billing standards for game session formats</p>
            </div>

            <form onSubmit={handleUpdateRates} className="space-y-4 px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <RateConfigCard 
                  points={10} 
                  label="Short Match" 
                  value={rates.rate10} 
                  onChange={val => setRates({...rates, rate10: val})} 
                  color="blue"
                />
                <RateConfigCard 
                  points={20} 
                  label="Standard Pro" 
                  value={rates.rate20} 
                  onChange={val => setRates({...rates, rate20: val})} 
                  color="indigo"
                />
              </div>

              <div className="flex justify-center pt-2 pb-10 md:pb-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 dark:shadow-none active:scale-95 text-sm italic tracking-tight"
                >
                  <Save className="w-4 h-4" /> 
                  <span className="uppercase tracking-widest">{loading ? 'Saving...' : 'Authorize Rate Update'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'profit' && (
          <div className="space-y-4 md:space-y-6 pb-20 md:pb-0 animate-in slide-in-from-right-8 duration-500">
            {/* Profit Summary Bentogrid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
               <SummaryCard 
                  label="Gross Revenue" 
                  value={profitSummary.totalRevenue} 
                  icon={<TrendingUp className="w-4 h-4" />} 
                  color="emerald" 
                  desc="Platform Inflow"
               />
               <SummaryCard 
                  label="Operating Costs" 
                  value={profitSummary.totalExpenses} 
                  icon={<TrendingDown className="w-4 h-4" />} 
                  color="rose" 
                  desc="Total Expenses"
               />
               <SummaryCard 
                  label="Calculated Net" 
                  value={profitSummary.netProfit} 
                  icon={<PieChart className="w-4 h-4" />} 
                  color="indigo" 
                  desc="Taxable Margin"
               />
               <SummaryCard 
                  label="Distributable" 
                  value={profitSummary.remainingProfit} 
                  icon={<Wallet className="w-4 h-4" />} 
                  color="amber" 
                  desc="Liquid Buffer"
                  sub={`After Dist: ₹${profitSummary.totalDistributed}`}
               />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Distribution Console */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-4 md:p-5 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 relative z-10 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                  
                  <h3 className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight mb-4">Distribution Console</h3>
                  
                  <form onSubmit={handleDistributeProfit} className="space-y-4 relative z-10">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Logic Pattern</label>
                       <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setProfitDetails({...profitDetails, mode: 'EQUAL'})}
                          className={`py-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${profitDetails.mode === 'EQUAL' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50' : 'text-slate-400'}`}
                        >
                          Flat Split
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfitDetails({...profitDetails, mode: 'PERCENTAGE'})}
                          className={`py-2 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all ${profitDetails.mode === 'PERCENTAGE' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50' : 'text-slate-400'}`}
                        >
                          Weight
                        </button>
                       </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Payout Target (₹)</label>
                      <div className="relative group/input">
                        <input
                          title="Payout Amount"
                          type="number"
                          required
                          value={profitDetails.amount}
                          onChange={e => setProfitDetails({...profitDetails, amount: parseFloat(e.target.value)})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-black text-xl focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => setProfitDetails({...profitDetails, amount: profitSummary.remainingProfit})}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Ledger Note</label>
                      <textarea
                        value={profitDetails.description}
                        onChange={e => setProfitDetails({...profitDetails, description: e.target.value})}
                        placeholder="Purpose..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white h-20 text-xs font-medium outline-none transition-all placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || profitDetails.amount <= 0 || profitDetails.amount > profitSummary.remainingProfit}
                      className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98] text-sm italic tracking-tight uppercase"
                    >
                      <DollarSign className="w-4 h-4" /> {loading ? 'Processing...' : 'Settle Payouts'}
                    </button>
                    {profitDetails.amount > profitSummary.remainingProfit && (
                      <div className="flex items-center gap-2 justify-center text-rose-500 mt-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100/50 dark:border-rose-900/30">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Insufficient liquidity</span>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Partners Preview Bentogrid */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-600" /> Stakeholders
                  </h3>
                  <span className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    {users.filter(u => u.isPartner).length} Active
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.filter(u => u.isPartner).map(partner => {
                    const share = profitDetails.mode === 'PERCENTAGE' 
                      ? (profitDetails.amount * (partner.profitPercentage / 100))
                      : (profitDetails.amount / users.filter(u => u.isPartner).length);
                    
                    return (
                      <div key={partner.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="absolute right-0 top-0 p-3 opacity-[0.05] group-hover:scale-110 transition-transform">
                           <Users className="w-10 h-10 text-indigo-600" />
                        </div>
                        <div className="relative z-10">
                          <p className="font-black text-slate-900 dark:text-white text-sm leading-none mb-0.5">{partner.name}</p>
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest truncate">{partner.email}</p>
                          
                          <div className="mt-4 flex items-end justify-between">
                            <div>
                               <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-0.5">Share</p>
                               <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 italic">
                                 {profitDetails.mode === 'PERCENTAGE' ? `${partner.profitPercentage}%` : `SPLIT`}
                               </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[7px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-0.5">Projected</p>
                              <div className="flex items-center justify-end gap-1">
                                 <span className="text-base font-black text-slate-900 dark:text-white">₹{profitDetails.amount > 0 ? share.toFixed(0) : '0'}</span>
                                 {share > 0 && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {users.filter(u => u.isPartner).length === 0 && (
                    <div className="col-span-full py-10 text-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-2 border border-slate-100 dark:border-slate-700 text-slate-300">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 font-black italic uppercase tracking-widest text-[10px]">No stakeholders</p>
                      <button onClick={() => setActiveTab('users')} className="mt-2 text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-widest hover:underline px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">Initialize</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white italic tracking-tight flex items-center gap-2">
                   <Shield className="w-4 h-4 text-indigo-600" />
                   Audit Trail
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Live platform activity monitor</p>
              </div>
            </div>
            
            {/* Table for Desktop, Cards for Mobile */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Identity / Time</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">Operation</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none text-center">Entity</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none text-right">Contextual ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {logs.map(log => (
                      <tr key={log.id} className="group hover:bg-indigo-50/10 dark:hover:bg-indigo-900/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors shadow-inner">
                              {(log.user?.name || 'S')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white leading-none mb-1">{log.user?.name || 'System'}</p>
                              <p className="text-[8px] font-mono text-slate-400 uppercase font-bold tracking-tight">
                                {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md tracking-wider shadow-sm uppercase ${
                            log.action === 'CREATE' ? 'bg-emerald-500 text-white' :
                            log.action === 'UPDATE' ? 'bg-amber-500 text-white' :
                            'bg-rose-500 text-white'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                             <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{log.resource}</span>
                             <div className="w-4 h-0.5 bg-indigo-500/20 rounded-full"></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[9px] font-mono text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                            {log.resourceId ? `${log.resourceId}` : 'GL-GLOBAL'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-16 text-center">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 border border-dashed border-slate-200 dark:border-slate-700">
                            <Activity className="w-6 h-6 text-slate-200" />
                          </div>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Zero footprint detected</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Log Cards */}
            <div className="md:hidden space-y-2.5 pb-20">
              {logs.map(log => (
                <div key={log.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden active:scale-98 transition-transform">
                   <div className="flex items-center justify-between mb-2.5 border-b border-slate-50 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                           {(log.user?.name || 'S')[0]}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white leading-tight">{log.user?.name || 'System'}</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">
                            {format(new Date(log.timestamp), 'HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                         {log.action}
                      </span>
                   </div>
                   <div className="flex items-center justify-between text-[8px] font-bold">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[6px]">Resource</span>
                        <span className="text-slate-600 dark:text-slate-300 uppercase italic font-black">{log.resource}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-right">
                        <span className="text-slate-300 dark:text-slate-600 uppercase tracking-widest text-[6px]">Ident</span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono truncate max-w-[100px] italic">#{log.resourceId || 'GLOBAL'}</span>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* --- Visual Sub-components --- */

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl md:rounded-2xl text-[9px] md:text-xs font-bold transition-all uppercase tracking-widest active:scale-95 whitespace-nowrap ${
      active 
        ? 'bg-indigo-600 dark:bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' 
        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
    }`}
  >
    {icon} 
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const RateConfigCard: React.FC<{ points: number; label: string; value: number; onChange: (v: number) => void; color: string }> = ({ points, label, value, onChange, color }) => (
  <div className="group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 border-b-2 border-b-indigo-50 dark:border-b-indigo-950">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 dark:bg-${color}-500/20 flex flex-col items-center justify-center border border-${color}-100 dark:border-${color}-900/50 shadow-inner group-hover:scale-105 transition-transform`}>
        <span className={`text-sm font-black italic tracking-tighter text-${color}-600 dark:text-${color}-400`}>{points}</span>
        <span className={`text-[6px] font-black uppercase tracking-widest text-${color}-600/50 dark:text-${color}-400/50`}>PTS</span>
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-900 dark:text-white italic tracking-tight">{label}</h4>
        <div className="flex items-center gap-1 px-1 py-0.5 bg-slate-50 dark:bg-slate-800 rounded-md w-fit mt-0.5">
           <div className={`w-1 h-1 rounded-full bg-${color}-500`}></div>
           <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Pricing Model</p>
        </div>
      </div>
    </div>
    
    <div className="relative group/input">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300 dark:text-slate-700 italic group-focus-within/input:text-indigo-500 transition-colors">₹</div>
      <input
        title={`${label} pricing`}
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-8 pr-3 py-2 text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
      />
    </div>
  </div>
);

const SummaryCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string; desc: string; sub?: string }> = ({ label, value, icon, color, desc, sub }) => (
  <div className={`p-3.5 md:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-md transition-all border-b-2 border-b-${color}-500`}>
    <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg bg-${color}-500/10 text-${color}-500`}>{icon}</div>
        <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{desc}</span>
    </div>
    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</div>
    <p className={`text-base md:text-lg font-black text-slate-900 dark:text-white italic tracking-tight`}>₹{value.toLocaleString()}</p>
    {sub && <p className={`text-[7px] font-bold text-${color}-600 dark:text-${color}-400 uppercase mt-0.5 opacity-70`}>{sub}</p>}
  </div>
);

export default AdminPanel;
