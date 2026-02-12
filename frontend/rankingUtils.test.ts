import { describe, it, expect, beforeEach } from 'vitest';
import { 
  glicko2, 
  processRatingPeriod, 
  calculateAllPlayerStats, 
  getTopPerformers,
  calculatePlayerRatingHistory,
  TIER_THRESHOLDS
} from './rankingUtils';
import { Player, Match, UserRole, PayerOption } from './types';

describe('Glicko-2 Core Math', () => {
  it('should convert to and from internal scaling correctly', () => {
    const rating = 1500;
    const rd = 350;
    const { mu, phi } = glicko2.toInternal(rating, rd);
    const back = glicko2.fromInternal(mu, phi);
    
    expect(back.rating).toBeCloseTo(1500);
    expect(back.rd).toBeCloseTo(350);
  });

  it('should compute g(phi) correctly', () => {
    // g(0) should be 1
    expect(glicko2.computeG(0)).toBe(1);
    // g(phi) should decrease as phi increases
    expect(glicko2.computeG(1)).toBeLessThan(1);
  });
});

describe('processRatingPeriod', () => {
  const players = {
    'p1': { rating: 1500, rd: 200, vol: 0.06 },
    'p2': { rating: 1400, rd: 30, vol: 0.06 }
  };

  it('should increase RD for inactive players', () => {
    const updates = processRatingPeriod(players, []);
    expect(updates['p1'].phi).toBeGreaterThan(glicko2.toInternal(1500, 200).phi);
    expect(updates['p2'].phi).toBeGreaterThan(glicko2.toInternal(1400, 30).phi);
  });

  it('should update ratings based on match outcomes', () => {
    const matches = [{ player1: 'p1', player2: 'p2', winner: 'p1', weight: 1 }];
    const updates = processRatingPeriod(players, matches);
    
    const p1Result = glicko2.fromInternal(updates['p1'].mu, updates['p1'].phi);
    const p2Result = glicko2.fromInternal(updates['p2'].mu, updates['p2'].phi);
    
    expect(p1Result.rating).toBeGreaterThan(1500);
    expect(p2Result.rating).toBeLessThan(1400);
  });
});

describe('calculateAllPlayerStats', () => {
  const mockPlayers: Player[] = [
    { id: '1', name: 'Alice', initialBalance: 0, createdAt: 0 },
    { id: '2', name: 'Bob', initialBalance: 0, createdAt: 0 }
  ];

  const mockMatches: Match[] = [
    {
      id: 'm1',
      date: '2026-01-01',
      playerAId: '1',
      playerBId: '2',
      winnerId: '1',
      points: 20,
      isRated: true,
      recordedAt: Date.now(),
      recordedBy: { role: UserRole.ADMIN, name: 'Admin' },
      payerOption: PayerOption.BOTH,
      totalValue: 100,
      charges: { '1': 50, '2': 50 }
    }
  ];

  it('should calculate stats for players', () => {
    const stats = calculateAllPlayerStats(mockPlayers, mockMatches);
    expect(stats['1']).toBeDefined();
    expect(stats['1'].rating).toBeGreaterThan(1500);
    expect(stats['1'].totalRatedMatches).toBe(1);
  });

  it('should apply RD growth for gaps', () => {
    // 1. One match today
    const statsImmediately = calculateAllPlayerStats(mockPlayers, mockMatches);
    const rdImmediately = statsImmediately['1'].rd;
    
    // 2. Same match but 100 days ago
    const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const oldMatches: Match[] = [
      {
        ...mockMatches[0],
        date: hundredDaysAgo
      }
    ];
    
    // We expect RD to have grown back towards 350 during the 100 days of inactivity until today
    const statsAfterGap = calculateAllPlayerStats(mockPlayers, oldMatches);
    expect(statsAfterGap['1'].rd).toBeGreaterThan(rdImmediately);
    expect(statsAfterGap['1'].rd).toBeLessThanOrEqual(350);
  });

  it('should enforce the 5-match daily cap', () => {
    const manyMatches: Match[] = Array(10).fill(null).map((_, i) => ({
      ...mockMatches[0],
      id: `limit-${i}`,
      date: '2026-01-01'
    }));
    
    const stats = calculateAllPlayerStats(mockPlayers, manyMatches);
    // Only first 5 matches should count toward totalRatedMatches
    expect(stats['1'].totalRatedMatches).toBe(5);
  });
});

describe('getTopPerformers', () => {
  const players: Player[] = [
    { id: '1', name: 'Pro', initialBalance: 0, createdAt: 0 },
    { id: '2', name: 'Noob', initialBalance: 0, createdAt: 0 }
  ];

  const stats = (id: string) => ({
    rating: id === '1' ? 2000 : 1200,
    rd: 50,
    totalRatedMatches: 10,
    ratedMatchesLast30: 5,
    playStreak: 2,
    onFire: false,
    earnedTier: id === '1' ? 5 : 0,
    peakRating: id === '1' ? 2000 : 1200,
  } as any);

  it('should exclude players with fewer than 5 matches', () => {
    const lowMatchStats = (id: string) => ({
      ...stats(id),
      totalRatedMatches: 2
    });
    const top = getTopPerformers(players, [], lowMatchStats, 3);
    expect(top.length).toBe(0);
  });

  it('should rank by conservative score', () => {
    const top = getTopPerformers(players, [], stats, 3);
    expect(top[0].id).toBe('1');
    expect(top[0].score).toBeGreaterThan(top[1].score);
  });
});

describe('Tier Progression', () => {
  it('should respect the climb-only system', () => {
    const players: Player[] = [{ id: '1', name: 'Alice', initialBalance: 0, createdAt: 0 }];
    // Alice wins one match and gets a high rating, but doesn't have enough matches for Beginner tier
    const matches: Match[] = [{
      ...fakeMatch('1', '2', '1'),
      isRated: true
    }];
    
    const stats = calculateAllPlayerStats([players[0], { id: '2', name: 'Bob', initialBalance: 0, createdAt: 0 }], matches);
    // Alice rating is > 1500 (Intermediate req is 1500 and 15 matches)
    // She should still be Novice (0) because she only has 1 match
    expect(stats['1'].earnedTier).toBe(0);
  });
});

function fakeMatch(p1: string, p2: string, winner: string): Match {
  return {
    id: Math.random().toString(),
    date: '2026-01-01',
    playerAId: p1,
    playerBId: p2,
    winnerId: winner,
    points: 20,
    recordedAt: Date.now(),
    recordedBy: { role: UserRole.ADMIN, name: 'Admin' },
    payerOption: PayerOption.BOTH,
    totalValue: 100,
    charges: {},
    isRated: true
  };
}
