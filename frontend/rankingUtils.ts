import { Player, Match, PlayerStats } from './types';

/**
 * Industry Standard Performance Algorithm
 * 
 * 1. Skill Index (Bayesian Average): Prevents "luck" from 1-2 games.
 * 2. Activity Decay: Inactive players lose "heat".
 * 3. Daily Streak (Snapchat Style): Rewards coming daily.
 * 4. Momentum Bonus: Rewards consecutive wins.
 */
export const calculatePlayerPerformanceScore = (
  player: Player,
  matches: Match[],
  stats: PlayerStats,
  config = {
    minMatches: 2,
    confidenceConstant: 8, // Higher = needs more games to trust win rate
    baseRating: 100,
    halfLifeDays: 10, // Faster decay for competitive feel
    streakBonus: 3.5, // Flat points per win in streak
    dailyBonus: 5, // Bonus for playing today
  }
) => {
  const { gamesPlayed, wins, winRate, currentStreak } = stats;
  if (gamesPlayed < config.minMatches) return 0;

  // 1. Skill Component (0.0 to 1.0)
  const winRatio = winRate / 100;
  const skillFactor = (config.confidenceConstant * 0.5 + winRatio * gamesPlayed) / 
                     (gamesPlayed + config.confidenceConstant);

  // 2. Snapchat-style Attendance Streak
  // Logic: Count consecutive days played. Break if > 36 hours gap.
  const playerMatches = [...matches]
    .filter(m => m.playerAId === player.id || m.playerBId === player.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let attendanceStreak = 0;
  if (playerMatches.length > 0) {
    const uniqueDays = Array.from(new Set(playerMatches.map(m => m.date)));
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Check if they played today or yesterday to keep streak alive
    let lastDate = new Date(uniqueDays[0]);
    const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

    if (diffHours <= 48) { // Allow 48h grace for "daily" (yesterday counts)
      attendanceStreak = 1;
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        const d1 = new Date(uniqueDays[i]);
        const d2 = new Date(uniqueDays[i+1]);
        const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
        if (diff <= 1.5) attendanceStreak++; // Roughly 1 day apart
        else break;
      }
    }
  }

  // 3. Activity Multiplier (Recency)
  const lastMatchTime = playerMatches.length > 0 ? new Date(playerMatches[0].date).getTime() : 0;
  const daysSince = lastMatchTime > 0 ? (Date.now() - lastMatchTime) / (1000 * 60 * 60 * 24) : 99;
  const activityFactor = Math.pow(0.5, daysSince / config.halfLifeDays);

  // 4. Final Calculation
  // We use an open-ended "Rating" instead of 0-100.
  // 100 is "Good", 150 is "Legendary", 200+ is "Untouchable"
  const baseRating = (skillFactor * 100) * activityFactor;
  const streakBonus = Math.min(currentStreak, 10) * config.streakBonus;
  const attendanceBonus = Math.min(attendanceStreak, 15) * 2; // +2 per day streak
  
  const totalScore = baseRating + streakBonus + attendanceBonus;

  return {
    totalScore,
    attendanceStreak,
    isHot: currentStreak >= 3 || attendanceStreak >= 3
  };
};

/**
 * Returns the top performing players sorted by the performance score.
 */
export const getTopPerformers = (
  players: Player[],
  matches: Match[],
  getPlayerStats: (id: string) => PlayerStats,
  limit: number = 3
) => {
  return players
    .map(p => {
      const stats = getPlayerStats(p.id);
      const perf = calculatePlayerPerformanceScore(p, matches, stats);
      return { 
        ...p, 
        stats, 
        score: perf.totalScore, 
        attendanceStreak: perf.attendanceStreak,
        isHot: perf.isHot
      };
    })
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

/**
 * Tier names based on rating
 */
export const getPlayerTier = (score: number) => {
  if (score >= 180) return { name: 'Conqueror', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800' };
  if (score >= 150) return { name: 'Ace', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' };
  if (score >= 120) return { name: 'Crown', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' };
  if (score >= 100) return { name: 'Diamond', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' };
  if (score >= 80) return { name: 'Platinum', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800' };
  if (score >= 60) return { name: 'Gold', color: 'text-yellow-700 dark:text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-200 dark:border-yellow-800' };
  if (score >= 40) return { name: 'Silver', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-200 dark:border-slate-800' };
  return { name: 'Bronze', color: 'text-orange-800 dark:text-orange-600/80', bg: 'bg-orange-50/50 dark:bg-orange-900/10', border: 'border-orange-100 dark:border-orange-900/30' };
};
