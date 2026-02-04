import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Match, Payment, Expense, AppState, UserRole, PayerOption, PaymentMode, OngoingMatch, ThemeMode, PlayerStats } from '../types';
import { generateUUID } from '../utils';

interface AppContextType extends AppState {
  addPlayer: (player: Omit<Player, 'id' | 'createdAt'>) => void;
  updatePlayer: (id: string, player: Partial<Player>) => void;
  addMatch: (match: Omit<Match, 'id'>) => void;
  updateMatch: (id: string, match: Partial<Match>) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  startOngoingMatch: (match: OngoingMatch) => void;
  clearOngoingMatch: () => void;
  switchRole: (role: UserRole) => void;
  setThemeMode: (mode: ThemeMode) => void;
  isDarkMode: boolean;
  getPlayerDues: (playerId: string) => number;
  getPlayerStats: (playerId: string, dateRange?: { start: string; end: string }) => PlayerStats;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'smashtrack_data_v1';
const THEME_STORAGE_KEY = 'smashtrack_theme_v1';

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

const INITIAL_PLAYERS: Player[] = [
  { id: 'p1', name: 'Fardeen Malik', initialBalance: 0, createdAt: Date.now() },
  { id: 'p2', name: 'Hamza Jeelani', initialBalance: 0, createdAt: Date.now() },
  { id: 'p3', name: 'Amaan Tak', initialBalance: 0, createdAt: Date.now() },
  { id: 'p4', name: 'Saqib Shapoo', nickname: 'Lenchi', initialBalance: 0, createdAt: Date.now() },
  { id: 'p5', name: 'Rajid', nickname: 'Grenade', initialBalance: 0, createdAt: Date.now() },
  { id: 'p6', name: 'Tahir Shapoo', initialBalance: 0, createdAt: Date.now() },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate players if they don't have initialBalance
      parsed.players = parsed.players.map((p: any) => ({
        ...p,
        initialBalance: p.initialBalance ?? 0
      }));
      // Ensure ongoingMatch exists in parsed state
      if (parsed.ongoingMatch === undefined) parsed.ongoingMatch = null;
      // Migrate old isDarkMode to themeMode
      if (parsed.isDarkMode !== undefined && parsed.themeMode === undefined) {
        parsed.themeMode = parsed.isDarkMode ? 'dark' : 'light';
        delete parsed.isDarkMode;
      }
      return parsed;
    }
    return {
      players: INITIAL_PLAYERS,
      matches: [],
      payments: [],
      expenses: [],
      ongoingMatch: null,
      currentUser: { role: UserRole.ADMIN, name: 'Partner 1' },
      themeMode: (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'auto'
    };
  });

  // Initialize themeMode from storage on mount if not already loaded
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (savedTheme && state.themeMode !== savedTheme) {
      setState(prev => ({ ...prev, themeMode: savedTheme }));
    }
  }, []);

  // Update DOM dark mode class and listen for system theme changes
  useEffect(() => {
    const effectiveTheme = getEffectiveTheme(state.themeMode);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(THEME_STORAGE_KEY, state.themeMode);
    
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for system theme changes when in auto mode
    if (state.themeMode === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const newTheme = getEffectiveTheme(state.themeMode);
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state]);

  const addPlayer = useCallback((playerData: Omit<Player, 'id' | 'createdAt'>) => {
    const newPlayer: Player = {
      ...playerData,
      id: generateUUID(),
      createdAt: Date.now()
    };
    setState(prev => ({ ...prev, players: [newPlayer, ...prev.players] }));
  }, []);

  const updatePlayer = useCallback((id: string, playerData: Partial<Player>) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, ...playerData } : p)
    }));
  }, []);

  const addMatch = useCallback((matchData: Omit<Match, 'id'>) => {
    const newMatch: Match = {
      ...matchData,
      id: generateUUID()
    };
    setState(prev => ({ ...prev, matches: [newMatch, ...prev.matches] }));
  }, []);

  const updateMatch = useCallback((id: string, matchData: Partial<Match>) => {
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === id ? { ...m, ...matchData } : m)
    }));
  }, []);

  const addPayment = useCallback((paymentData: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: generateUUID()
    };
    setState(prev => ({ ...prev, payments: [newPayment, ...prev.payments] }));
  }, []);

  const updatePayment = useCallback((id: string, paymentData: Partial<Payment>) => {
    setState(prev => ({
      ...prev,
      payments: prev.payments.map(p => p.id === id ? { ...p, ...paymentData } : p)
    }));
  }, []);

  const addExpense = useCallback((expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: generateUUID()
    };
    setState(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses] }));
  }, []);

  const startOngoingMatch = useCallback((match: OngoingMatch) => {
    setState(prev => ({ ...prev, ongoingMatch: match }));
  }, []);

  const clearOngoingMatch = useCallback(() => {
    setState(prev => ({ ...prev, ongoingMatch: null }));
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    setState(prev => ({ ...prev, currentUser: { ...prev.currentUser, role } }));
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
    const recentForm: ('W' | 'L' | 'N')[] = [];
    let bestStreak = 0;
    let tempStreak = 0;

    const performanceTrend: { date: string; rating: number; matchId: string }[] = [];
    const rivalryMap: Record<string, { name: string; played: number; wins: number; losses: number }> = {};
    const tableMap: Record<string, number> = {};

    playerMatches.forEach((m) => {
      const isWinner = m.winnerId === playerId;
      const hasResult = !!m.winnerId;
      const opponentId = m.playerAId === playerId ? m.playerBId : m.playerAId;
      const opponent = state.players.find(p => p.id === opponentId);

      // Preferred Table
      if (m.table) {
        tableMap[m.table] = (tableMap[m.table] || 0) + 1;
      }

      // Rivalries
      if (opponent) {
        if (!rivalryMap[opponentId]) rivalryMap[opponentId] = { name: opponent.name, played: 0, wins: 0, losses: 0 };
        rivalryMap[opponentId].played++;
      }
      
      if (hasResult) {
        if (isWinner) {
          wins++;
          tempStreak++;
          if (opponent) rivalryMap[opponentId].wins++;
        } else {
          losses++;
          tempStreak = 0;
          if (opponent) rivalryMap[opponentId].losses++;
        }
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      }

      // Rating/Trend (Cumulative Win Rate)
      const totalGamesWithResult = wins + losses;
      performanceTrend.push({
        date: m.date,
        rating: totalGamesWithResult > 0 ? (wins / totalGamesWithResult) * 100 : 0,
        matchId: m.id
      });
    });

    // Form from recent matches (last 10)
    const sortedDescMatches = [...playerMatches].sort((a, b) => b.recordedAt - a.recordedAt);
    sortedDescMatches.slice(0, 10).forEach(m => {
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

    // Favorite Opponent
    let favoriteOpponent = undefined;
    const sortedRivalries = Object.entries(rivalryMap)
      .map(([id, stats]) => ({ id, name: stats.name, played: stats.played }))
      .sort((a, b) => b.played - a.played);
    
    if (sortedRivalries.length > 0) {
      favoriteOpponent = sortedRivalries[0];
    }

    return {
      gamesPlayed: playerMatches.length,
      wins,
      losses,
      winRate: (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0,
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
      rivalries: Object.entries(rivalryMap).map(([id, stats]) => ({ opponentId: id, opponentName: stats.name, ...stats })).sort((a, b) => b.played - a.played)
    };
  }, [state.players, state.matches, state.payments]);

  const getPlayerDues = useCallback((playerId: string) => {
    return getPlayerStats(playerId).pending;
  }, [getPlayerStats]);

  const value = useMemo(() => ({
    ...state,
    isDarkMode: getEffectiveTheme(state.themeMode) === 'dark',
    addPlayer,
    updatePlayer,
    addMatch,
    updateMatch,
    addPayment,
    updatePayment,
    addExpense,
    startOngoingMatch,
    clearOngoingMatch,
    switchRole,
    setThemeMode,
    getPlayerDues,
    getPlayerStats
  }), [state, addPlayer, updatePlayer, addMatch, updateMatch, addPayment, updatePayment, addExpense, startOngoingMatch, clearOngoingMatch, switchRole, setThemeMode, getPlayerDues, getPlayerStats]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
