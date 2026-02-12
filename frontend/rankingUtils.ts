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
      updates[id] = { mu, phi: newPhi, vol: sigma };
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

    // Guard against zero variance (e.g. all matches had zero weight)
    if (v_inv <= 0) {
      const newPhi = Math.sqrt(phi * phi + sigma * sigma);
      updates[id] = { mu, phi: newPhi, vol: sigma };
      return;
    }

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
 * Tier thresholds for the "Climb Only" system
 * Players can only go UP in tiers, never down
 * Requires both rating threshold AND total matches played
 */
const TIER_THRESHOLDS = [
  { tier: 5, name: 'Master', rating: 1900, matches: 60 },
  { tier: 4, name: 'Elite', rating: 1750, matches: 40 },
  { tier: 3, name: 'Advanced', rating: 1600, matches: 25 },
  { tier: 2, name: 'Intermediate', rating: 1500, matches: 15 },
  { tier: 1, name: 'Beginner', rating: 1400, matches: 10 },
  { tier: 0, name: 'Novice', rating: 0, matches: 0 },
];

const calculateEarnedTier = (rating: number, totalMatches: number): number => {
  for (const t of TIER_THRESHOLDS) {
    if (rating >= t.rating && totalMatches >= t.matches) {
      return t.tier;
    }
  }
  return 0; // Novice
};

/**
 * Main function to calculate all ratings and metrics from scratch.
 * This ensures consistency and prevents manipulation.
 */
export const calculateAllPlayerStats = (
  players: Player[],
  allMatches: Match[]
): Record<string, { rating: number; rd: number; vol: number; playStreak: number; consistencyScore: number; onFire: boolean; ratedMatchesLast30: number; rating7DaysAgo: number; lastMatchDate: string | null; earnedTier: number; totalRatedMatches: number; peakRating: number }> => {
  const result: Record<string, any> = {};
  
  // Initialize Glicko state for everyone (Always start from defaults to replay history correctly)
  const glickoState: Record<string, GlickoPlayer> = {};
  const playerTotalMatches: Record<string, number> = {};
  const playerEarnedTier: Record<string, number> = {};
  const playerPeakRating: Record<string, number> = {};
  
  players.forEach(p => {
    glickoState[p.id] = {
      rating: DEFAULT_RATING,
      rd: DEFAULT_RD,
      vol: DEFAULT_VOLATILITY
    };
    playerTotalMatches[p.id] = 0;
    playerEarnedTier[p.id] = 0; // Everyone starts as Novice
    playerPeakRating[p.id] = DEFAULT_RATING;
  });

  // Group matches by date for daily rating periods
  const matchesByDate: Record<string, Match[]> = {};
  allMatches.forEach(m => {
    if (!matchesByDate[m.date]) matchesByDate[m.date] = [];
    matchesByDate[m.date].push(m);
  });

  const sortedDates = Object.keys(matchesByDate).sort();
  const ratingHistory: Record<string, number> = {};

  if (sortedDates.length === 0) {
    players.forEach(p => {
      result[p.id] = {
        rating: DEFAULT_RATING,
        rd: DEFAULT_RD,
        vol: DEFAULT_VOLATILITY,
        playStreak: 0,
        consistencyScore: 0,
        ratedMatchesLast30: 0,
        onFire: false,
        rating7DaysAgo: DEFAULT_RATING,
        lastMatchDate: null,
        earnedTier: 0,
        totalRatedMatches: 0,
        peakRating: DEFAULT_RATING
      };
    });
    return result;
  }

  // Process only days where matches occurred, and apply RD growth for gaps in between
  const today = new Date();
  const rating7DaysAgoLimit = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
  let rating7DaysAgoCaptured = false;
  let lastProcessedDateStr = sortedDates[0];

  sortedDates.forEach((date) => {
    const dailyMatches = matchesByDate[date] || [];
    
    // 1. Calculate gap since last processed match day to apply skipping growth
    const currentDate = new Date(date);
    const lastDate = new Date(lastProcessedDateStr);
    const daysGap = Math.floor((currentDate.getTime() - lastDate.getTime()) / (24 * 3600 * 1000));

    // 2. Apply RD growth for inactive days (Step 6)
    // processRatingPeriod handles 1 day of growth, so we handle (daysGap - 1) days
    if (daysGap > 1) {
      const inactiveDays = daysGap - 1;
      Object.keys(glickoState).forEach(id => {
        const p = glickoState[id];
        const { phi: phiInternal } = glicko2.toInternal(p.rating, p.rd);
        const newPhiInternal = Math.sqrt(phiInternal * phiInternal + inactiveDays * p.vol * p.vol);
        const { rd: newRdCalculated } = glicko2.fromInternal(p.rating, newPhiInternal);
        glickoState[id].rd = Math.min(newRdCalculated, DEFAULT_RD);
      });
    }

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
      const p1Count = (dailyPlayerMatchCount[p1] || 0) + 1;
      const p2Count = (dailyPlayerMatchCount[p2] || 0) + 1;
      dailyPlayerMatchCount[p1] = p1Count;
      dailyPlayerMatchCount[p2] = p2Count;
      
      let weight = baseWeight;
      if (p1Count > 5 || p2Count > 5) {
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

        // Track total rated matches and peak rating updates only for matches that actually counted
        [p1, p2].forEach(pid => {
          if (playerTotalMatches[pid] === undefined) return;
          playerTotalMatches[pid]++;
        });
      }
    });

    const periodUpdates = processRatingPeriod(glickoState, ratedMatchesToProcess);
    
    // Apply updates
    Object.keys(periodUpdates).forEach(id => {
      const update = periodUpdates[id];
      const { rating, rd } = glicko2.fromInternal(update.mu, update.phi);
      glickoState[id] = { rating, rd, vol: update.vol };

      // Track peak rating and check for tier promotion
      if (glickoState[id].rating > playerPeakRating[id]) {
        playerPeakRating[id] = glickoState[id].rating;
      }
      const newTier = calculateEarnedTier(glickoState[id].rating, playerTotalMatches[id]);
      if (newTier > playerEarnedTier[id]) {
        playerEarnedTier[id] = newTier;
      }
    });

    // Capture history for "Most Improved"
    if (!rating7DaysAgoCaptured && date >= rating7DaysAgoLimit) {
      Object.keys(glickoState).forEach(id => {
        ratingHistory[id] = glickoState[id].rating;
      });
      rating7DaysAgoCaptured = true;
    }

    lastProcessedDateStr = date;
  });

  // Final growth from last match to today
  const lastMatchDateStr = sortedDates[sortedDates.length - 1];
  const lastMatchDate = new Date(lastMatchDateStr);
  const daysToToday = Math.floor((today.getTime() - lastMatchDate.getTime()) / (24 * 3600 * 1000));
  if (daysToToday > 0) {
    Object.keys(glickoState).forEach(id => {
      const p = glickoState[id];
      const { phi: phiInternal } = glicko2.toInternal(p.rating, p.rd);
      const newPhiInternal = Math.sqrt(phiInternal * phiInternal + daysToToday * p.vol * p.vol);
      const { rd: newRdCalculated } = glicko2.fromInternal(p.rating, newPhiInternal);
      glickoState[id].rd = Math.min(newRdCalculated, DEFAULT_RD);
    });
  }

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
      onFire,
      rating7DaysAgo: ratingHistory[id] ?? DEFAULT_RATING,
      lastMatchDate: uniqueDays[0] || null,
      earnedTier: playerEarnedTier[id] || 0,
      totalRatedMatches: playerTotalMatches[id] || 0,
      peakRating: playerPeakRating[id] || DEFAULT_RATING
    };
  });

  return result;
};

/**
 * Get player tier based on their EARNED tier (climb-only system)
 * Players never lose their tier - they can only climb up
 */
export const getPlayerTier = (rating: number, stats?: any) => {
  const earnedTier = stats?.earnedTier ?? 0;
  const totalRatedMatches = stats?.totalRatedMatches ?? 0;
  
  // Find the next tier the player can work towards
  const getNextTierInfo = () => {
    for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
      const t = TIER_THRESHOLDS[i];
      if (t.tier > earnedTier) {
        const needsRating = rating < t.rating;
        const needsMatches = totalRatedMatches < t.matches;
        if (needsRating || needsMatches) {
          return {
            nextTierName: t.name,
            ratingNeeded: needsRating ? t.rating - rating : 0,
            matchesNeeded: needsMatches ? t.matches - totalRatedMatches : 0
          };
        }
      }
    }
    return null;
  };
  
  const nextTier = getNextTierInfo();
  const pendingPromotion = nextTier && nextTier.ratingNeeded <= 0 && nextTier.matchesNeeded > 0;
  
  const tierInfo = {
    5: { name: 'Master', bg: 'bg-gradient-to-r from-amber-500 to-yellow-400', color: 'text-white', border: 'border-amber-600' },
    4: { name: 'Elite', bg: 'bg-purple-600', color: 'text-white', border: 'border-purple-700' },
    3: { name: 'Advanced', bg: 'bg-indigo-500', color: 'text-white', border: 'border-indigo-600' },
    2: { name: 'Intermediate', bg: 'bg-emerald-500', color: 'text-white', border: 'border-emerald-600' },
    1: { name: 'Beginner', bg: 'bg-slate-400', color: 'text-white', border: 'border-slate-500' },
    0: { name: 'Novice', bg: 'bg-gray-300', color: 'text-gray-700', border: 'border-gray-400' }
  };
  
  const tier = tierInfo[earnedTier as keyof typeof tierInfo] || tierInfo[0];
  
  return {
    ...tier,
    earnedTier,
    pendingPromotion,
    nextTier
  };
};

// Export tier thresholds for UI display
export { TIER_THRESHOLDS };



export const calculatePlayerPerformanceScore = (player: Player, matches: Match[], stats: PlayerStats) => {
  // Legacy bridge or helper
  return {
    totalScore: stats.rating,
    attendanceStreak: stats.playStreak,
    isHot: stats.onFire
  };
};

/**
 * Calculate rating history for a specific player.
 * Returns an array of { date, rating, rd, matchCount } for each day they played.
 */
export const calculatePlayerRatingHistory = (
  playerId: string,
  players: Player[],
  allMatches: Match[]
): { date: string; rating: number; rd: number; matchCount: number; result: 'W' | 'L' | 'mixed' }[] => {
  const history: { date: string; rating: number; rd: number; matchCount: number; result: 'W' | 'L' | 'mixed' }[] = [];
  
  // Initialize Glicko state for everyone
  const glickoState: Record<string, GlickoPlayer> = {};
  players.forEach(p => {
    glickoState[p.id] = {
      rating: DEFAULT_RATING,
      rd: DEFAULT_RD,
      vol: DEFAULT_VOLATILITY
    };
  });

  // Group matches by date
  const matchesByDate: Record<string, Match[]> = {};
  allMatches.forEach(m => {
    if (!matchesByDate[m.date]) matchesByDate[m.date] = [];
    matchesByDate[m.date].push(m);
  });

  const sortedDates = Object.keys(matchesByDate).sort();
  if (sortedDates.length === 0) return history;

  // Process only days where matches occurred, and apply RD growth for gaps in between
  const today = new Date();
  let lastProcessedDateStr = sortedDates[0];

  sortedDates.forEach((date) => {
    const dailyMatches = matchesByDate[date] || [];

    // 1. Calculate gap since last processed match day to apply skipping growth
    const currentDate = new Date(date);
    const lastDate = new Date(lastProcessedDateStr);
    const daysGap = Math.floor((currentDate.getTime() - lastDate.getTime()) / (24 * 3600 * 1000));

    // 2. Apply RD growth for inactive days (Step 6)
    if (daysGap > 1) {
      const inactiveDays = daysGap - 1;
      Object.keys(glickoState).forEach(id => {
        const p = glickoState[id];
        const { phi: phiInternal } = glicko2.toInternal(p.rating, p.rd);
        const newPhiInternal = Math.sqrt(phiInternal * phiInternal + inactiveDays * p.vol * p.vol);
        const { rd: newRd } = glicko2.fromInternal(p.rating, newPhiInternal);
        glickoState[id].rd = newRd;
      });
    }

    const ratedMatchesToProcess: { player1: string; player2: string; winner: string; weight: number }[] = [];

    // Tracks for anti-manipulation
    const dailyPlayerMatchCount: Record<string, number> = {};
    const dailyPairCount: Record<string, number> = {};

    dailyMatches.forEach(m => {
      if (!m.winnerId) return;

      const p1 = m.playerAId;
      const p2 = m.playerBId;
      const pairKey = [p1, p2].sort().join(':');

      let baseWeight = m.points === 10 ? 0.6 : 1.0;
      if (m.isRated === false) baseWeight = 0;

      dailyPlayerMatchCount[p1] = (dailyPlayerMatchCount[p1] || 0) + 1;
      dailyPlayerMatchCount[p2] = (dailyPlayerMatchCount[p2] || 0) + 1;
      
      let weight = baseWeight;
      if (dailyPlayerMatchCount[p1] > 5 || dailyPlayerMatchCount[p2] > 5) {
        weight = 0;
      }

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

    // Check if this player played today
    const playerDailyMatches = dailyMatches.filter(m => 
      (m.playerAId === playerId || m.playerBId === playerId) && m.winnerId
    );
    
    if (playerDailyMatches.length > 0) {
      const wins = playerDailyMatches.filter(m => m.winnerId === playerId).length;
      const losses = playerDailyMatches.length - wins;
      let result: 'W' | 'L' | 'mixed' = 'mixed';
      if (wins > 0 && losses === 0) result = 'W';
      else if (losses > 0 && wins === 0) result = 'L';
      
      history.push({
        date,
        rating: glickoState[playerId].rating,
        rd: glickoState[playerId].rd,
        matchCount: playerDailyMatches.length,
        result
      });
    }

    lastProcessedDateStr = date;
  });

  return history;
};

/**
 * Calculate average rating of opponents a player has beaten in the last 90 days.
 * This helps identify if wins are against strong or weak opponents.
 */
const getAverageOpponentRating = (
  playerId: string,
  matches: Match[],
  playerStatsLookup: Record<string, PlayerStats>
) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().split('T')[0];
  
  // Get all won matches for this player in the last 90 days
  const wonMatches = matches.filter(m => 
    m.winnerId === playerId && 
    m.isRated !== false && 
    m.date >= ninetyDaysAgo
  );
  
  if (wonMatches.length === 0) {
    // If no recent wins, we check all-time wins but penalize slightly
    const allWonMatches = matches.filter(m => m.winnerId === playerId && m.isRated !== false);
    if (allWonMatches.length === 0) return DEFAULT_RATING * 0.9; // Penalty for zero wins
    
    const totalOpponentRating = allWonMatches.reduce((sum, m) => {
      const opponentId = m.playerAId === playerId ? m.playerBId : m.playerAId;
      return sum + (playerStatsLookup[opponentId]?.rating || DEFAULT_RATING);
    }, 0);
    return (totalOpponentRating / allWonMatches.length) * 0.95; // Small penalty for stale wins
  }
  
  const totalOpponentRating = wonMatches.reduce((sum, m) => {
    const opponentId = m.playerAId === playerId ? m.playerBId : m.playerAId;
    return sum + (playerStatsLookup[opponentId]?.rating || DEFAULT_RATING);
  }, 0);
  
  return totalOpponentRating / wonMatches.length;
};

/**
 * Returns the top performing players sorted by multi-factor performance score.
 * Eligibility: Minimum 5 rated matches (anti-volatility).
 * Factors: Conservative Rating (60%), Opponent Strength (30%), Activity (10%)
 */
export const getTopPerformers = (
  players: Player[],
  matches: Match[],
  getPlayerStats: (id: string) => PlayerStats,
  limit: number = 3
) => {
  // Build player stats lookup for all players (needed for opponent strength calculation)
  const allPlayerStats: Record<string, PlayerStats> = {};
  players.forEach(p => {
    allPlayerStats[p.id] = getPlayerStats(p.id);
  });
  
  const result = players
    .filter(p => (allPlayerStats[p.id]?.totalRatedMatches || 0) >= 5) // Minimum match requirement
    .map(p => {
      const stats = allPlayerStats[p.id];
      const rating = typeof stats.rating === 'number' ? stats.rating : DEFAULT_RATING;
      const rd = typeof stats.rd === 'number'? stats.rd : DEFAULT_RD;
      
      // Conservative Rating (Rating - 2 * RD) is standard for leaderboards
      // It represents "we are 95% sure this player is at least this good"
      const conservativeRating = rating - (2 * rd);
      
      // Calculate average rating of opponents this player has beaten
      const avgOpponentRating = getAverageOpponentRating(p.id, matches, allPlayerStats);
      const opponentStrengthFactor = Math.min(avgOpponentRating / DEFAULT_RATING, 1.5);
      
      // Activity bonus: reward players who play frequently
      const activityBonus = Math.min((stats.ratedMatchesLast30 || 0) * 5, 100);
      
      // Multi-factor score:
      const score = (conservativeRating * 0.60) + 
                   (conservativeRating * opponentStrengthFactor * 0.30) +
                   (activityBonus * 0.10);
      
      return { 
        ...p, 
        stats, 
        score,
        displayRating: rating,
        displayRd: rd,
        opponentStrength: avgOpponentRating,
        attendanceStreak: stats.playStreak ?? 0,
        isHot: stats.onFire ?? false
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return result;
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
  const recentMatches = matches.filter(m => m.date >= sevenDaysAgo && m.winnerId);

  // 1. Most Improved (Uses rating7DaysAgo pre-calculated in calculateAllPlayerStats)
  const improvements = players.map(p => {
    const current = globalStats[p.id]?.rating || DEFAULT_RATING;
    const old = globalStats[p.id]?.rating7DaysAgo || DEFAULT_RATING;
    return { ...p, delta: current - old };
  }).sort((a, b) => b.delta - a.delta);

  // 2. Giant Killer (Wins vs higher rated opponents in the last 7 days)
  const giantKills: Record<string, number> = {};
  recentMatches.forEach(m => {
    const winnerId = m.winnerId!;
    const loserId = m.playerAId === winnerId ? m.playerBId : m.playerAId;
    const winnerRating = globalStats[winnerId]?.rating || DEFAULT_RATING;
    const loserRating = globalStats[loserId]?.rating || DEFAULT_RATING;
    
    if (winnerRating < loserRating - 50) { // Significant underdog win
      giantKills[winnerId] = (giantKills[winnerId] || 0) + 1;
    }
  });
  const topGiantKillers = players
    .map(p => ({ ...p, kills: giantKills[p.id] || 0 }))
    .filter(p => p.kills > 0)
    .sort((a, b) => b.kills - a.kills);

  // 3. Best Win Rate This Week (minimum 3 games)
  const weeklyWinRates = players.map(p => {
    const playerMatches = recentMatches.filter(m => m.playerAId === p.id || m.playerBId === p.id);
    const wins = playerMatches.filter(m => m.winnerId === p.id).length;
    const total = playerMatches.length;
    return { ...p, wins, total, winRate: total >= 3 ? (wins / total) * 100 : 0 };
  }).filter(p => p.total >= 3).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  return {
    mostImproved: (improvements[0]?.delta > 0) ? improvements[0] : undefined,
    longestStreak: players.filter(p => (globalStats[p.id]?.playStreak || 0) >= 2)
      .sort((a, b) => (globalStats[b.id]?.playStreak || 0) - (globalStats[a.id]?.playStreak || 0))[0],
    mostActive: players.filter(p => (globalStats[p.id]?.consistencyScore || 0) > 0)
      .sort((a, b) => (globalStats[b.id]?.consistencyScore || 0) - (globalStats[a.id]?.consistencyScore || 0))[0],
    giantKiller: topGiantKillers[0] ? { ...topGiantKillers[0], upsetCount: topGiantKillers[0].kills } : undefined,
    weeklyBestWinRate: weeklyWinRates[0]
  };
};


