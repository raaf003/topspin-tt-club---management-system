
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { IndianRupee, TrendingUp, AlertCircle, PlusCircle, CheckCircle2, Calendar, ChevronDown, Filter, Percent, Zap, Clock, X, Trophy, Star, Info, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole, PaymentMode } from '../types';
import { getLocalTodayStr } from '../utils';
import { getTopPerformers, getPlayerTier } from '../rankingUtils';

export const Dashboard: React.FC = () => {
  const { players, matches, payments, getPlayerStats, currentUser, ongoingMatch, clearOngoingMatch } = useApp();
  const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;
  const navigate = useNavigate();

  const todayStr = getLocalTodayStr();
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

  const topPlayers = useMemo(() => {
    return getTopPerformers(players, matches, getPlayerStats, 3);
  }, [players, getPlayerStats, matches]);

  const liveMatchData = useMemo(() => {
    if (!ongoingMatch) return null;
    const pA = players.find(p => p.id === ongoingMatch.playerAId);
    const pB = players.find(p => p.id === ongoingMatch.playerBId);
    return { ...ongoingMatch, pA, pB };
  }, [ongoingMatch, players]);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex justify-between items-start mb-4 px-1">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white italic tracking-tight transition-all">Assalam-u-alikum! 👋</h2>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-xs md:text-sm">Welcome to TopSpin TT Hub.</p>
          </div>
          <Link 
            to="/matches" 
            className="bg-indigo-600 text-white p-2.5 md:p-3 rounded-xl md:rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </div>

        {/* Ongoing Match - Flashing UI */}
        {liveMatchData && (
          <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-indigo-600 dark:bg-indigo-700 rounded-3xl md:rounded-[2.5rem] p-4 md:p-6 text-white shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20 relative overflow-hidden ring-4 ring-indigo-50 dark:ring-indigo-900/10 border-2 border-indigo-400 dark:border-indigo-500 transition-all">
              {/* Flashing Background Effect */}
              <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
              
              <div className="flex justify-between items-start relative z-10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Live Match Ongoing</span>
                </div>
                <button 
                  onClick={() => clearOngoingMatch()}
                  title="Clear ongoing match"
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between relative z-10 gap-2 md:gap-4">
                <div className="flex-1 text-center min-w-0">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center text-xl md:text-2xl font-black mb-1 md:mb-2 shadow-inner border border-white/10">
                    {liveMatchData.pA?.name?.[0] || '?'}
                  </div>
                  <div className="font-bold text-xs md:text-sm truncate">{liveMatchData.pA?.name || 'Unknown'}</div>
                  <div className="text-[7px] md:text-[8px] font-black uppercase opacity-60">Player A</div>
                </div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="text-[10px] font-black italic opacity-40 uppercase tracking-widest mb-1">VS</div>
                  <div className="bg-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-white/10 backdrop-blur-md">
                    <span className="text-xl md:text-2xl font-black italic">{liveMatchData.points}p</span>
                  </div>
                </div>

                <div className="flex-1 text-center min-w-0">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center text-xl md:text-2xl font-black mb-1 md:mb-2 shadow-inner border border-white/10">
                    {liveMatchData.pB?.name?.[0] || '?'}
                  </div>
                  <div className="font-bold text-xs md:text-sm truncate">{liveMatchData.pB?.name || 'Unknown'}</div>
                  <div className="text-[7px] md:text-[8px] font-black uppercase opacity-60">Player B</div>
                </div>
              </div>

              <div className="mt-4 md:mt-6 flex items-center justify-between relative z-10 border-t border-white/10 pt-3 md:pt-4">
                <div className="flex items-center gap-3 md:gap-4 text-[9px] md:text-[10px] font-bold text-indigo-100">
                  <div className="flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-400 fill-amber-400" />
                    {liveMatchData.table}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    {liveMatchData.startTime ? new Date(liveMatchData.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/matches')}
                  className="bg-white text-indigo-600 px-3 py-1.5 md:px-5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
                >
                  Record
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Period Selector for Admins */}
        {isAdmin && (
          <div className="flex items-center gap-1.5 mb-4 bg-white dark:bg-slate-900 p-1 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm w-fit transition-colors">
            <button 
              onClick={() => setFilterType('today')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all ${filterType === 'today' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              Today
            </button>
            <button 
              onClick={() => setFilterType('month')}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold transition-all ${filterType === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              Month
            </button>
            <div className={`flex items-center gap-1 px-1.5 py-1 rounded-lg transition-all ${filterType === 'custom' ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800' : ''}`}>
               <input 
                 type="date" 
                 value={customDate}
                 title="Select date"
                 aria-label="Select date"
                 onChange={(e) => {
                   setCustomDate(e.target.value);
                   setFilterType('custom');
                 }}
                 className="bg-transparent text-[10px] md:text-xs font-bold outline-none text-indigo-600 dark:text-indigo-400"
               />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <StatCard 
            label={filterType === 'today' ? "Today" : filterType === 'month' ? "Month" : "Selected"} 
            value={`₹${netRevenue}`} 
            icon={<TrendingUp className="text-emerald-500 w-4 h-4 md:w-5 md:h-5" />}
            className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50"
            subLabel={totalDiscounts > 0 ? `₹${totalDiscounts} waived` : undefined}
            tooltip="Net revenue for the selected period after discounts."
          />
          <StatCard 
            label="Total Dues" 
            value={`₹${totalDues}`} 
            icon={<AlertCircle className="text-rose-500 w-4 h-4 md:w-5 md:h-5" />}
            className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/50"
            tooltip="Total outstanding balance across all players."
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-all">
          <div className="absolute right-0 top-0 p-6 md:p-8 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform">
            <IndianRupee className="w-16 h-16 md:w-24 md:h-24 dark:text-white" />
          </div>
          <h3 className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Monthly Target</h3>
          <div className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">₹{monthlyRevenue}</div>
          <p className="text-[9px] text-gray-400 dark:text-slate-500 font-bold mt-1.5 md:mt-2 uppercase">Effective value (Gross - Waivers)</p>
        </div>

        {isAdmin && (
          <div className="bg-gray-900 dark:bg-slate-800 p-4 md:p-5 rounded-2xl md:rounded-3xl text-white shadow-xl shadow-gray-200 dark:shadow-none transition-all">
            <h3 className="text-[9px] md:text-[10px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
              Actual Collection
            </h3>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xl md:text-2xl font-black">₹{collectedForPeriod}</div>
                <div className="text-[8px] md:text-[10px] opacity-60 font-bold uppercase">Cash/Online Received</div>
              </div>
              <Link to="/reports" className="text-[8px] md:text-[10px] font-black bg-indigo-600 dark:bg-indigo-500 px-2 md:px-3 py-1.5 md:py-2 rounded-lg md:rounded-xl hover:bg-indigo-500 dark:hover:bg-indigo-400 transition-all">
                REPORTS
              </Link>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-base md:text-lg tracking-tight dark:text-white">Quick Access</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          <QuickButton to="/matches" label="New Match" color="bg-indigo-600 dark:bg-indigo-700 shadow-indigo-100 dark:shadow-indigo-900/20" />
          <QuickButton to="/payments" label="Record Pay" color="bg-blue-600 dark:bg-blue-700 shadow-blue-100 dark:shadow-blue-900/20" />
          <QuickButton to="/players" label="Add Player" color="bg-orange-500 dark:bg-orange-600 shadow-orange-100 dark:shadow-orange-900/20" />
          {isAdmin && <QuickButton to="/expenses" label="Expenses" color="bg-gray-700 dark:bg-slate-800 shadow-gray-100 dark:shadow-none" />}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-base md:text-lg tracking-tight dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top Rated
          </h3>
          <Link to="/leaderboard" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Leaderboard</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {topPlayers.map((p, idx) => (
            <TopPlayerItem key={p.id} player={p} rank={idx + 1} />
          ))}
          {topPlayers.length === 0 && (
            <div className="col-span-full text-center py-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800">
              <p className="text-gray-400 dark:text-slate-500 font-bold italic text-xs">Play at least 3 matches to rank!</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-10">
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base md:text-lg tracking-tight dark:text-white">Recent Battles</h3>
            <Link to="/matches" className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">View All</Link>
          </div>
          <div className="space-y-2.5 md:space-y-3">
            {matches.slice(0, 5).map(match => (
              <MatchItem key={match.id} match={match} />
            ))}
            {matches.length === 0 && (
              <div className="text-center py-6 md:py-8 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
                <p className="text-gray-400 dark:text-slate-500 font-bold italic text-xs md:text-sm">No matches yet...</p>
              </div>
            )}
          </div>
        </section>
        
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base md:text-lg tracking-tight dark:text-white">Recent Payments</h3>
            <Link to="/payments" className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">View All</Link>
          </div>
          <div className="space-y-2.5 md:space-y-3">
            {payments.slice(0, 5).map(p => (
              <PaymentItem key={p.id} payment={p} />
            ))}
            {payments.length === 0 && (
              <div className="text-center py-6 md:py-8 bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
                <p className="text-gray-400 dark:text-slate-500 font-bold italic text-xs md:text-sm">No transactions yet...</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const TopPlayerItem: React.FC<{ player: any; rank: number }> = ({ player, rank }) => {
  const navigate = useNavigate();
  const tier = getPlayerTier(player.score, player.stats);
  return (
    <div 
      onClick={() => navigate(`/players/${player.id}`)}
      className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl md:rounded-[1.5rem] border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:shadow-md cursor-pointer transition-all active:scale-[0.98] group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
          rank === 1 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 
          rank === 2 ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700' : 
          'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
        }`}>
          {rank === 1 ? <Trophy className="w-5 h-5" /> : `#${rank}`}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{player.name}</div>
            {player.isHot && <Zap className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />}
            {player.attendanceStreak >= 3 && (
              <span className="flex items-center text-[10px] font-black text-orange-600 dark:text-orange-400">
                {player.attendanceStreak}🔥
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${tier.bg} ${tier.color} ${tier.border}`}>
              {tier.name}
            </span>
            <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tight">{player.stats.wins} Wins</div>
          </div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">
          {player.score.toFixed(0)}
        </div>
        <div className="text-[8px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Rating</div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ReactNode; className?: string; subLabel?: string; tooltip?: string }> = ({ label, value, icon, className, subLabel, tooltip }) => (
  <div className={`p-3.5 md:p-5 rounded-2xl md:rounded-[2rem] shadow-sm transition-all relative group/stat ${className}`}>
    <div className="flex justify-between items-start mb-1.5 md:mb-2">
      <div className="flex items-center gap-1">
        <span className="text-[8px] md:text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        {tooltip && (
          <div className="relative group/tooltip">
            <Info className="w-2.5 h-2.5 text-gray-400/50 cursor-help" />
            <div className="absolute bottom-full left-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-48 p-2.5 bg-gray-900/95 backdrop-blur-sm text-white text-[10px] rounded-xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all duration-200 z-50 shadow-2xl border border-white/10 font-bold leading-tight group-even/stat:left-auto group-even/stat:right-0 md:group-even/stat:left-1/2 md:group-even/stat:translate-x-[-50%]">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="bg-white/50 dark:bg-white/10 p-1 md:p-1.5 rounded-lg shadow-sm">
        {icon}
      </div>
    </div>
    <div className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
    {subLabel && <div className="text-[8px] md:text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-0.5 md:mt-1 flex items-center gap-1"><Percent className="w-2 md:w-2.5 h-2 md:h-2.5" /> {subLabel}</div>}
  </div>
);

const QuickButton: React.FC<{ to: string; label: string; color: string }> = ({ to, label, color }) => (
  <Link to={to} className={`${color} text-white px-3 md:px-4 py-4 md:py-5 rounded-xl md:rounded-[1.5rem] text-center font-black text-[10px] md:text-xs shadow-lg active:scale-95 transition-all uppercase tracking-wider`}>
    {label}
  </Link>
);

const MatchItem: React.FC<{ match: any }> = ({ match }) => {
  const { players } = useApp();
  const pA = players.find(p => p.id === match.playerAId)?.name || 'Unknown';
  const pB = players.find(p => p.id === match.playerBId)?.name || 'Unknown';
  
  return (
    <div className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-800 flex justify-between items-center hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs font-black ${match.points === 20 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
          {match.points}p
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs md:text-sm text-gray-900 dark:text-white leading-tight truncate">{pA} vs {pB}</div>
          <div className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase mt-0.5 truncate">{match.date} • {match.table || 'Table 1'}</div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="font-black text-xs md:text-sm text-gray-900 dark:text-white transition-all">₹{match.totalValue}</div>
        <div className="text-[7px] md:text-[9px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-tighter truncate">{match.payerOption.replace('_', ' ')}</div>
      </div>
    </div>
  );
}

const PaymentItem: React.FC<{ payment: any }> = ({ payment }) => {
  const { players } = useApp();
  const payer = players.find(p => p.id === payment.primaryPayerId)?.name || 'Unknown';
  
  return (
    <div className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-800 flex justify-between items-center hover:shadow-md dark:hover:bg-slate-800/50 transition-all">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs ${payment.mode === PaymentMode.ONLINE ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
          {payment.mode === PaymentMode.ONLINE ? 'GP' : 'CA'}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs md:text-sm truncate text-gray-900 dark:text-white leading-tight">
            {payer} {payment.allocations.length > 1 && <span className="text-emerald-500 dark:text-emerald-400 font-black">+ {payment.allocations.length - 1}</span>}
          </div>
          <div className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase mt-0.5 truncate">{payment.date}</div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="font-black text-xs md:text-sm text-emerald-600 dark:text-emerald-400 transition-all">₹{payment.totalAmount}</div>
        <div className="text-[7px] md:text-[9px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-tighter">VERIFIED</div>
      </div>
    </div>
  );
}
