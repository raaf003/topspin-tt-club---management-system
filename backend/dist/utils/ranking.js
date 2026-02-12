"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAllPlayerStats = exports.processRatingPeriod = exports.glicko2 = exports.DEFAULT_VOLATILITY = exports.DEFAULT_RD = exports.DEFAULT_RATING = void 0;
// Glicko-2 constants
const GLICKO_SCALE = 173.7178;
exports.DEFAULT_RATING = 1500;
exports.DEFAULT_RD = 350;
exports.DEFAULT_VOLATILITY = 0.06;
const TAU = 0.5;
exports.glicko2 = {
    toInternal: (rating, rd) => ({
        mu: (rating - exports.DEFAULT_RATING) / GLICKO_SCALE,
        phi: rd / GLICKO_SCALE
    }),
    fromInternal: (mu, phi) => ({
        rating: mu * GLICKO_SCALE + exports.DEFAULT_RATING,
        rd: phi * GLICKO_SCALE
    }),
    computeG: (phi) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI)),
    computeE: (mu, mu_j, phi_j) => 1 / (1 + Math.exp(-exports.glicko2.computeG(phi_j) * (mu - mu_j))),
    updateVolatility: (phi, v, delta, sigma) => {
        const a = Math.log(sigma * sigma);
        const f = (x) => {
            const ex = Math.exp(x);
            const d2 = phi * phi + v + ex;
            return (ex * (delta * delta - d2)) / (2 * d2 * d2) - (x - a) / (TAU * TAU);
        };
        let A = a;
        let B;
        if (delta * delta > phi * phi + v) {
            B = Math.log(delta * delta - phi * phi - v);
        }
        else {
            let k = 1;
            while (f(a - k * TAU) < 0)
                k++;
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
            }
            else {
                fA = fA / 2;
            }
            B = C;
            fB = fC;
        }
        return Math.exp(A / 2);
    }
};
const processRatingPeriod = (players, matches) => {
    const updates = {};
    const playerMatches = {};
    Object.keys(players).forEach(id => {
        playerMatches[id] = [];
    });
    matches.forEach(m => {
        if (!players[m.player1] || !players[m.player2])
            return;
        const outcome1 = m.winner === m.player1 ? 1 : 0;
        const outcome2 = m.winner === m.player2 ? 1 : 0;
        playerMatches[m.player1].push({ opponentId: m.player2, outcome: outcome1, weight: m.weight });
        playerMatches[m.player2].push({ opponentId: m.player1, outcome: outcome2, weight: m.weight });
    });
    Object.keys(players).forEach(id => {
        const p = players[id];
        const { mu, phi } = exports.glicko2.toInternal(p.rating, p.rd);
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
            const { mu: mu_j, phi: phi_j } = exports.glicko2.toInternal(opp.rating, opp.rd);
            const g_phi_j = exports.glicko2.computeG(phi_j);
            const E = exports.glicko2.computeE(mu, mu_j, phi_j);
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
            const { mu: mu_j, phi: phi_j } = exports.glicko2.toInternal(opp.rating, opp.rd);
            const g_phi_j = exports.glicko2.computeG(phi_j);
            const E = exports.glicko2.computeE(mu, mu_j, phi_j);
            delta_sum += r.weight * g_phi_j * (r.outcome - E);
        });
        const delta = v * delta_sum;
        const newSigma = exports.glicko2.updateVolatility(phi, v, delta, sigma);
        const phi_star = Math.sqrt(phi * phi + newSigma * newSigma);
        const newPhi = 1 / Math.sqrt(1 / (phi_star * phi_star) + 1 / v);
        const newMu = mu + newPhi * newPhi * delta_sum;
        updates[id] = { mu: newMu, phi: newPhi, vol: newSigma };
    });
    return updates;
};
exports.processRatingPeriod = processRatingPeriod;
const TIER_THRESHOLDS = [
    { tier: 5, name: 'Master', rating: 1900, matches: 60 },
    { tier: 4, name: 'Elite', rating: 1750, matches: 40 },
    { tier: 3, name: 'Advanced', rating: 1600, matches: 25 },
    { tier: 2, name: 'Intermediate', rating: 1500, matches: 15 },
    { tier: 1, name: 'Beginner', rating: 1400, matches: 10 },
    { tier: 0, name: 'Novice', rating: 0, matches: 0 },
];
const calculateEarnedTier = (rating, totalMatches) => {
    for (const t of TIER_THRESHOLDS) {
        if (rating >= t.rating && totalMatches >= t.matches)
            return t.tier;
    }
    return 0;
};
const calculateAllPlayerStats = (players, allMatches) => {
    const result = {};
    const glickoState = {};
    const playerTotalMatches = {};
    const playerEarnedTier = {};
    const playerPeakRating = {};
    players.forEach(p => {
        glickoState[p.id] = {
            rating: exports.DEFAULT_RATING,
            rd: exports.DEFAULT_RD,
            vol: exports.DEFAULT_VOLATILITY
        };
        playerTotalMatches[p.id] = 0;
        playerEarnedTier[p.id] = 0;
        playerPeakRating[p.id] = exports.DEFAULT_RATING;
    });
    const matchesByDate = {};
    allMatches.forEach(m => {
        if (!matchesByDate[m.date])
            matchesByDate[m.date] = [];
        matchesByDate[m.date].push(m);
    });
    const sortedDates = Object.keys(matchesByDate).sort();
    sortedDates.forEach((date) => {
        const dailyMatches = matchesByDate[date];
        const ratedMatchesToProcess = [];
        const dailyPlayerMatchCount = {};
        dailyMatches.forEach(m => {
            if (!m.winnerId)
                return;
            const p1 = m.playerAId;
            const p2 = m.playerBId;
            let baseWeight = m.points === 10 ? 0.6 : 1.0;
            if (m.isRated === false)
                baseWeight = 0;
            const p1Count = (dailyPlayerMatchCount[p1] || 0) + 1;
            const p2Count = (dailyPlayerMatchCount[p2] || 0) + 1;
            dailyPlayerMatchCount[p1] = p1Count;
            dailyPlayerMatchCount[p2] = p2Count;
            let weight = baseWeight;
            if (p1Count > 5 || p2Count > 5)
                weight = 0;
            if (weight > 0) {
                ratedMatchesToProcess.push({ player1: p1, player2: p2, winner: m.winnerId, weight });
                [p1, p2].forEach(pid => playerTotalMatches[pid]++);
            }
        });
        const periodUpdates = (0, exports.processRatingPeriod)(glickoState, ratedMatchesToProcess);
        Object.keys(periodUpdates).forEach(id => {
            const update = periodUpdates[id];
            const { rating, rd } = exports.glicko2.fromInternal(update.mu, update.phi);
            glickoState[id] = { rating, rd, vol: update.vol };
            if (glickoState[id].rating > playerPeakRating[id])
                playerPeakRating[id] = glickoState[id].rating;
            const newTier = calculateEarnedTier(glickoState[id].rating, playerTotalMatches[id]);
            if (newTier > playerEarnedTier[id])
                playerEarnedTier[id] = newTier;
        });
    });
    players.forEach(p => {
        result[p.id] = {
            rating: glickoState[p.id].rating,
            rd: glickoState[p.id].rd,
            vol: glickoState[p.id].vol,
            earnedTier: playerEarnedTier[p.id],
            totalRatedMatches: playerTotalMatches[p.id],
            peakRating: playerPeakRating[p.id]
        };
    });
    return result;
};
exports.calculateAllPlayerStats = calculateAllPlayerStats;
