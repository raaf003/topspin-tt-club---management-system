
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { IndianRupee, TrendingUp, AlertCircle, PlusCircle, CheckCircle2, Calendar, ChevronDown, Filter, Percent, Zap, Clock, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole, PaymentMode } from '../types';

export const Dashboard: React.FC = () => {
  const { players, matches, payments, getPlayerStats, currentUser, ongoingMatch, clearOngoingMatch } = useApp();
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Period Filtering State for Admins
  const [filterType, setFilterType] = useState<'today' | 'month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(todayStr);

  const activeMatches = useMemo(() => {
    if (!isAdmin || filterType === 'today') {
      return matches.filter(m => m.date === todayStr);
    }
    if (filterType === 'month') {
      return matches.filter(m => m.date.startsWith(currentMonthStr));
    }
    return matches.filter(m => m.date === customDate);
  }, [matches, filterType, customDate, todayStr, currentMonthStr, isAdmin]);

  const activePayments = useMemo(() => {
    if (!isAdmin || filterType === 'today') {
      return payments.filter(p => p.date === todayStr);
    }
    if (filterType === 'month') {
      return payments.filter(p => p.date.startsWith(currentMonthStr));
    }
    return payments.filter(p => p.date === customDate);
  }, [payments, filterType, customDate, todayStr, currentMonthStr, isAdmin]);

  const grossRevenue = activeMatches.reduce((sum, m) => sum + m.totalValue, 0);
  const totalDiscounts = activePayments.reduce((sum, p) => 
    sum + p.allocations.reduce((s, a) => s + (a.discount || 0), 0), 0
  );
  
  const netRevenue = grossRevenue - totalDiscounts;
  const collectedForPeriod = activePayments.reduce((sum, p) => sum + p.totalAmount, 0);
  
  const monthlyRevenue = useMemo(() => {
    const monthMatches = matches.filter(m => m.date.startsWith(currentMonthStr));
    const monthPayments = payments.filter(p => p.date.startsWith(currentMonthStr));
    
    const mGross = monthMatches.reduce((sum, m) => sum + m.totalValue, 0);
    const mDiscounts = monthPayments.reduce((sum, p) => 
      sum + p.allocations.reduce((s, a) => s + (a.discount || 0), 0), 0
    );
    
    return mGross - mDiscounts;
  }, [matches, payments, currentMonthStr]);

  // FIX: Only sum positive pending balances to show actual gross dues (Receivables)
  const totalDues = useMemo(() => {
    return players.reduce((sum, p) => {
      const pending = getPlayerStats(p.id).pending;
      return sum + (pending > 0 ? pending : 0);
    }, 0);
  }, [players, getPlayerStats]);

  const liveMatchData = useMemo(() => {
    if (!ongoingMatch) return null;
    const pA = players.find(p => p.id === ongoingMatch.playerAId);
    const pB = players.find(p => p.id === ongoingMatch.playerBId);
    return { ...ongoingMatch, pA, pB };
  }, [ongoingMatch, players]);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 italic tracking-tight">Assalam-u-alikum! 👋</h2>
            <p className="text-gray-500 font-medium text-sm">Welcome to TopSpin TT Hub.</p>
          </div>
          <Link 
            to="/matches" 
            className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-transform"
          >
            <PlusCircle className="w-6 h-6" />
          </Link>
        </div>

        {/* Ongoing Match - Flashing UI */}
        {liveMatchData && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden ring-4 ring-indigo-50 border-2 border-indigo-400">
              {/* Flashing Background Effect */}
              <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
              
              <div className="flex justify-between items-start relative z-10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Live Match Ongoing</span>
                </div>
                <button 
                  onClick={() => clearOngoingMatch()}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between relative z-10 gap-4">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black mb-2 shadow-inner border border-white/10">
                    {liveMatchData.pA?.name[0]}
                  </div>
                  <div className="font-bold text-sm truncate">{liveMatchData.pA?.name}</div>
                  <div className="text-[8px] font-black uppercase opacity-60">Player A</div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="text-xs font-black italic opacity-40 uppercase tracking-widest mb-1">VS</div>
                  <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                    <span className="text-2xl font-black italic">{liveMatchData.points}p</span>
                  </div>
                </div>

                <div className="flex-1 text-center">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center text-2xl font-black mb-2 shadow-inner border border-white/10">
                    {liveMatchData.pB?.name[0]}
                  </div>
                  <div className="font-bold text-sm truncate">{liveMatchData.pB?.name}</div>
                  <div className="text-[8px] font-black uppercase opacity-60">Player B</div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between relative z-10 border-t border-white/10 pt-4">
                <div className="flex items-center gap-4 text-[10px] font-bold text-indigo-100">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {liveMatchData.table}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Started: {new Date(liveMatchData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/matches')}
                  className="bg-white text-indigo-600 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
                >
                  Record Result
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Period Selector for Admins */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-4 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
            <button 
              onClick={() => setFilterType('today')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'today' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Today
            </button>
            <button 
              onClick={() => setFilterType('month')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterType === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              This Month
            </button>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-xl transition-all ${filterType === 'custom' ? 'bg-indigo-50 border border-indigo-100' : ''}`}>
               <input 
                 type="date" 
                 value={customDate} 
                 onChange={(e) => {
                   setCustomDate(e.target.value);
                   setFilterType('custom');
                 }}
                 className="bg-transparent text-xs font-bold outline-none text-indigo-600"
               />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <StatCard 
            label={filterType === 'today' ? "Net Revenue Today" : filterType === 'month' ? "Net Revenue (Month)" : "Net Revenue (Selected)"} 
            value={`₹${netRevenue}`} 
            icon={<TrendingUp className="text-emerald-500 w-5 h-5" />}
            className="bg-emerald-50 border border-emerald-100"
            subLabel={totalDiscounts > 0 ? `₹${totalDiscounts} discounted` : undefined}
          />
          <StatCard 
            label="Total Dues" 
            value={`₹${totalDues}`} 
            icon={<AlertCircle className="text-rose-500 w-5 h-5" />}
            className="bg-rose-50 border border-rose-100"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
            <IndianRupee className="w-24 h-24" />
          </div>
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monthly Target</h3>
          <div className="text-3xl font-black text-indigo-600">₹{monthlyRevenue}</div>
          <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Effective value (Match Value - Waivers)</p>
        </div>

        {isAdmin && (
          <div className="bg-gray-900 p-5 rounded-3xl text-white shadow-xl shadow-gray-200">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" />
              Actual Collection (Cash)
            </h3>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-2xl font-black">₹{collectedForPeriod}</div>
                <div className="text-[10px] opacity-60 font-bold uppercase">Cash/Online Received</div>
              </div>
              <Link to="/reports" className="text-[10px] font-black bg-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-500 transition-colors">
                FULL REPORT
              </Link>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-lg tracking-tight">Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickButton to="/matches" label="New Match" color="bg-indigo-600" />
          <QuickButton to="/payments" label="Record Payment" color="bg-blue-600" />
          <QuickButton to="/players" label="Add Player" color="bg-orange-500" />
          {isAdmin && <QuickButton to="/expenses" label="Expenses" color="bg-gray-700" />}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg tracking-tight">Recent Battles</h3>
            <Link to="/matches" className="text-xs font-bold text-indigo-600 uppercase">View All</Link>
          </div>
          <div className="space-y-3">
            {matches.slice(0, 5).map(match => (
              <MatchItem key={match.id} match={match} />
            ))}
            {matches.length === 0 && (
              <div className="text-center py-8 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-bold italic text-sm">No matches logged yet...</p>
              </div>
            )}
          </div>
        </section>
        
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg tracking-tight">Recent Payments</h3>
            <Link to="/payments" className="text-xs font-bold text-emerald-600 uppercase">View All</Link>
          </div>
          <div className="space-y-3">
            {payments.slice(0, 5).map(p => (
              <PaymentItem key={p.id} payment={p} />
            ))}
            {payments.length === 0 && (
              <div className="text-center py-8 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-bold italic text-sm">No transactions yet...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; className?: string; subLabel?: string }> = ({ label, value, icon, className, subLabel }) => (
  <div className={`p-5 rounded-[2rem] shadow-sm ${className}`}>
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
      <div className="bg-white/50 p-1.5 rounded-lg shadow-sm">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
    {subLabel && <div className="text-[9px] font-bold text-emerald-600 uppercase mt-1 flex items-center gap-1"><Percent className="w-2.5 h-2.5" /> {subLabel}</div>}
  </div>
);

const QuickButton: React.FC<{ to: string; label: string; color: string }> = ({ to, label, color }) => (
  <Link to={to} className={`${color} text-white px-4 py-5 rounded-[1.5rem] text-center font-black text-xs shadow-lg shadow-gray-100 active:scale-95 transition-transform uppercase tracking-wider`}>
    {label}
  </Link>
);

const MatchItem: React.FC<{ match: any }> = ({ match }) => {
  const { players } = useApp();
  const pA = players.find(p => p.id === match.playerAId)?.name || 'Unknown';
  const pB = players.find(p => p.id === match.playerBId)?.name || 'Unknown';
  
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${match.points === 20 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
          {match.points}p
        </div>
        <div>
          <div className="font-bold text-sm text-gray-900 leading-tight">{pA} vs {pB}</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{match.date} • {match.table || 'Table 1'}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-gray-900">₹{match.totalValue}</div>
        <div className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">{match.payerOption.replace('_', ' ')}</div>
      </div>
    </div>
  );
}

const PaymentItem: React.FC<{ payment: any }> = ({ payment }) => {
  const { players } = useApp();
  const payer = players.find(p => p.id === payment.primaryPayerId)?.name || 'Unknown';
  
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${payment.mode === PaymentMode.ONLINE ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {payment.mode === PaymentMode.ONLINE ? 'GP' : 'CA'}
        </div>
        <div>
          <div className="font-bold text-sm truncate max-w-[120px] text-gray-900 leading-tight">
            {payer} {payment.allocations.length > 1 && <span className="text-emerald-500 font-black">+ {payment.allocations.length - 1}</span>}
          </div>
          <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">{payment.date}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-black text-emerald-600">₹{payment.totalAmount}</div>
        <div className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">Verified</div>
      </div>
    </div>
  );
}
