import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, DollarSign, Save, Plus, Trash2, CheckCircle, AlertCircle, Edit3, X } from 'lucide-react';
import { api } from '../api';
import { User, UserRole, AuditLog } from '../types';
import { format } from 'date-fns';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'rates' | 'profit' | 'logs'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: UserRole.STAFF as UserRole });
  const [editingUser, setEditingUser] = useState<{ id: string, name: string, email: string, password?: string, role: UserRole } | null>(null);
  const [rates, setRates] = useState({ rate10: 10, rate20: 20 });
  const [profitDetails, setProfitDetails] = useState({ amount: 0, description: '' });

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    fetchRates();
  }, []);

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
      const r10 = data.find((r: any) => r.type === '10_POINTS')?.price || 10;
      const r20 = data.find((r: any) => r.type === '20_POINTS')?.price || 20;
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
        role: newUser.role
      });
      setMessage({ type: 'success', text: 'User created successfully' });
      setNewUser({ name: '', email: '', password: '', role: UserRole.STAFF });
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
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleDistributeProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to distribute ₹${profitDetails.amount}?`)) return;
    setLoading(true);
    try {
      await api.post('/admin/distribute-profit', profitDetails);
      setMessage({ type: 'success', text: 'Profits distributed successfully' });
      setProfitDetails({ amount: 0, description: '' });
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
                  <div>
                    <label htmlFor="user-password" className="block text-xs font-bold text-slate-500 mb-1">
                      {editingUser ? 'NEW PASSWORD (OPTIONAL)' : 'PASSWORD'}
                    </label>
                    <input
                      id="user-password"
                      type="password"
                      required={!editingUser}
                      value={editingUser ? (editingUser.password || '') : newUser.password}
                      placeholder={editingUser ? "Leave blank to keep current" : "••••••••"}
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
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex-1 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${editingUser ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      {editingUser ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {loading ? 'SAVING...' : (editingUser ? 'UPDATE USER' : 'CREATE USER')}
                    </button>
                    {editingUser && (
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* User List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Existing Users</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {users.map(user => (
                    <div key={user.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email} • {user.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingUser({ id: user.id, name: user.name, email: user.email, role: user.role })}
                          className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Edit User Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePartner(user)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${user.isPartner ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                        >
                          PARTNER: {user.isPartner ? 'YES' : 'NO'}
                        </button>
                        <select
                          title="Update User Role"
                          value={user.role}
                          onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                          className="bg-white dark:bg-slate-700 text-xs border-none rounded-lg px-2 py-1"
                        >
                          <option value={UserRole.STAFF}>STAFF</option>
                          <option value={UserRole.ADMIN}>ADMIN</option>
                          <option value={UserRole.SUPER_ADMIN}>S_ADMIN</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rates' && (
          <form onSubmit={handleUpdateRates} className="max-w-md space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Club Match Rates</h3>
            <p className="text-slate-500 text-sm">Update the cost per match for different point formats.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="rate-10" className="block text-xs font-bold text-slate-500">10 POINT MATCH (₹)</label>
                <input
                  id="rate-10"
                  type="number"
                  title="Price for 10 point match"
                  value={rates.rate10}
                  onChange={e => setRates({...rates, rate10: parseInt(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-lg font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rate-20" className="block text-xs font-bold text-slate-500">20 POINT MATCH (₹)</label>
                <input
                  id="rate-20"
                  type="number"
                  title="Price for 20 point match"
                  value={rates.rate20}
                  onChange={e => setRates({...rates, rate20: parseInt(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-lg font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" /> {loading ? 'SAVING...' : 'UPDATE RATES'}
            </button>
          </form>
        )}

        {activeTab === 'profit' && (
          <form onSubmit={handleDistributeProfit} className="max-w-md space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Partner Profit Distribution</h3>
            <p className="text-slate-500 text-sm">Calculate and record profit payouts for the current month. This creates individual income records for each User marked as Partner.</p>

            <div className="space-y-2">
              <label htmlFor="profit-amount" className="block text-xs font-bold text-slate-500">TOTAL AMOUNT TO DISTRIBUTE (₹)</label>
              <input
                id="profit-amount"
                type="number"
                required
                title="Amount to distribute among partners"
                value={profitDetails.amount}
                onChange={e => setProfitDetails({...profitDetails, amount: parseFloat(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="profit-desc" className="block text-xs font-bold text-slate-500">DESCRIPTION</label>
              <textarea
                id="profit-desc"
                title="Description for profit distribution"
                value={profitDetails.description}
                onChange={e => setProfitDetails({...profitDetails, description: e.target.value})}
                placeholder="Details of distribution (e.g., February 2024 Profits)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white h-24"
              />
            </div>

            <button
              type="submit"
              disabled={loading || profitDetails.amount <= 0}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <DollarSign className="w-5 h-5" /> {loading ? 'DISTRIBUTING...' : 'DISTRIBUTE PROFITS'}
            </button>
          </form>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Audit Trail</h3>
              <button 
                onClick={fetchLogs}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh Logs"
              >
                <Activity className="w-5 h-5 text-indigo-600" />
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Time</th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Resource</th>
                    <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map(log => (
                    <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                      </td>
                      <td className="py-3 text-xs font-bold text-slate-900 dark:text-white">
                        {log.user?.name || 'System'}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                          log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-slate-600 dark:text-slate-400">
                        {log.resource}
                      </td>
                      <td className="py-3 text-[10px] font-mono text-slate-400">
                        {log.resourceId ? `${log.resourceId.substring(0, 8)}...` : '-'}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500 italic">No logs found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
