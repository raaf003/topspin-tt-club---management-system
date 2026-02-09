import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Trophy, Search, Zap, Info, ArrowRight, X, ShieldCheck, Flame, TrendingUp, Target, Activity, Award } from 'lucide-react';
import { getTopPerformers, getPlayerTier, getWeeklyHighlights } from '../rankingUtils';

export const Leaderboard: React.FC = () => {
  const { players, matches, getPlayerStats, globalPlayerStats } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const ratedPlayers = useMemo(() => {
    const topPerformers = getTopPerformers(players, matches, getPlayerStats, players.length);
    console.log('[Leaderboard] Top performers received:',  topPerformers.slice(0, 5).map(p => ({
      name: p.name,
      score: p.score,
      displayRating: p.displayRating,
      statsRating: p.stats?.rating,
      statsRd: p.stats?.rd
    })));
    return topPerformers;
  }, [players, matches, getPlayerStats]);

  const highlights = useMemo(() => {
    return getWeeklyHighlights(players, matches, globalPlayerStats);
  }, [players, matches, globalPlayerStats]);

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
              <Info className="w-3 h-3" /> Glicko-2 System
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <HighlightCard 
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          label="Most Improved"
          name={highlights.mostImproved?.name || '-'}
          sub={`+${highlights.mostImproved?.delta.toFixed(0) || 0} pts`}
        />
        <HighlightCard 
          icon={<Flame className="w-4 h-4 text-orange-500" />}
          label="Top Streak"
          name={highlights.longestStreak?.name || '-'}
          sub={`${globalPlayerStats[highlights.longestStreak?.id || '']?.playStreak || 0} Days`}
        />
        <HighlightCard 
          icon={<Activity className="w-4 h-4 text-indigo-500" />}
          label="Most Active"
          name={highlights.mostActive?.name || '-'}
          sub={`${globalPlayerStats[highlights.mostActive?.id || '']?.consistencyScore || 0}/30 Days`}
        />
        <HighlightCard 
          icon={<Target className="w-4 h-4 text-rose-500" />}
          label="Giant Killer"
          name={highlights.giantKiller?.name || '-'}
          sub={highlights.giantKiller ? `${highlights.giantKiller.upsetCount} Upsets` : 'No upsets'}
        />
      </div>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="bg-indigo-600 p-6 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">How Ranking Works</h3>
                <p className="text-indigo-100 text-xs leading-relaxed font-medium">
                  Our system uses the Glicko-2 algorithm combined with anti-manipulation rules to fairly rank all players.
                </p>
              </div>
              <button 
                onClick={() => setShowInfo(false)}
                title="Close Info"
                aria-label="Close Info"
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Score Breakdown */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Leaderboard Score Formula
                </h4>
                <div className="space-y-2 text-[11px] font-bold">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Conservative Rating (Rating - RD)</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">60%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Opponent Strength (Quality of Wins)</span>
                    <span className="text-rose-600 dark:text-rose-400 font-black">30%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-slate-400">Activity Bonus (Matches in 30 days)</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">10%</span>
                  </div>
                </div>
              </div>

              <MechanicItem 
                icon={<ShieldCheck className="w-5 h-5 text-indigo-500" />}
                title="Rating Deviation (RD)"
                description="Measures how confident the system is in your rating. New/inactive players have high RD (350). Active players get low RD (~50). Your 'Conservative Rating' = Rating - RD, which prevents new players from ranking too high."
              />

              <MechanicItem 
                icon={<Target className="w-5 h-5 text-rose-500" />}
                title="Opponent Strength"
                description="Beating higher-rated opponents earns you more rank. We calculate the average rating of opponents you've beaten, then multiply it by your conservative rating. This rewards quality wins over farming weak opponents."
              />

              <MechanicItem 
                icon={<Activity className="w-5 h-5 text-emerald-500" />}
                title="Activity Bonus"
                description="Playing more rated matches gives you a bonus (max +100 points from 20+ matches in 30 days). This rewards active players while preventing farming through diminishing returns."
              />
              
              {/* Tier System */}
              <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-purple-500" /> Tier System
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-amber-500 to-yellow-400 text-white">Master</span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">Rating 1900+ &amp; 60 total matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-600 text-white">Elite</span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">Rating 1750+ &amp; 40 total matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500 text-white">Advanced</span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">Rating 1600+ &amp; 25 total matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500 text-white">Intermediate</span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">Rating 1500+ &amp; 15 total matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-400 text-white">Beginner</span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">Rating 1400+ &amp; 10 total matches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-300 text-gray-700">Novice</span>
                    <span className="text-gray-600 dark:text-slate-400 font-bold">Starting tier for all players</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-2 italic">
                    Climb-only system: Once you earn a tier, you keep it forever! Rating may fluctuate but your tier never drops.
                  </p>
                </div>
              </div>

              <MechanicItem 
                icon={<Zap className="w-5 h-5 text-amber-500" />}
                title="Anti-Manipulation Rules"
                description="• Max 5 rated matches per day per player. • After 4+ matches vs same opponent, weight reduces to 50%. • After 6+ matches vs same opponent, those matches don't count. • 3 consecutive wins against different opponents = 'On Fire' status."
              />

              <MechanicItem 
                icon={<Award className="w-5 h-5 text-blue-500" />}
                title="Match Weighting"
                description="• 20-point matches: Full weight (1.0). • 10-point matches: Reduced weight (0.6). • Casual/unrated matches: No rating impact (0.0). Longer matches have more weight because they're more reliable indicators of skill."
              />

              <MechanicItem 
                icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
                title="Volatility"
                description="Tracks how consistently you perform. If your results are unpredictable (winning and losing to the same people), volatility increases, allowing bigger rating swings. Consistent players have stable ratings."
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
          const tier = getPlayerTier(p.stats.rating, p.stats);
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
                  <div className="text-[8px] md:text-[9px] text-gray-400 dark:text-slate-500 font-black uppercase tracking-widest">
                    Score
                  </div>
                  <div className="relative group/tooltip">
                    <Info className="w-2.5 h-2.5 text-gray-300 cursor-help" />
                    <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-gray-900 text-white text-[9px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl border border-white/10 font-bold leading-tight">
                      <div className="space-y-1">
                        <div>60% Conservative Skill (Rating - RD)</div>
                        <div>30% Opponent Strength (who you beat)</div>
                        <div>10% Activity Bonus (matches/30 days)</div>
                      </div>
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

const HighlightCard: React.FC<{ icon: React.ReactNode; label: string; name: string; subText?: string; sub?: string }> = ({ icon, label, name, sub }) => (
  <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-1">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[8px] font-black text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="font-bold text-xs truncate dark:text-white">{name}</div>
    {sub && <div className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">{sub}</div>}
  </div>
);
