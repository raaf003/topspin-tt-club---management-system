import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Match, Payment, Expense, AppState, UserRole, PayerOption, PaymentMode, OngoingMatch, ThemeMode, PlayerStats } from '../types';
import { calculateAllPlayerStats } from '../rankingUtils';
import { api, API_URL, SOCKET_URL } from '../api';
import { io, Socket } from 'socket.io-client';

interface AppContextType extends AppState {
  globalPlayerStats: Record<string, { rating: number; rd: number; vol: number; playStreak: number; consistencyScore: number; onFire: boolean; ratedMatchesLast30: number; rating7DaysAgo: number; lastMatchDate: string | null; earnedTier: number; totalRatedMatches: number; peakRating: number }>;
  matchRates: { [key: string]: number };
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => Promise<void>;
  updatePlayer: (id: string, player: Partial<Player>) => Promise<void>;
  addMatch: (match: Omit<Match, 'id'>) => Promise<void>;
  updateMatch: (id: string, match: Partial<Match>) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<void>;
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  startOngoingMatch: (match: OngoingMatch) => void;
  clearOngoingMatch: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  isDarkMode: boolean;
  getPlayerDues: (playerId: string) => number;
  getPlayerStats: (playerId: string, dateRange?: { start: string; end: string }) => PlayerStats;
  login: (user: any, token: string) => void;
  logout: () => void;
  refreshData: (silent?: boolean) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'smashtrack_theme_v1';
const TOKEN_KEY = 'smashtrack_token';
const USER_KEY = 'smashtrack_user';

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const getEffectiveTheme = (themeMode: ThemeMode): 'light' | 'dark' => {
  if (themeMode === 'auto') {
    return getSystemTheme();
  }
  return themeMode;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem(TOKEN_KEY));
  const socketRef = React.useRef<Socket | null>(null);
  
  const [state, setState] = useState<AppState & { matchRates: { [key: string]: number } }>({
    players: [],
    matches: [],
    payments: [],
    expenses: [],
    tables: [],
    gameConfigs: [],
    ongoingMatch: null,
    matchRates: {},
    currentUser: JSON.parse(localStorage.getItem(USER_KEY) || '{"role":"STAFF","name":"Guest"}'),
    themeMode: (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'auto'
  });

  const isAuthenticated = !!token;

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(prev => ({
      ...prev,
      players: [],
      matches: [],
      payments: [],
      expenses: [],
      currentUser: { role: UserRole.STAFF, name: 'Guest' }
    }));
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!token) {
      if (!silent) setIsLoading(false);
      return;
    }
    
    if (!silent) setIsLoading(true);
    try {
      const isAdminFlag = state.currentUser.role === UserRole.ADMIN || state.currentUser.role === UserRole.SUPER_ADMIN;

      const [players, matchResponse, payments, configs, expenses, tables] = await Promise.all([
        api.get('/players'),
        api.get('/matches?limit=1000'), // Default fetch a large batch for leaderboard
        api.get('/finance/payments'),
        api.get('/config/game-types'),
        isAdminFlag ? api.get('/finance/expenses') : Promise.resolve([]),
        api.get('/config/tables')
      ]);

      const matches = Array.isArray(matchResponse) ? matchResponse : (matchResponse.matches || []);

      const ratesMap = (configs || []).reduce((acc: any, curr: any) => {
        acc[curr.type] = curr.price;
        return acc;
      }, {});
      
      setState(prev => ({
        ...prev,
        players,
        matches,
        payments,
        expenses: expenses || [],
        tables: tables || [],
        gameConfigs: configs || [],
        matchRates: ratesMap
      }));
    } catch (error) {
      console.error('Failed to fetch data:', error);
      if ((error as any).message?.includes('token') || (error as any).status === 401) {
        logout();
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [token, state.currentUser?.role, logout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (token && !socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket'], // Prefer websocket for reliability in some envs
        reconnection: true
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to real-time sync');
      });

      socketRef.current.on('live-match-sync', (match: OngoingMatch | null) => {
        setState(prev => ({ ...prev, ongoingMatch: match }));
      });

      socketRef.current.on('data-updated', (data: { type: string }) => {
        console.log('Real-time data update:', data.type);
        fetchData(true);
      });
    }

    if (!token && socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [token, fetchData]);
  
  const login = (user: any, newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setToken(newToken);
    setState(prev => ({ ...prev, currentUser: user }));
  };

  const globalPlayerStats = useMemo(() => {
    return calculateAllPlayerStats(state.players, state.matches);
  }, [state.players, state.matches]);

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(state.themeMode);
    localStorage.setItem(THEME_STORAGE_KEY, state.themeMode);
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.themeMode]);

  const addPlayer = async (playerData: Omit<Player, 'id' | 'createdAt'>) => {
    const newPlayer = await api.post('/players', playerData);
    setState(prev => ({ ...prev, players: [newPlayer, ...prev.players] }));
  };

  const updatePlayer = async (id: string, playerData: Partial<Player>) => {
    const updated = await api.patch('/players/' + id, playerData);
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? updated : p)
    }));
  };

  const addMatch = async (matchData: Omit<Match, 'id'>) => {
    const newMatch = await api.post('/matches', {
      ...matchData,
      recordedAt: Date.now()
    });
    setState(prev => ({ ...prev, matches: [newMatch, ...prev.matches] }));
    const players = await api.get('/players');
    setState(prev => ({ ...prev, players }));
  };

  const updateMatch = async (id: string, matchData: Partial<Match>) => {
    const updated = await api.patch('/matches/' + id, matchData);
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === id ? updated : m)
    }));
  };

  const addPayment = async (paymentData: Omit<Payment, 'id'>) => {
    const { primaryPayerId, ...rest } = paymentData as any;
    const newPayment = await api.post('/finance/payment', {
      ...rest,
      playerId: primaryPayerId
    });
    setState(prev => ({ ...prev, payments: [newPayment, ...prev.payments] }));
  };

  const updatePayment = async (id: string, paymentData: Partial<Payment>) => {
    const { primaryPayerId, ...rest } = paymentData as any;
    const updated = await api.patch('/finance/payment/' + id, {
      ...rest,
      playerId: primaryPayerId
    });
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === id ? updated : p)
    }));
  };

  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    const newExpense = await api.post('/finance/expense', expenseData);
    setState(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
  };

  const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
    const updated = await api.patch('/finance/expense/' + id, expenseData);
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.map(ex => ex.id === id ? updated : ex)
    }));
  };

  const startOngoingMatch = useCallback(async (match: OngoingMatch) => {
    try {
      await api.post('/matches/live', match);
    } catch (err: any) {
      console.error('Failed to start live match:', err);
      // Re-throw to allow component to handle it
      throw err;
    }
  }, []);

  const clearOngoingMatch = useCallback(async () => {
    try {
      await api.delete('/matches/live');
    } catch (err) {
      console.error('Failed to stop live match:', err);
    }
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setState(prev => ({ ...prev, themeMode: mode }));
  }, []);

  const getPlayerStats = useCallback((playerId: string, dateRange?: { start: string; end: string }): PlayerStats => {
    const player = state.players.find(p => p.id === playerId);
    
    // Filter matches and payments based on dateRange if provided
    let filteredMatches = state.matches;
    let filteredPayments = state.payments;

    if (dateRange) {
      filteredMatches = state.matches.filter(m => m.date >= dateRange.start && m.date <= dateRange.end);
      filteredPayments = state.payments.filter(p => p.date >= dateRange.start && p.date <= dateRange.end);
    }

    const playerMatches = filteredMatches
      .filter(m => m.playerAId === playerId || m.playerBId === playerId)
      .sort((a, b) => a.recordedAt - b.recordedAt); // Chronological for trend
    
    // Sum all match charges for this player
    const totalSpent = playerMatches.reduce((sum, m) => sum + (m.charges[playerId] || 0), 0);
    
    // Sum all payment allocations for this player
    let totalPaid = 0;
    let totalDiscounted = 0;
    
    filteredPayments.forEach(p => {
      const allocation = p.allocations.find(a => a.playerId === playerId);
      if (allocation) {
        totalPaid += (allocation.amount || 0);
        totalDiscounted += (allocation.discount || 0);
      }
    });
    
    const initialBalance = player?.initialBalance || 0;
    
    // Performance stats
    let wins = 0;
    let losses = 0;
    let ratedWins = 0;
    let ratedLosses = 0;
    const recentForm: ('W' | 'L' | 'N')[] = [];
    let bestStreak = 0;
    let tempStreak = 0;

    const performanceTrend: { date: string; rating: number; matchId: string }[] = [];
    const rivalryMap: Record<string, { name: string; played: number; wins: number; losses: number }> = {};
    const tableMap: Record<string, number> = {};

    playerMatches.forEach((m) => {
      const isWinner = m.winnerId === playerId;
      const hasResult = !!m.winnerId;
      const isRated = m.isRated !== false;
      const opponentId = m.playerAId === playerId ? m.playerBId : m.playerAId;
      const opponent = state.players.find(p => p.id === opponentId);

      // Preferred Table
      if (m.table?.name) {
        const tableName = m.table.name;
        tableMap[tableName] = (tableMap[tableName] || 0) + 1;
      }

      // Rivalries
      if (opponent) {
        if (!rivalryMap[opponentId]) rivalryMap[opponentId] = { name: opponent.name, played: 0, wins: 0, losses: 0 };
        rivalryMap[opponentId].played++;
      }
      
      if (hasResult) {
        if (isWinner) {
          wins++;
          if (isRated) ratedWins++;
          tempStreak++;
          if (opponent) rivalryMap[opponentId].wins++;
        } else {
          losses++;
          if (isRated) ratedLosses++;
          tempStreak = 0;
          if (opponent) rivalryMap[opponentId].losses++;
        }
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      }

      // Rating/Trend (Cumulative Win Rate - Rated Only for better profile trend)
      const gamesWithResult = wins + losses;
      performanceTrend.push({
        date: m.date,
        rating: gamesWithResult > 0 ? (wins / gamesWithResult) * 100 : 0,
        matchId: m.id
      });
    });

    // Form from recent matches (last 10) - RATED ONLY for competitive form
    const sortedDescMatches = [...playerMatches].sort((a, b) => b.recordedAt - a.recordedAt);
    sortedDescMatches.filter(m => m.isRated !== false).slice(0, 10).forEach(m => {
      const isWinner = m.winnerId === playerId;
      const hasResult = !!m.winnerId;
      recentForm.push(hasResult ? (isWinner ? 'W' : 'L') : 'N');
    });

    // Current streak
    let currentStreak = 0;
    for (const m of sortedDescMatches) {
      if (!m.winnerId) continue;
      if (m.winnerId === playerId) currentStreak++;
      else break;
    }

    // Daily/Monthly activity
    const dailyMap: Record<string, { games: number; wins: number }> = {};
    const monthlyMap: Record<string, { games: number; wins: number }> = {};

    playerMatches.forEach(m => {
      const dateStr = m.date; 
      const monthStr = dateStr.substring(0, 7); 

      if (!dailyMap[dateStr]) dailyMap[dateStr] = { games: 0, wins: 0 };
      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { games: 0, wins: 0 };

      dailyMap[dateStr].games++;
      monthlyMap[monthStr].games++;

      if (m.winnerId === playerId) {
        dailyMap[dateStr].wins++;
        monthlyMap[monthStr].wins++;
      }
    });

    const dailyStats = Object.entries(dailyMap).map(([date, stats]) => ({ date, ...stats })).sort((a, b) => b.date.localeCompare(a.date));
    const monthlyStats = Object.entries(monthlyMap).map(([month, stats]) => ({ month, ...stats })).sort((a, b) => b.month.localeCompare(a.month));

    const sortedRivalries = Object.entries(rivalryMap)
      .map(([id, stats]) => ({ id, name: stats.name, played: stats.played }))
      .sort((a, b) => b.played - a.played);

    const favoriteOpponent = sortedRivalries.length > 0 ? sortedRivalries[0] : undefined;
    const gStats = globalPlayerStats[playerId] || { rating: 1500, rd: 350, vol: 0.06, playStreak: 0, consistencyScore: 0, ratedMatchesLast30: 0, onFire: false, rating7DaysAgo: 1500, lastMatchDate: null, earnedTier: 0, totalRatedMatches: 0, peakRating: 1500 };

    return {
      gamesPlayed: playerMatches.length,
      wins,
      losses,
      ratedWins,
      ratedLosses,
      winRate: (ratedWins + ratedLosses) > 0 ? (ratedWins / (ratedWins + ratedLosses)) * 100 : 0,
      totalSpent,
      totalPaid,
      totalDiscounted,
      initialBalance,
      pending: totalSpent - totalPaid - totalDiscounted - initialBalance,
      recentForm,
      currentStreak,
      bestStreak,
      dailyStats,
      monthlyStats,
      avgSpendPerGame: playerMatches.length > 0 ? totalSpent / playerMatches.length : 0,
      favoriteOpponent,
      performanceTrend,
      rivalries: Object.entries(rivalryMap).map(([id, stats]) => ({ opponentId: id, opponentName: stats.name, ...stats })).sort((a, b) => b.played - a.played),
      // New metrics
      rating: gStats.rating,
      rd: gStats.rd,
      volatility: gStats.vol,
      playStreak: gStats.playStreak,
      consistencyScore: gStats.consistencyScore,
      ratedMatchesLast30: gStats.ratedMatchesLast30,
      onFire: gStats.onFire,
      // Climb-only tier system
      earnedTier: gStats.earnedTier,
      totalRatedMatches: gStats.totalRatedMatches,
      peakRating: gStats.peakRating
    };
  }, [state.players, state.matches, state.payments, globalPlayerStats]);

  const getPlayerDues = useCallback((playerId: string) => {
    return getPlayerStats(playerId).pending;
  }, [getPlayerStats]);

  const value = useMemo(() => ({
    ...state,
    isDarkMode: getEffectiveTheme(state.themeMode) === 'dark',
    globalPlayerStats,
    addPlayer,
    updatePlayer,
    addMatch,
    updateMatch,
    addPayment,
    updatePayment,
    addExpense,
    updateExpense,
    startOngoingMatch,
    clearOngoingMatch,
    setThemeMode,
    getPlayerDues,
    getPlayerStats,
    login,
    logout,
    refreshData: fetchData,
    isAuthenticated,
    isLoading
  }), [state, globalPlayerStats, addPlayer, updatePlayer, addMatch, updateMatch, addPayment, updatePayment, addExpense, updateExpense, startOngoingMatch, clearOngoingMatch, setThemeMode, getPlayerDues, getPlayerStats, isAuthenticated, isLoading, logout, fetchData]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
