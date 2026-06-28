import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, LogIn, AlertCircle, Loader2, Phone } from 'lucide-react';
import { api } from '../api';

export const Login: React.FC = () => {
  const { login, isDarkMode } = useApp();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { phone, password });
      login(response.user, response.token);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 dark:border-slate-800 transition-all">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img
              src={isDarkMode ? '/topspin_dark.png' : '/topspin_light.png'}
              alt="TopSpin TT Club"
              className="h-20 w-auto"
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">
            Welcome Back!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Sign in to access your dashboard
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-semibold animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-500 transition-colors">
              <Phone className="w-5 h-5" />
            </div>
            <input
              type="tel"
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-rose-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-semibold outline-none transition-all"
            />
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-rose-500 transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-rose-500 focus:bg-white dark:focus:bg-slate-800 rounded-2xl text-slate-900 dark:text-white font-semibold outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-2xl font-bold shadow-xl shadow-rose-100 dark:shadow-rose-900/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

