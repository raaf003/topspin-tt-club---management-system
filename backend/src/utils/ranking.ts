import { Player, Match } from '@prisma/client';

// Glicko-2 constants
const GLICKO_SCALE = 173.7178;
export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;
export const DEFAULT_VOLATILITY = 0.06;
const TAU = 0.5;

export interface GlickoPlayer {
  rating: number;
  rd: number;
  vol: number;
}

export interface PlayerStats {
  rating: number;
  rd: number;
  volatility: number;
  earnedTier: number;
  totalRatedMatches: number;
  peakRating: number;
}

export const glicko2 = {
  toInternal: (rating: number, rd: number) => ({
    mu: (rating - DEFAULT_RATING) / GLICKO_SCALE,
    phi: rd / GLICKO_SCALE
  }),

  fromInternal: (mu: number, phi: number) => ({
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

export const processRatingPeriod = (
  players: Record<string, GlickoPlayer>,
  matches: { player1: string; player2: string; winner: string; weight: number }[]
) => {
  const updates: Record<string, { mu: number; phi: number; vol: number }> = {};
  const playerMatches: Record<string, { opponentId: string; outcome: number; weight: number }[]> = {};

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
      const newPhi = Math.sqrt(phi * phi + sigma * sigma);
      updates[id] = { mu, phi: newPhi, vol: sigma };
      return;
    }

    let v_inv = 0;
    results.forEach(r => {
      const opp = players[r.opponentId];
      const { mu: mu_j, phi: phi_j } = glicko2.toInternal(opp.rating, opp.rd);
      const g_phi_j = glicko2.computeG(phi_j);
      const E = glicko2.computeE(mu, mu_j, phi_j);
      v_inv += r.weight * g_phi_j * g_phi_j * E * (1 - E);
    });

    if (v_inv <= 0) {
      const newPhi = Math.sqrt(phi * phi + sigma * sigma);
      updates[id] = { mu, phi: newPhi, vol: sigma };
      return;
    }

    const v = 1 / v_inv;
    let delta_sum = 0;
    results.forEach(r => {
      const opp = players[r.opponentId];
      const { mu: mu_j, phi: phi_j } = glicko2.toInternal(opp.rating, opp.rd);
      const g_phi_j = glicko2.computeG(phi_j);
      const E = glicko2.computeE(mu, mu_j, phi_j);
      delta_sum += r.weight * g_phi_j * (r.outcome - E);
    });
    const delta = v * delta_sum;
    const newSigma = glicko2.updateVolatility(phi, v, delta, sigma);
    const phi_star = Math.sqrt(phi * phi + newSigma * newSigma);
    const newPhi = 1 / Math.sqrt(1 / (phi_star * phi_star) + 1 / v);
    const newMu = mu + newPhi * newPhi * delta_sum;

    updates[id] = { mu: newMu, phi: newPhi, vol: newSigma };
  });

  return updates;
};

const TIER_THRESHOLDS = [
  { tier: 5, name: 'Master', rating: 1900, matches: 60 },
  { tier: 4, name: 'Elite', rating: 1750, matches: 40 },
  { tier: 3, name: 'Advanced', rating: 1600, matches: 25 },
  { tier: 2, name: 'Intermediate', rating: 1500, matches: 15 },
  { tier: 1, name: 'Beginner', rating: 1400, matches: 10 },
  { tier: 0, name: 'Novice', rating: 0, matches: 0 },
];

export const calculateEarnedTier = (rating: number, totalMatches: number): number => {
  for (const t of TIER_THRESHOLDS) {
    if (rating >= t.rating && totalMatches >= t.matches) return t.tier;
  }
  return 0;
};

export const updateRatingsIncremental = (
  playerA: Player,
  playerB: Player,
  match: Match
): Record<string, PlayerStats> => {
  if (!match.winnerId) return {};

  const glickoState: Record<string, GlickoPlayer> = {
    [playerA.id]: { rating: playerA.rating, rd: playerA.rd, vol: playerA.volatility },
    [playerB.id]: { rating: playerB.rating, rd: playerB.rd, vol: playerB.volatility }
  };

  let weight = match.points === 10 ? 0.6 : 1.0;
  if (match.isRated === false) weight = 0;

  if (weight === 0) {
    return {
      [playerA.id]: {
        rating: playerA.rating,
        rd: playerA.rd,
        volatility: playerA.volatility,
        earnedTier: playerA.earnedTier,
        totalRatedMatches: playerA.totalRatedMatches,
        peakRating: playerA.peakRating
      },
      [playerB.id]: {
        rating: playerB.rating,
        rd: playerB.rd,
        volatility: playerB.volatility,
        earnedTier: playerB.earnedTier,
        totalRatedMatches: playerB.totalRatedMatches,
        peakRating: playerB.peakRating
      }
    };
  }

  const periodUpdates = processRatingPeriod(glickoState, [
    { player1: playerA.id, player2: playerB.id, winner: match.winnerId, weight }
  ]);

  const result: Record<string, PlayerStats> = {};
  [playerA.id, playerB.id].forEach(id => {
    const update = periodUpdates[id];
    const { rating, rd } = glicko2.fromInternal(update.mu, update.phi);
    const p = id === playerA.id ? playerA : playerB;
    
    const newTotalMatches = p.totalRatedMatches + 1;
    const newPeak = Math.max(p.peakRating, rating);
    
    result[id] = {
      rating,
      rd,
      volatility: update.vol,
      earnedTier: calculateEarnedTier(rating, newTotalMatches),
      totalRatedMatches: newTotalMatches,
      peakRating: newPeak
    };
  });

  return result;
};

export const calculateAllPlayerStats = (
  players: Player[],
  allMatches: (Match & { date: string })[]
): Record<string, PlayerStats> => {
  const result: Record<string, PlayerStats> = {};
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
    playerEarnedTier[p.id] = 0;
    playerPeakRating[p.id] = DEFAULT_RATING;
  });

  const matchesByDate: Record<string, (Match & { date: string })[]> = {};
  allMatches.forEach(m => {
    if (!matchesByDate[m.date]) matchesByDate[m.date] = [];
    matchesByDate[m.date].push(m);
  });

  const sortedDates = Object.keys(matchesByDate).sort();

  sortedDates.forEach((date) => {
    const dailyMatches = matchesByDate[date];
    const ratedMatchesToProcess: { player1: string; player2: string; winner: string; weight: number }[] = [];
    const dailyPlayerMatchCount: Record<string, number> = {};

    dailyMatches.forEach(m => {
      if (!m.winnerId) return;
      const p1 = m.playerAId;
      const p2 = m.playerBId;
      
      let baseWeight = m.points === 10 ? 0.6 : 1.0;
      if (m.isRated === false) baseWeight = 0;

      const p1Count = (dailyPlayerMatchCount[p1] || 0) + 1;
      const p2Count = (dailyPlayerMatchCount[p2] || 0) + 1;
      dailyPlayerMatchCount[p1] = p1Count;
      dailyPlayerMatchCount[p2] = p2Count;
      
      let weight = baseWeight;
      if (p1Count > 5 || p2Count > 5) weight = 0;

      // Track total rated matches for eligibility and display - regardless of capping
      if (m.isRated !== false) {
        [p1, p2].forEach(pid => playerTotalMatches[pid]++);
      }

      if (weight > 0) {
        ratedMatchesToProcess.push({ player1: p1, player2: p2, winner: m.winnerId, weight });
      }
    });

    const periodUpdates = processRatingPeriod(glickoState, ratedMatchesToProcess);
    Object.keys(periodUpdates).forEach(id => {
      const update = periodUpdates[id];
      const { rating, rd } = glicko2.fromInternal(update.mu, update.phi);
      glickoState[id] = { rating, rd, vol: update.vol };
      if (glickoState[id].rating > playerPeakRating[id]) playerPeakRating[id] = glickoState[id].rating;
      const newTier = calculateEarnedTier(glickoState[id].rating, playerTotalMatches[id]);
      if (newTier > playerEarnedTier[id]) playerEarnedTier[id] = newTier;
    });
  });

  players.forEach(p => {
    result[p.id] = {
      rating: glickoState[p.id].rating,
      rd: glickoState[p.id].rd,
      volatility: glickoState[p.id].vol,
      earnedTier: playerEarnedTier[p.id],
      totalRatedMatches: playerTotalMatches[p.id],
      peakRating: playerPeakRating[p.id]
    };
  });
  

  return result;
};