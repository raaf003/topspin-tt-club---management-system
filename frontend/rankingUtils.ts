import { Player, Match, PlayerStats } from './types';

// Glicko-2 constants
const GLICKO_SCALE = 173.7178;
const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOLATILITY = 0.06;
const TAU = 0.5; // System constant (0.3 - 1.2)

interface GlickoPlayer {
  rating: number; // mu
  rd: number;     // phi
  vol: number;    // sigma
}

/**
 * Glicko-2 Algorithm Implementation
 */
export const glicko2 = {
  toInternal: (rating: number, rd: number): { mu: number; phi: number } => ({
    mu: (rating - DEFAULT_RATING) / GLICKO_SCALE,
    phi: rd / GLICKO_SCALE
  }),

  fromInternal: (mu: number, phi: number): { rating: number; rd: number } => ({
    rating: mu * GLICKO_SCALE + DEFAULT_RATING,
    rd: phi * GLICKO_SCALE
  }),

  computeG: (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI)),

  computeE: (mu: number, mu_j: number, phi_j: number) => 
    1 / (1 + Math.exp(-glicko2.computeG(phi_j) * (mu - mu_j))),

  updateVolatility: (phi: number, v: number, delta: number, sigma: number) => {
    const a = Math.log(sigma * sigma);
    const f = (x: number) => {
      const ex = Math.exp(x);
      const d2 = phi * phi + v + ex;
      return (ex * (delta * delta - d2)) / (2 * d2 * d2) - (x - a) / (TAU * TAU);
    };

    let A = a;
    let B: number;
    if (delta * delta > phi * phi + v) {
      B = Math.log(delta * delta - phi * phi - v);
    } else {
      let k = 1;
      while (f(a - k * TAU) < 0) k++;
      B = a - k * TAU;
    }

    let fA = f(A);
    let fB = f(B);

    const epsilon = 0.000001;
    while (Math.abs(B - A) > epsilon) {
      const C = A + (A - B) * fA / (fB - fA);
      const fC = f(C);
      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA = fA / 2;
      }
      B = C;
      fB = fC;
    }
    return Math.exp(A / 2);
  }
};

/**
 * Processes a rating period for multiple players.
 * In our case, a rating period is one day.
 */
export const processRatingPeriod = (
  players: Record<string, GlickoPlayer>,
  matches: { player1: string; player2: string; winner: string; weight: number }[]
) => {
  const updates: Record<string, { mu: number; phi: number; vol: number }> = {};
  const playerMatches: Record<string, { opponentId: string; outcome: number; weight: number }[]> = {};

  // Group matches by player
  Object.keys(players).forEach(id => {
    playerMatches[id] = [];
  });

  matches.forEach(m => {
    if (!players[m.player1] || !players[m.player2]) return;
    
    const outcome1 = m.winner === m.player1 ? 1 : 0;
    const outcome2 = m.winner === m.player2 ? 1 : 0;
    
    playerMatches[m.player1].push({ opponentId: m.player2, outcome: outcome1, weight: m.weight });
    playerMatches[m.player2].push({ opponentId: m.player1, outcome: outcome2, weight: m.weight });
  });

  Object.keys(players).forEach(id => {
    const p = players[id];
    const { mu, phi } = glicko2.toInternal(p.rating, p.rd);
    const sigma = p.vol;

    const results = playerMatches[id];
    
    if (results.length === 0) {
      // Step 6: Player did not compete
      const newPhi = Math.sqrt(phi * phi + sigma * sigma);
      const { rating, rd } = glicko2.fromInternal(mu, newPhi);
      updates[id] = { mu: (rating - DEFAULT_RATING) / GLICKO_SCALE, phi: rd / GLICKO_SCALE, vol: sigma };
      return;
    }

    // Step 3: Compute v
    let v_inv = 0;
    results.forEach(r => {
      const opp = players[r.opponentId];
      const { mu: mu_j, phi: phi_j } = glicko2.toInternal(opp.rating, opp.rd);
      const g_phi_j = glicko2.computeG(phi_j);
      const E = glicko2.computeE(mu, mu_j, phi_j);
      // Incorporate match weight (innovation: weight the contribution to v and delta)
      v_inv += r.weight * g_phi_j * g_phi_j * E * (1 - E);
    });
    const v = 1 / v_inv;

    // Step 4: Compute delta
    let delta_sum = 0;
    results.forEach(r => {
      const opp = players[r.opponentId];
      const { mu: mu_j, phi: phi_j } = glicko2.toInternal(opp.rating, opp.rd);
      const g_phi_j = glicko2.computeG(phi_j);
      const E = glicko2.computeE(mu, mu_j, phi_j);
      delta_sum += r.weight * g_phi_j * (r.outcome - E);
    });
    const delta = v * delta_sum;

    // Step 5: Update volatility
    const newSigma = glicko2.updateVolatility(phi, v, delta, sigma);

    // Step 7: Update rating and RD
    const phi_star = Math.sqrt(phi * phi + newSigma * newSigma);
    const newPhi = 1 / Math.sqrt(1 / (phi_star * phi_star) + 1 / v);
    const newMu = mu + newPhi * newPhi * delta_sum;

    updates[id] = { mu: newMu, phi: newPhi, vol: newSigma };
  });

  return updates;
};

/**
 * Main function to calculate all ratings and metrics from scratch.
 * This ensures consistency and prevents manipulation.
 */
export const calculateAllPlayerStats = (
  players: Player[],
  allMatches: Match[]
): Record<string, { rating: number; rd: number; vol: number; playStreak: number; consistencyScore: number; onFire: boolean }> => {
  const result: Record<string, any> = {};
  
  // Initialize Glicko state for everyone
  const glickoState: Record<string, GlickoPlayer> = {};
  players.forEach(p => {
    glickoState[p.id] = {
      rating: p.rating ?? DEFAULT_RATING,
      rd: p.ratingDeviation ?? DEFAULT_RD,
      vol: p.volatility ?? DEFAULT_VOLATILITY
    };
  });

  // Group matches by date for daily rating periods
  const matchesByDate: Record<string, Match[]> = {};
  allMatches.forEach(m => {
    if (!matchesByDate[m.date]) matchesByDate[m.date] = [];
    matchesByDate[m.date].push(m);
  });

  const sortedDates = Object.keys(matchesByDate).sort();

  // Process rating periods day by day
  sortedDates.forEach(date => {
    const dailyMatches = matchesByDate[date];
    const ratedMatchesToProcess: { player1: string; player2: string; winner: string; weight: number }[] = [];

    // Tracks for anti-manipulation
    const dailyPlayerMatchCount: Record<string, number> = {};
    const dailyPairCount: Record<string, number> = {};

    dailyMatches.forEach(m => {
      if (!m.winnerId) return;

      const p1 = m.playerAId;
      const p2 = m.playerBId;
      const pairKey = [p1, p2].sort().join(':');

      // Rule 2: Match Types & Rating Weighting
      let baseWeight = m.points === 10 ? 0.6 : 1.0;
      if (m.isRated === false) baseWeight = 0; // Casual matches don't affect rating

      // Rule 3A: Daily Match Cap (Max 5 rated per player)
      dailyPlayerMatchCount[p1] = (dailyPlayerMatchCount[p1] || 0) + 1;
      dailyPlayerMatchCount[p2] = (dailyPlayerMatchCount[p2] || 0) + 1;
      
      let weight = baseWeight;
      if (dailyPlayerMatchCount[p1] > 5 || dailyPlayerMatchCount[p2] > 5) {
        weight = 0;
      }

      // Rule 3B: Repeated Opponent Protection
      if (weight > 0) {
        dailyPairCount[pairKey] = (dailyPairCount[pairKey] || 0) + 1;
        const count = dailyPairCount[pairKey];
        if (count >= 6) weight = 0;
        else if (count >= 4) weight *= 0.5;
      }

      if (weight > 0) {
        ratedMatchesToProcess.push({
          player1: p1,
          player2: p2,
          winner: m.winnerId,
          weight
        });
      }
    });

    const periodUpdates = processRatingPeriod(glickoState, ratedMatchesToProcess);
    
    // Apply updates
    Object.keys(periodUpdates).forEach(id => {
      const update = periodUpdates[id];
      const { rating, rd } = glicko2.fromInternal(update.mu, update.phi);
      glickoState[id] = { rating, rd, vol: update.vol };
    });
  });

  // Calculate final metrics for each player
  players.forEach(player => {
    const id = player.id;
    const playerMatches = allMatches.filter(m => m.playerAId === id || m.playerBId === id);
    const sortedMatches = [...playerMatches].sort((a, b) => b.recordedAt - a.recordedAt);

    // Consistency & Streaks
    const uniqueDays = Array.from(new Set(playerMatches.map(m => m.date))).sort().reverse();
    let playStreak = 0;
    if (uniqueDays.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
        playStreak = 1;
        for (let i = 0; i < uniqueDays.length - 1; i++) {
          const d1 = new Date(uniqueDays[i]);
          const d2 = new Date(uniqueDays[i+1]);
          const diffDays = (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i+1]).getTime()) / (1000 * 3600 * 24);
          if (diffDays <= 1.5) playStreak++;
          else break;
        }
      }
    }

    // Consistency Score (active days in last 30)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const consistencyScore = uniqueDays.filter(d => d >= thirtyDaysAgo).length;
    const ratedMatchesLast30 = playerMatches.filter(m => m.date >= thirtyDaysAgo && m.isRated !== false).length;

    // Win Momentum (3 consecutive wins against DIFFERENT opponents in rated matches)
    let onFire = false;
    const ratedMatches = sortedMatches.filter(m => m.isRated !== false && m.winnerId);
    if (ratedMatches.length >= 3) {
      const last3 = ratedMatches.slice(0, 3);
      const allWon = last3.every(m => m.winnerId === id);
      const opponents = last3.map(m => m.playerAId === id ? m.playerBId : m.playerAId);
      const differentOpponents = new Set(opponents).size === 3;
      if (allWon && differentOpponents) onFire = true;
    }

    result[id] = {
      rating: glickoState[id].rating,
      rd: glickoState[id].rd,
      vol: glickoState[id].vol,
      playStreak,
      consistencyScore,
      ratedMatchesLast30,
      onFire
    };
  });

  return result;
};

export const getPlayerTier = (rating: number, stats?: any) => {
  const ratedMatchesLast30 = stats?.ratedMatchesLast30 || 0;

  // Promotion Rule: Rating crosses threshold AND >= 10 rated matches in last 30 days
  // Demotion Rule: Rating drops below threshold AND inactivity >= 14 days
  
  // We'll calculate eligibility for each tier
  const isEliteEligible = rating >= 1600 && ratedMatchesLast30 >= 10;
  const isAdvancedEligible = rating >= 1400 && ratedMatchesLast30 >= 10;
  const isIntermediateEligible = rating >= 1200 && ratedMatchesLast30 >= 10;

  if (isEliteEligible) return { name: 'Elite', bg: 'bg-purple-500', color: 'text-white', border: 'border-purple-600' };
  if (isAdvancedEligible) return { name: 'Advanced', bg: 'bg-indigo-500', color: 'text-white', border: 'border-indigo-600' };
  if (isIntermediateEligible) return { name: 'Intermediate', bg: 'bg-emerald-500', color: 'text-white', border: 'border-emerald-600' };
  
  // Handle "Pending" state for display
  if (rating >= 1600) return { name: 'Advanced', bg: 'bg-indigo-500', color: 'text-white', border: 'border-indigo-600', pendingPromotion: true };
  if (rating >= 1400) return { name: 'Intermediate', bg: 'bg-emerald-500', color: 'text-white', border: 'border-emerald-600', pendingPromotion: true };
  if (rating >= 1200) return { name: 'Beginner', bg: 'bg-slate-400', color: 'text-white', border: 'border-slate-500', pendingPromotion: true };
  
  return { name: 'Beginner', bg: 'bg-slate-400', color: 'text-white', border: 'border-slate-500' };
};



export const calculatePlayerPerformanceScore = (player: Player, matches: Match[], stats: PlayerStats) => {
  // Legacy bridge or helper
  return {
    totalScore: stats.rating,
    attendanceStreak: stats.playStreak,
    isHot: stats.onFire
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
      return { 
        ...p, 
        stats, 
        score: stats.rating, 
        attendanceStreak: stats.playStreak,
        isHot: stats.onFire
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

/**
 * Weekly Snapshot Highlights
 */
export const getWeeklyHighlights = (
  players: Player[],
  matches: Match[],
  globalStats: Record<string, any>
) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  
  // 1. Most Improved (Compare current rating with rating 7 days ago)
  const oldStats = calculateAllPlayerStats(players, matches.filter(m => m.date < sevenDaysAgo));
  const improvements = players.map(p => {
    const current = globalStats[p.id]?.rating || 1500;
    const old = oldStats[p.id]?.rating || 1500;
    return { ...p, delta: current - old };
  }).sort((a, b) => b.delta - a.delta);

  // 2. Giant Killer (Wins vs higher rated opponents in the last 7 days)
  const recentMatches = matches.filter(m => m.date >= sevenDaysAgo && m.winnerId);
  const giantKills: Record<string, number> = {};
  recentMatches.forEach(m => {
    const winnerId = m.winnerId!;
    const loserId = m.playerAId === winnerId ? m.playerBId : m.playerAId;
    const winnerRating = globalStats[winnerId]?.rating || 1500;
    const loserRating = globalStats[loserId]?.rating || 1500;
    
    if (winnerRating < loserRating - 50) { // Significant underdog win
      giantKills[winnerId] = (giantKills[winnerId] || 0) + 1;
    }
  });
  const topGiantKillers = players
    .map(p => ({ ...p, kills: giantKills[p.id] || 0 }))
    .filter(p => p.kills > 0)
    .sort((a, b) => b.kills - a.kills);

  return {
    mostImproved: improvements[0],
    longestStreak: [...players].sort((a, b) => (globalStats[b.id]?.playStreak || 0) - (globalStats[a.id]?.playStreak || 0))[0],
    mostActive: [...players].sort((a, b) => (globalStats[b.id]?.consistencyScore || 0) - (globalStats[a.id]?.consistencyScore || 0))[0],
    giantKiller: topGiantKillers[0]
  };
};


