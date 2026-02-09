import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Zap, Info, ArrowRight, X, ShieldCheck, Flame } from 'lucide-react';
import { getTopPerformers, getPlayerTier } from '../rankingUtils';

export const Leaderboard: React.FC = () => {
  const { players, matches, getPlayerStats } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showInfo, setShowInfo] = useState(false);

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
          <div className="bg-amber-500 p-2 rounded-xl shadow-lg shadow-amber-100 dark:shadow-none">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black dark:text-white tracking-tight">Hall of Fame</h2>
            <button 
              onClick={() => setShowInfo(true)}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              <Info className="w-3 h-3" /> How it works
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">Ranking Mechanics</h3>
                <p className="text-indigo-100 text-xs leading-relaxed font-medium">
                  Our Power Rating system evaluates players based on three core performance pillars:
                </p>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <MechanicItem 
                icon={<ShieldCheck className="w-5 h-5 text-indigo-500" />}
                title="Bayesian Skill Index"
                description="Unlike raw win rates, our algorithm requires volume to build confidence. A player with 40 wins is rated higher than one with 3 wins."
              />
              <MechanicItem 
                icon={<Zap className="w-5 h-5 text-amber-500" />}
                title="Performance Momentum"
                description="Triggered by 3+ consecutive wins. Represents a competitive 'peak' and provides a temporary multiplier to your base rating."
              />
              <MechanicItem 
                icon={<Flame className="w-5 h-5 text-rose-500" />}
                title="Consistency Multiplier"
                description="Rewards daily engagement. Competing at least once every 48 hours builds a streak that protects your rating from activity decay."
              />
              
              <button 
                onClick={() => setShowInfo(false)}
                className="w-full bg-gray-900 dark:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legend Strip */}
      <div className="flex gap-4 px-1 overflow-x-auto no-scrollbar">
        <LegendItem icon={<Zap className="w-3 h-3 text-amber-500 fill-amber-500" />} label="Momentum" />
        <LegendItem icon={<span className="text-[10px]">🔥</span>} label="Consistency" />
        <LegendItem icon={<div className="w-2 h-2 rounded-full bg-indigo-500" />} label="Verified Tier" />
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

const MechanicItem: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex gap-4">
    <div className="shrink-0 w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">{icon}</div>
    <div className="space-y-1">
      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">{title}</h4>
      <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed font-medium">{description}</p>
    </div>
  </div>
);

const LegendItem: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-gray-100 dark:border-slate-800 shadow-sm">
    {icon}
    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500">{label}</span>
  </div>
);
