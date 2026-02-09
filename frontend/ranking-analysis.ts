/**
 * Ranking Analysis Script
 * Tests the Glicko-2 ranking logic against real match data
 */

import * as fs from 'fs';
import * as path from 'path';

// Glicko-2 constants (same as rankingUtils.ts)
const GLICKO_SCALE = 173.7178;
const DEFAULT_RATING = 1500;
const DEFAULT_RD = 350;
const DEFAULT_VOLATILITY = 0.06;
const TAU = 0.5;

interface Player {
  id: string;
  name: string;
}

interface Match {
  id: string;
  date: string;
  recordedAt: number;
  playerAId: string;
  playerBId: string;
  winnerId?: string;
  points: number;
  isRated?: boolean;
}

interface GlickoPlayer {
  rating: number;
  rd: number;
  vol: number;
}

// Glicko-2 Implementation (copied from rankingUtils.ts for standalone analysis)
const glicko2 = {
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

const processRatingPeriod = (
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

// Main analysis
async function analyzeRankings() {
  console.log('='.repeat(80));
  console.log('RANKING SYSTEM FAIRNESS ANALYSIS');
  console.log('='.repeat(80));
  
  // Read the JSON data
  const jsonPath = 'c:/Users/ghsni/Downloads/smashtrack_data_v1_2026-02-09T10-26-02-912Z.json';
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(rawData);
  
  const players: Player[] = data.players || [];
  const matches: Match[] = data.matches || [];
  
  console.log(`\n📊 DATA SUMMARY`);
  console.log(`Total Players: ${players.length}`);
  console.log(`Total Matches: ${matches.length}`);
  
  // Create player name lookup
  const playerNames: Record<string, string> = {};
  players.forEach(p => { playerNames[p.id] = p.name; });
  
  // Initialize Glicko state
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
  matches.forEach(m => {
    if (!matchesByDate[m.date]) matchesByDate[m.date] = [];
    matchesByDate[m.date].push(m);
  });
  
  const sortedDates = Object.keys(matchesByDate).sort();
  console.log(`Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`);
  
  // Track manipulation attempts and rule violations
  const manipulationReport: any[] = [];
  const dailyMatchCounts: Record<string, Record<string, number>> = {};
  const dailyPairCounts: Record<string, Record<string, number>> = {};
  
  // Process each day
  sortedDates.forEach(date => {
    const dailyMatches = matchesByDate[date] || [];
    const ratedMatchesToProcess: { player1: string; player2: string; winner: string; weight: number }[] = [];
    
    dailyMatchCounts[date] = {};
    dailyPairCounts[date] = {};
    
    dailyMatches.forEach(m => {
      if (!m.winnerId) return;
      
      const p1 = m.playerAId;
      const p2 = m.playerBId;
      const pairKey = [p1, p2].sort().join(':');
      
      // Track counts
      dailyMatchCounts[date][p1] = (dailyMatchCounts[date][p1] || 0) + 1;
      dailyMatchCounts[date][p2] = (dailyMatchCounts[date][p2] || 0) + 1;
      dailyPairCounts[date][pairKey] = (dailyPairCounts[date][pairKey] || 0) + 1;
      
      // Apply weights
      let baseWeight = m.points === 10 ? 0.6 : 1.0;
      if (m.isRated === false) baseWeight = 0;
      
      let weight = baseWeight;
      
      // Rule 3A: Daily Match Cap
      if (dailyMatchCounts[date][p1] > 5 || dailyMatchCounts[date][p2] > 5) {
        weight = 0;
        manipulationReport.push({
          date, type: 'DAILY_CAP_EXCEEDED',
          players: [playerNames[p1], playerNames[p2]],
          count: Math.max(dailyMatchCounts[date][p1], dailyMatchCounts[date][p2])
        });
      }
      
      // Rule 3B: Repeated Opponent Protection
      if (weight > 0) {
        const count = dailyPairCounts[date][pairKey];
        if (count >= 6) {
          weight = 0;
          manipulationReport.push({
            date, type: 'REPEATED_OPPONENT_BLOCKED',
            players: [playerNames[p1], playerNames[p2]],
            count
          });
        } else if (count >= 4) {
          weight *= 0.5;
          manipulationReport.push({
            date, type: 'REPEATED_OPPONENT_REDUCED',
            players: [playerNames[p1], playerNames[p2]],
            count
          });
        }
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
    
    Object.keys(periodUpdates).forEach(id => {
      const update = periodUpdates[id];
      const { rating, rd } = glicko2.fromInternal(update.mu, update.phi);
      glickoState[id] = { rating, rd, vol: update.vol };
    });
  });
  
  // Calculate win stats
  const winStats: Record<string, { wins: number; losses: number; totalMatches: number; opponents: Set<string> }> = {};
  players.forEach(p => {
    winStats[p.id] = { wins: 0, losses: 0, totalMatches: 0, opponents: new Set() };
  });
  
  matches.forEach(m => {
    if (!m.winnerId) return;
    const loserId = m.playerAId === m.winnerId ? m.playerBId : m.playerAId;
    
    if (winStats[m.winnerId]) {
      winStats[m.winnerId].wins++;
      winStats[m.winnerId].totalMatches++;
      winStats[m.winnerId].opponents.add(loserId);
    }
    if (winStats[loserId]) {
      winStats[loserId].losses++;
      winStats[loserId].totalMatches++;
      winStats[loserId].opponents.add(m.winnerId);
    }
  });
  
  // Build rankings
  const rankings = players
    .map(p => {
      const state = glickoState[p.id];
      const stats = winStats[p.id];
      const winRate = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches * 100) : 0;
      const conservativeRating = state.rating - state.rd;
      
      return {
        id: p.id,
        name: p.name,
        rating: state.rating,
        rd: state.rd,
        vol: state.vol,
        conservativeRating,
        wins: stats.wins,
        losses: stats.losses,
        totalMatches: stats.totalMatches,
        winRate,
        uniqueOpponents: stats.opponents.size
      };
    })
    .filter(p => p.totalMatches > 0)
    .sort((a, b) => b.conservativeRating - a.conservativeRating);
  
  // Output rankings
  console.log('\n📈 FINAL RANKINGS (by Conservative Rating = Rating - RD)');
  console.log('-'.repeat(100));
  console.log('Rank | Name                 | Rating    | RD     | Cons.Rtg | W-L     | WinRate | Opponents');
  console.log('-'.repeat(100));
  
  rankings.forEach((p, idx) => {
    console.log(
      `${(idx + 1).toString().padStart(4)} | ` +
      `${p.name.padEnd(20)} | ` +
      `${p.rating.toFixed(0).padStart(9)} | ` +
      `${p.rd.toFixed(0).padStart(6)} | ` +
      `${p.conservativeRating.toFixed(0).padStart(8)} | ` +
      `${p.wins}-${p.losses}`.padStart(7) + ` | ` +
      `${p.winRate.toFixed(1).padStart(6)}% | ` +
      `${p.uniqueOpponents}`
    );
  });
  
  // Fairness Analysis
  console.log('\n\n🔍 FAIRNESS ANALYSIS');
  console.log('='.repeat(80));
  
  // 1. Check if high win rate correlates with high rating
  console.log('\n1. WIN RATE VS RATING CORRELATION');
  const winRateRatingCorrelation: {name: string; winRate: number; rating: number; issue?: string}[] = [];
  
  rankings.forEach(p => {
    if (p.totalMatches >= 5) {
      let issue: string | undefined;
      if (p.winRate >= 70 && p.conservativeRating < 1300) {
        issue = 'HIGH WIN RATE BUT LOW RATING';
      } else if (p.winRate <= 30 && p.conservativeRating > 1200) {
        issue = 'LOW WIN RATE BUT HIGH RATING';
      }
      if (issue) {
        winRateRatingCorrelation.push({ name: p.name, winRate: p.winRate, rating: p.conservativeRating, issue });
      }
    }
  });
  
  if (winRateRatingCorrelation.length === 0) {
    console.log('   ✅ Win rates correlate well with ratings - no major discrepancies found');
  } else {
    console.log('   ⚠️ Found discrepancies:');
    winRateRatingCorrelation.forEach(p => {
      console.log(`      - ${p.name}: ${p.winRate.toFixed(1)}% win rate, ${p.rating.toFixed(0)} rating → ${p.issue}`);
    });
  }
  
  // 2. Opponent diversity check
  console.log('\n2. OPPONENT DIVERSITY (Anti-Farming Check)');
  const lowDiversityPlayers = rankings.filter(p => p.totalMatches >= 10 && p.uniqueOpponents < 3);
  
  if (lowDiversityPlayers.length === 0) {
    console.log('   ✅ All active players have played diverse opponents');
  } else {
    console.log('   ⚠️ Players with low opponent diversity (potential rating farming):');
    lowDiversityPlayers.forEach(p => {
      console.log(`      - ${p.name}: ${p.totalMatches} matches against only ${p.uniqueOpponents} unique opponents`);
    });
  }
  
  // 3. Rating Deviation Analysis
  console.log('\n3. RATING DEVIATION (CONFIDENCE) ANALYSIS');
  const highRdPlayers = rankings.filter(p => p.rd > 200 && p.totalMatches >= 5);
  const lowRdPlayers = rankings.filter(p => p.rd < 100);
  
  console.log(`   Players with high uncertainty (RD > 200): ${highRdPlayers.length}`);
  if (highRdPlayers.length > 0) {
    highRdPlayers.slice(0, 5).forEach(p => {
      console.log(`      - ${p.name}: RD=${p.rd.toFixed(0)}, played ${p.totalMatches} matches`);
    });
  }
  console.log(`   Players with confident ratings (RD < 100): ${lowRdPlayers.length}`);
  
  // 4. Anti-manipulation rule effectiveness
  console.log('\n4. ANTI-MANIPULATION RULES EFFECTIVENESS');
  const dailyCapViolations = manipulationReport.filter(r => r.type === 'DAILY_CAP_EXCEEDED');
  const repeatedOpponentViolations = manipulationReport.filter(r => r.type.includes('REPEATED_OPPONENT'));
  
  console.log(`   Daily match cap (>5) triggered: ${dailyCapViolations.length} times`);
  console.log(`   Repeated opponent protection triggered: ${repeatedOpponentViolations.length} times`);
  
  if (dailyCapViolations.length > 0 || repeatedOpponentViolations.length > 0) {
    console.log('\n   Recent rule applications:');
    manipulationReport.slice(-10).forEach(r => {
      console.log(`      [${r.date}] ${r.type}: ${r.players.join(' vs ')} (count: ${r.count})`);
    });
  }
  
  // 5. Head-to-head analysis for top players
  console.log('\n5. HEAD-TO-HEAD ANALYSIS (Top 5 Players)');
  const top5 = rankings.slice(0, 5);
  
  top5.forEach(p1 => {
    console.log(`\n   ${p1.name} (Rating: ${p1.rating.toFixed(0)}):`);
    const h2h: Record<string, { wins: number; losses: number }> = {};
    
    matches.forEach(m => {
      if (!m.winnerId) return;
      
      let oppId: string | null = null;
      if (m.playerAId === p1.id) oppId = m.playerBId;
      else if (m.playerBId === p1.id) oppId = m.playerAId;
      
      if (oppId && top5.some(x => x.id === oppId)) {
        if (!h2h[oppId]) h2h[oppId] = { wins: 0, losses: 0 };
        if (m.winnerId === p1.id) h2h[oppId].wins++;
        else h2h[oppId].losses++;
      }
    });
    
    Object.keys(h2h).forEach(oppId => {
      const oppName = playerNames[oppId];
      const record = h2h[oppId];
      console.log(`      vs ${oppName}: ${record.wins}-${record.losses}`);
    });
  });
  
  // 6. Upset detection (lower rated beating higher rated)
  console.log('\n6. SIGNIFICANT UPSETS (Rating diff > 100)');
  const upsets: { winner: string; loser: string; ratingDiff: number; date: string }[] = [];
  
  // Track ratings at match time (simplified - using final ratings)
  matches.forEach(m => {
    if (!m.winnerId) return;
    const loserId = m.playerAId === m.winnerId ? m.playerBId : m.playerAId;
    
    const winnerState = glickoState[m.winnerId];
    const loserState = glickoState[loserId];
    
    if (winnerState && loserState) {
      const ratingDiff = loserState.rating - winnerState.rating; // How much higher loser was rated
      if (ratingDiff > 100) {
        upsets.push({
          winner: playerNames[m.winnerId] || m.winnerId,
          loser: playerNames[loserId] || loserId,
          ratingDiff,
          date: m.date
        });
      }
    }
  });
  
  console.log(`   Total significant upsets: ${upsets.length}`);
  upsets.sort((a, b) => b.ratingDiff - a.ratingDiff);
  upsets.slice(0, 10).forEach(u => {
    console.log(`      ${u.winner} beat ${u.loser} (Δ${u.ratingDiff.toFixed(0)} points) on ${u.date}`);
  });
  
  // 7. Overall fairness score
  console.log('\n\n📋 OVERALL FAIRNESS ASSESSMENT');
  console.log('='.repeat(80));
  
  let fairnessScore = 100;
  const issues: string[] = [];
  
  // Deduct for correlation issues
  if (winRateRatingCorrelation.length > 0) {
    fairnessScore -= winRateRatingCorrelation.length * 5;
    issues.push(`${winRateRatingCorrelation.length} players have win rate/rating mismatches`);
  }
  
  // Deduct for low diversity
  if (lowDiversityPlayers.length > 0) {
    fairnessScore -= lowDiversityPlayers.length * 10;
    issues.push(`${lowDiversityPlayers.length} players may be farming ratings`);
  }
  
  // Give credit for anti-manipulation rules working
  if (dailyCapViolations.length + repeatedOpponentViolations.length > 0) {
    fairnessScore += 5;
    issues.push(`Anti-manipulation rules successfully caught ${dailyCapViolations.length + repeatedOpponentViolations.length} attempts`);
  }
  
  fairnessScore = Math.max(0, Math.min(100, fairnessScore));
  
  console.log(`\n   FAIRNESS SCORE: ${fairnessScore}/100`);
  console.log('\n   Summary:');
  issues.forEach(i => console.log(`   • ${i}`));
  
  if (fairnessScore >= 90) {
    console.log('\n   ✅ The ranking system appears to be FAIR and working correctly.');
  } else if (fairnessScore >= 70) {
    console.log('\n   ⚠️ The ranking system is MOSTLY FAIR with some minor issues.');
  } else {
    console.log('\n   ❌ The ranking system has SIGNIFICANT FAIRNESS ISSUES that need attention.');
  }
  
  // 8. Recommendations
  console.log('\n\n💡 RECOMMENDATIONS');
  console.log('='.repeat(80));
  
  const recommendations = [
    {
      priority: 'HIGH',
      issue: 'Conservative Rating Usage',
      status: '✅ GOOD',
      detail: 'The system uses (rating - RD) for rankings, which prevents new/inactive players from being overranked.'
    },
    {
      priority: 'HIGH',
      issue: 'Match Weight Differentiation', 
      status: '✅ GOOD',
      detail: '10-point matches have 0.6 weight vs 1.0 for 20-point, appropriately devaluing shorter games.'
    },
    {
      priority: 'HIGH',
      issue: 'Daily Match Cap (5 rated/day)',
      status: '✅ GOOD',
      detail: 'Prevents grinding ratings on a single day.'
    },
    {
      priority: 'MEDIUM',
      issue: 'Repeated Opponent Protection',
      status: '✅ GOOD',
      detail: 'Weight drops after 4+ matches vs same opponent, blocks after 6+.'
    },
    {
      priority: 'MEDIUM',
      issue: 'Opponent Diversity Requirement',
      status: '⚠️ CONSIDER',
      detail: 'Consider requiring minimum unique opponents for tier promotion.'
    }
  ];
  
  recommendations.forEach(r => {
    console.log(`\n   [${r.priority}] ${r.issue}`);
    console.log(`   Status: ${r.status}`);
    console.log(`   Detail: ${r.detail}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('Analysis Complete');
  console.log('='.repeat(80));
}

analyzeRankings().catch(console.error);
