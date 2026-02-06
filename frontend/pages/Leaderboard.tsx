import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Zap, Info, ArrowRight } from 'lucide-react';
import { getTopPerformers, getPlayerTier } from '../rankingUtils';

export const Leaderboard: React.FC = () => {
  const { players, matches, getPlayerStats } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const ratedPlayers = useMemo(() => {
    return getTopPerformers(players, matches, getPlayerStats, players.length);
  }, [players, matches, getPlayerStats]);

  const filteredPlayers = ratedPlayers.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.nickname?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-xl">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold dark:text-white transition-all">Hall of Fame</h2>
        </div>
      </div>

      <div className="bg-indigo-600 dark:bg-indigo-700 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none">
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <h3 className="text-lg font-black uppercase tracking-wider mb-2">Power Rating System</h3>
          <p className="text-indigo-100 text-xs md:text-sm leading-relaxed opacity-90">
            Ratings are calculated based on skill (win rate), consistency (daily streaks), and recent activity. Keep playing to maintain your "Heat" and climb the tiers!
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="bg-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-white/5">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> Momentum Status
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-white/5">
                🔥 Retention Streak
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/20 rounded-2xl p-3.5 border border-white/5 backdrop-blur-sm">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] mb-1.5 text-amber-400 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Performance Momentum
                </h4>
                <p className="text-[10px] text-indigo-100/80 leading-relaxed font-medium">
                  Indicates a player is performing significantly above their baseline. Triggered by a 3+ win streak, providing a temporary boost to the overall Power Rating.
                </p>
              </div>

              <div className="bg-black/20 rounded-2xl p-3.5 border border-white/5 backdrop-blur-sm">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] mb-1.5 text-rose-300 flex items-center gap-2">
                  🔥 Consistency Multiplier
                </h4>
                <p className="text-[10px] text-indigo-100/80 leading-relaxed font-medium">
                  Rewards active participation. Competing daily builds a multiplier that protects your rating from activity decay. Resets if inactive for more than 48 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative px-1">
        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leaderboard..."
          className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 pl-11 md:pl-12 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 shadow-sm font-medium dark:text-white transition-all text-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredPlayers.map((p: any, idx) => {
          const tier = getPlayerTier(p.score);
          return (
            <div 
              key={p.id}
              onClick={() => navigate(`/players/${p.id}`)}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-slate-800 flex items-center gap-4 hover:shadow-lg hover:border-amber-200 dark:hover:border-amber-900/40 cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-sm md:text-base shadow-sm ${
                idx === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' : 
                idx === 1 ? 'bg-slate-100 text-slate-600 border border-slate-200' : 
                idx === 2 ? 'bg-orange-100 text-orange-600 border border-orange-200' : 
                'bg-gray-50 text-gray-400 dark:bg-slate-800 border border-transparent'
              }`}>
                {idx === 0 ? <Trophy className="w-5 h-5 md:w-6 md:h-6" /> : `#${idx + 1}`}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="font-black text-sm md:text-base text-gray-900 dark:text-white truncate group-hover:text-amber-600 transition-colors">{p.name}</div>
                  {p.isHot && <Zap className="w-3 h-3 text-amber-500 fill-amber-500 animate-pulse" />}
                  {p.attendanceStreak >= 3 && <span className="text-[10px] font-black text-orange-500">{p.attendanceStreak}🔥</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${tier.bg} ${tier.color} ${tier.border}`}>
                    {tier.name}
                  </span>
                  <span className="text-[9px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">{p.stats.wins}W - {p.stats.losses}L</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg md:text-xl font-black text-gray-900 dark:text-white">{p.score.toFixed(0)}</div>
                <div className="flex items-center justify-end gap-1">
                  <div className="text-[8px] md:text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest">Rating</div>
                  <div className="relative group/tooltip">
                    <Info className="w-2.5 h-2.5 text-gray-300 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-40 p-2 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10 font-bold leading-tight">
                      Bayesian Skill Score + Attendance Streak Bonus.
                    </div>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
            </div>
          );
        })}
        {filteredPlayers.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
            <p className="text-gray-400 font-bold italic">No players found match your search...</p>
          </div>
        )}
      </div>
    </div>
  );
};
