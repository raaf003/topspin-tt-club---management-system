import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getLocalTodayStr } from '../utils';
import { ChevronLeft, Trophy, Target, TrendingUp, History, Phone, Award, Zap, Calendar, Filter, User, Table as TableIcon, Activity, IndianRupee, Info, BarChart3, Users, Gauge } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { calculatePlayerPerformanceScore, getPlayerTier, getTopPerformers, calculatePlayerRatingHistory } from '../rankingUtils';

const HighlightStat: React.FC<{ label: string; value: string; icon: React.ReactNode; subValue?: string; tooltip?: string }> = ({ label, value, icon, subValue, tooltip }) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-3 transition-all relative group/stat">
    <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-xl">{icon}</div>
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <div className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{label}</div>
        {tooltip && (
          <div className="relative group/tooltip">
            <Info className="w-2.5 h-2.5 text-gray-300 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 max-sm:w-32 max-sm:left-auto max-sm:right-0 max-sm:translate-x-0 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10 whitespace-normal text-center">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="text-sm md:text-lg font-black dark:text-white transition-all truncate">{value}</div>
      {subValue && <div className="text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase">{subValue}</div>}
    </div>
  </div>
);

const ProgressStat: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${(value / total) * 100 || 0}%`;
    }
  }, [value, total]);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-black uppercase">
        <span className="text-gray-400">{label}</span>
        <span className="dark:text-slate-400 transition-all">{value} / {total}</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div ref={ref} className={`h-full ${color} transition-all duration-500`}></div>
      </div>
    </div>
  );
};

const MonthlyProgressBar: React.FC<{ wins: number; games: number }> = ({ wins, games }) => {
  const winRef = useRef<HTMLDivElement>(null);
  const lossRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (winRef.current && lossRef.current) {
      const winPct = (wins / games) * 100 || 0;
      winRef.current.style.width = `${winPct}%`;
      lossRef.current.style.width = `${100 - winPct}%`;
    }
  }, [wins, games]);

  return (
    <div className="flex-1 h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
      <div ref={winRef} className="h-full bg-indigo-500 transition-all duration-500"></div>
      <div ref={lossRef} className="h-full bg-indigo-200 dark:bg-indigo-900/50 transition-all duration-500"></div>
    </div>
  );
};

const RivalryProgressBar: React.FC<{ wins: number; losses: number; played: number }> = ({ wins, losses, played }) => {
  const winRef = useRef<HTMLDivElement>(null);
  const lossRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (winRef.current && lossRef.current) {
      winRef.current.style.width = `${(wins / played) * 100}%`;
      lossRef.current.style.width = `${(losses / played) * 100}%`;
    }
  }, [wins, losses, played]);

  return (
    <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
      <div ref={winRef} className="h-full bg-emerald-500 transition-all duration-500"></div>
      <div ref={lossRef} className="h-full bg-rose-500 transition-all duration-500"></div>
    </div>
  );
};

export const PlayerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { players, matches, payments, getPlayerStats, isDarkMode } = useApp();
  
  const player = players.find(p => p.id === id);

  // Range Selection
  const todayStr = getLocalTodayStr();
  const lastMonthStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [range, setRange] = useState<'30d' | '90d' | 'all' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState(lastMonthStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  const activeRange = useMemo(() => {
    if (range === 'all') return undefined;
    if (range === '30d') return { start: lastMonthStr, end: todayStr };
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgoStr = `${ninetyDaysAgo.getFullYear()}-${String(ninetyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(ninetyDaysAgo.getDate()).padStart(2, '0')}`;
    if (range === '90d') return { start: ninetyDaysAgoStr, end: todayStr };
    return { start: customStart, end: customEnd };
  }, [range, customStart, customEnd, lastMonthStr, todayStr]);

  const stats = useMemo(() => id ? getPlayerStats(id, activeRange) : null, [id, getPlayerStats, activeRange]);
  const lifetimeStats = useMemo(() => id ? getPlayerStats(id) : null, [id, getPlayerStats]);
  
  const performance = useMemo(() => {
    if (!player || !lifetimeStats) return null;
    return calculatePlayerPerformanceScore(player, matches, lifetimeStats);
  }, [player, matches, lifetimeStats]);

  const tier = useMemo(() => {
    if (!stats) return null;
    return getPlayerTier(stats.rating, stats);
  }, [stats]);

  // Calculate the same ranking metrics as the leaderboard
  const rankingMetrics = useMemo(() => {
    if (!stats || !id) return null;
    
    const rating = stats.rating || 1500;
    const rd = stats.rd || 350;
    const conservativeRating = rating - rd;
    
    // Calculate average opponent rating (same as leaderboard)
    const wonMatches = matches.filter(m => m.winnerId === id && m.isRated !== false);
    let avgOpponentRating = 1500;
    if (wonMatches.length > 0) {
      let totalOppRating = 0;
      wonMatches.forEach(m => {
        const oppId = m.playerAId === id ? m.playerBId : m.playerAId;
        const oppStats = getPlayerStats(oppId);
        totalOppRating += oppStats?.rating || 1500;
      });
      avgOpponentRating = totalOppRating / wonMatches.length;
    }
    const opponentStrengthFactor = Math.min(avgOpponentRating / 1500, 1.5);
    
    // Activity bonus
    const activityBonus = Math.min((stats.ratedMatchesLast30 || 0) * 5, 100);
    
    // Score calculation (same as leaderboard)
    const score = (conservativeRating * 0.60) + 
                 (conservativeRating * opponentStrengthFactor * 0.30) +
                 (activityBonus * 0.10);
    
    // Find rank position
    const topPerformers = getTopPerformers(players, matches, getPlayerStats, players.length);
    const rank = topPerformers.findIndex(p => p.id === id) + 1;
    
    return {
      conservativeRating,
      avgOpponentRating,
      opponentStrengthFactor,
      activityBonus,
      score,
      rank,
      totalPlayers: players.length
    };
  }, [stats, id, matches, players, getPlayerStats]);

  // Calculate actual rating history for the performance graph
  const ratingHistory = useMemo(() => {
    if (!id) return [];
    return calculatePlayerRatingHistory(id, players, matches);
  }, [id, players, matches]);

  const [activeTab, setActiveTab] = useState<'matches' | 'payments' | 'rivalries'>('matches');

  if (!player || !stats || !lifetimeStats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-gray-500 dark:text-slate-400 font-bold">Player not found</p>
        <button type="button" onClick={() => navigate('/players')} className="text-orange-500 font-bold flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Registry
        </button>
      </div>
    );
  }

  const playerMatches = matches.filter(m => {
    const isPlayer = m.playerAId === id || m.playerBId === id;
    if (!isPlayer) return false;
    if (!activeRange) return true;
    return m.date >= activeRange.start && m.date <= activeRange.end;
  }).sort((a, b) => b.recordedAt - a.recordedAt);

  const playerPayments = payments.filter(p => {
    const isPlayer = p.allocations.some(a => a.playerId === id);
    if (!isPlayer) return false;
    if (!activeRange) return true;
    return p.date >= activeRange.start && p.date <= activeRange.end;
  }).sort((a, b) => b.recordedAt - a.recordedAt);

  const formSummary = stats.recentForm.reduce((acc, f) => {
    if (f === 'W') acc.w++;
    else if (f === 'L') acc.l++;
    return acc;
  }, { w: 0, l: 0 });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 px-1">
        <div className="flex items-center gap-4">
          <button type="button" title="Go Back" aria-label="Go Back" onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <ChevronLeft className="w-6 h-6 text-gray-600 dark:text-slate-400" />
          </button>
          <h2 className="text-2xl font-black dark:text-white transition-all">Player Profile</h2>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm self-start md:self-auto">
          {(['30d', '90d', 'all', 'custom'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${range === r ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-none' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {range === 'custom' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-orange-100 dark:border-orange-900/30 flex flex-wrap gap-4 animate-in slide-in-from-top-2 duration-300">
           <div className="space-y-1">
             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Start Date</label>
             <input title="Start Date" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs font-bold dark:text-white" />
           </div>
           <div className="space-y-1">
             <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date</label>
             <input title="End Date" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-2 text-xs font-bold dark:text-white" />
           </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center text-4xl md:text-5xl font-black shadow-inner border border-white/30 transition-all hover:scale-105 duration-500">
            {player.name?.[0] || '?'}
          </div>
          <div className="space-y-2">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none break-words max-w-full">{player.name || 'Anonymous'}</h1>
              {tier && (
                <div className="flex flex-col items-center md:items-start gap-1">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${tier.bg} ${tier.color} ${tier.border}`}>
                    {tier.name}
                  </div>
                  {tier.pendingPromotion && (
                    <div className="text-[8px] font-black text-white/70 uppercase tracking-tighter">
                      Needs {10 - stats.ratedMatchesLast30} more matches for promotion
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-white/10">@{player.nickname || 'Guest'}</span>
              {player.phone && (
                <span className="bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-white/10">
                  <Phone className="w-3 h-3" /> {player.phone}
                </span>
              )}
            </div>
          </div>
          <div className="md:ml-auto flex flex-col items-center md:items-end justify-center">
             <div className="flex items-center gap-4">
               <div className="text-center">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Rank</div>
                 <div className="text-2xl md:text-3xl font-black text-white">#{rankingMetrics?.rank || '-'}</div>
               </div>
               <div className="text-center">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Score</div>
                 <div className="text-2xl md:text-3xl font-black text-amber-300 flex items-center gap-1">
                   {rankingMetrics?.score.toFixed(0) || '-'}
                   {stats.onFire && <Zap className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />}
                 </div>
               </div>
               <div className="text-center">
                 <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Rating</div>
                 <div className="text-2xl md:text-3xl font-black text-white">{stats.rating.toFixed(0)}</div>
               </div>
             </div>
             {stats.playStreak >= 3 && (
               <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest mt-2">
                 {stats.playStreak} Day Streak 🔥
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HighlightStat 
          label="Win Rate" 
          value={`${stats.winRate.toFixed(1)}%`} 
          icon={<Trophy className="w-5 h-5 text-yellow-500" />} 
          subValue={`${stats.wins}W - ${stats.losses}L`}
          tooltip="Percentage of games won in the selected period."
        />
        <HighlightStat 
          label="Conservative" 
          value={`${rankingMetrics?.conservativeRating.toFixed(0) || '-'}`} 
          icon={<Gauge className="w-5 h-5 text-indigo-500" />} 
          subValue="Rating - RD"
          tooltip="Conservative Rating = Skill Rating minus Rating Deviation. This is 60% of your leaderboard score."
        />
        <HighlightStat 
          label="Opp. Strength" 
          value={`${rankingMetrics?.avgOpponentRating.toFixed(0) || '-'}`} 
          icon={<Users className="w-5 h-5 text-rose-500" />} 
          subValue={`×${rankingMetrics?.opponentStrengthFactor.toFixed(2) || '1.00'}`}
          tooltip="Average rating of opponents you've beaten. Higher = quality wins. This is 30% of your score."
        />
        <HighlightStat 
          label="Activity" 
          value={`+${rankingMetrics?.activityBonus.toFixed(0) || 0}`} 
          icon={<BarChart3 className="w-5 h-5 text-emerald-500" />} 
          subValue={`${stats.ratedMatchesLast30} rated/30d`}
          tooltip="Bonus from playing matches. Max +100 from 20+ rated matches in 30 days. This is 10% of your score."
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HighlightStat 
          label="Play Streak" 
          value={`${stats.playStreak} 🔥`} 
          icon={<Calendar className="w-5 h-5 text-blue-500" />} 
          subValue="Day Streak"
          tooltip="Consecutive days played. Resets after 48 hours of inactivity."
        />
        <HighlightStat 
          label="Consistency" 
          value={`${stats.consistencyScore}/30`} 
          icon={<Activity className="w-5 h-5 text-emerald-500" />} 
          subValue="Active Days"
          tooltip="Number of days played in the last 30 days."
        />
        <HighlightStat 
          label="Confidence" 
          value={`${((1 - stats.rd / 350) * 100).toFixed(0)}%`} 
          icon={<Target className="w-5 h-5 text-orange-500" />} 
          subValue={`RD: ${stats.rd.toFixed(0)}`}
          tooltip="How confident the system is in your skill rating. Low RD = stable rating. High RD = rating may change quickly."
        />
        <HighlightStat 
          label="Total Matches" 
          value={`${stats.totalRatedMatches || 0}`} 
          icon={<Award className="w-5 h-5 text-purple-500" />} 
          subValue="Career Games"
          tooltip="Total rated matches played. Tiers are climb-only - once earned, you keep them forever!"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-all">
            <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-[0.2em] flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500" /> Performance
            </h3>
            <div className="space-y-4">
              <ProgressStat label="Wins" value={stats.wins} total={stats.wins + stats.losses} color="bg-emerald-500" />
              <ProgressStat label="Losses" value={stats.losses} total={stats.wins + stats.losses} color="bg-rose-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all">
            <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-[0.2em] flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Monthly Games
            </h3>
            <div className="space-y-4">
              {stats.monthlyStats.slice(0, 5).map(m => (
                <div key={m.month} className="flex items-center gap-4">
                  <div className="w-16 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase">{m.month}</div>
                  <MonthlyProgressBar wins={m.wins} games={m.games} />
                  <div className="w-8 text-right text-[10px] font-black dark:text-white transition-all">{m.games}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {stats.favoriteOpponent && (
              <HighlightStat 
                label="Fav Opponent" 
                value={stats.favoriteOpponent.name} 
                icon={<User className="w-5 h-5 text-indigo-500" />} 
                subValue={`${stats.favoriteOpponent.played} Battles`}
              />
            )}
            <HighlightStat label="Avg Spend/Game" value={`₹${stats.avgSpendPerGame.toFixed(1)}`} icon={<IndianRupee className="w-5 h-5 text-emerald-500" />} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Rating History Graph */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all h-[300px] md:h-[400px]">
            <h3 className="font-black text-gray-900 dark:text-white uppercase text-xs tracking-[0.2em] flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Rating History
            </h3>
            <div className="h-[calc(100%-3rem)]">
              {ratingHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ratingHistory}>
                    <defs>
                      <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fontWeight: 'bold' }}
                      tickFormatter={(v) => v.slice(5)} // Show MM-DD
                      axisLine={false}
                      tickLine={false}
                      stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => v.toFixed(0)}
                      tick={{ fontSize: 10, fontWeight: 'bold' }}
                      axisLine={false}
                      tickLine={false}
                      stroke={isDarkMode ? '#64748b' : '#94a3b8'}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#0f172a' : '#fff', 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                      }}
                      labelStyle={{ fontWeight: 'black', color: '#6366f1', fontSize: '12px' }}
                      labelFormatter={(label) => label}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const entry = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800">
                            <div className="text-xs font-black text-indigo-600 mb-1">{label}</div>
                            <div className="text-lg font-black dark:text-white">{entry.rating?.toFixed(0)} Rating</div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400 font-bold">
                              RD: {entry.rd?.toFixed(0)} | {entry.matchCount} match{entry.matchCount > 1 ? 'es' : ''} 
                              <span className={`ml-1 ${entry.result === 'W' ? 'text-emerald-500' : entry.result === 'L' ? 'text-rose-500' : 'text-gray-400'}`}>
                                ({entry.result})
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rating" 
                      stroke="#6366f1" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorRating)" 
                      animationDuration={1500}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const color = payload.result === 'W' ? '#10b981' : payload.result === 'L' ? '#ef4444' : '#6366f1';
                        return <circle cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={2} />;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                  No rating history yet. Play some matches!
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
            <div className="flex border-b border-gray-50 dark:border-slate-800 p-2">
              <button type="button" onClick={() => setActiveTab('matches')} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'matches' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' : 'text-gray-400 dark:text-slate-500'}`}>Matches</button>
              <button type="button" onClick={() => setActiveTab('rivalries')} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'rivalries' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'text-gray-400 dark:text-slate-500'}`}>Rivalries</button>
              <button type="button" onClick={() => setActiveTab('payments')} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'text-gray-400 dark:text-slate-500'}`}>Payments</button>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto custom-scrollbar">
              {activeTab === 'matches' ? (
                <div className="space-y-3">
                  {playerMatches.map(m => (
                    <div key={m.id} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl flex justify-between items-center transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${m.winnerId === id ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                          {m.winnerId === id ? 'W' : 'L'}
                        </div>
                        <div>
                          <div className="font-bold dark:text-white transition-all">vs {players.find(p => p.id === (m.playerAId === id ? m.playerBId : m.playerAId))?.name}</div>
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 font-black uppercase transition-all">{m.date}</div>
                        </div>
                      </div>
                      <div className="font-black dark:text-white transition-all">₹{m.charges[id!] || 0}</div>
                    </div>
                  ))}
                  {playerMatches.length === 0 && <p className="text-center py-8 text-gray-400 italic text-sm">No matches found.</p>}
                </div>
              ) : activeTab === 'rivalries' ? (
                <div className="space-y-4">
                  {stats.rivalries.map(r => (
                    <div key={r.opponentId} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center font-black text-xs text-orange-500">{r.opponentName[0]}</div>
                          <span className="font-bold dark:text-white">{r.opponentName}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400">{r.played} Battles</span>
                      </div>
                      <RivalryProgressBar wins={r.wins} losses={r.losses} played={r.played} />
                      <div className="flex justify-between text-[10px] font-black uppercase">
                        <span className="text-emerald-600">{r.wins} Wins</span>
                        <span className="text-rose-600">{r.losses} Losses</span>
                      </div>
                    </div>
                  ))}
                  {stats.rivalries.length === 0 && <p className="text-center py-8 text-gray-400 italic text-sm">No rivalries yet.</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {playerPayments.map(p => (
                    <div key={p.id} className="bg-emerald-50/30 dark:bg-emerald-900/10 p-4 rounded-2xl flex justify-between items-center transition-all">
                      <div>
                        <div className="font-bold text-emerald-900 dark:text-emerald-400 transition-all">{p.mode} RECEIPT</div>
                        <div className="text-[10px] text-emerald-600/60 dark:text-emerald-500/60 font-black uppercase transition-all">{p.date}</div>
                      </div>
                      <div className="font-black text-emerald-600 dark:text-emerald-400 transition-all">₹{p.allocations.find(a => a.playerId === id)?.amount || 0}</div>
                    </div>
                  ))}
                  {playerPayments.length === 0 && <p className="text-center py-8 text-gray-400 italic text-sm">No payments found.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};