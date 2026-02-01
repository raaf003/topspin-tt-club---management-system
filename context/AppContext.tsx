
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Player, Match, Payment, Expense, AppState, UserRole, PayerOption, PaymentMode, OngoingMatch } from '../types';
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
  getPlayerDues: (playerId: string) => number;
  getPlayerStats: (playerId: string) => { games: number; totalSpent: number; totalPaid: number; totalDiscounted: number; pending: number; initialBalance: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'smashtrack_data_v1';

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
      return parsed;
    }
    return {
      players: INITIAL_PLAYERS,
      matches: [],
      payments: [],
      expenses: [],
      ongoingMatch: null,
      currentUser: { role: UserRole.ADMIN, name: 'Partner 1' }
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  const getPlayerStats = useCallback((playerId: string) => {
    const player = state.players.find(p => p.id === playerId);
    const playerMatches = state.matches.filter(m => m.playerAId === playerId || m.playerBId === playerId);
    
    // Sum all match charges for this player
    const totalSpent = state.matches.reduce((sum, m) => sum + (m.charges[playerId] || 0), 0);
    
    // Sum all payment allocations for this player
    let totalPaid = 0;
    let totalDiscounted = 0;
    
    state.payments.forEach(p => {
      const allocation = p.allocations.find(a => a.playerId === playerId);
      if (allocation) {
        totalPaid += (allocation.amount || 0);
        totalDiscounted += (allocation.discount || 0);
      }
    });
    
    const initialBalance = player?.initialBalance || 0;
    
    // pending = (what they should have paid) - (what they actually paid) - (what was discounted) - (starting credit)
    return {
      games: playerMatches.length,
      totalSpent,
      totalPaid,
      totalDiscounted,
      initialBalance,
      pending: totalSpent - totalPaid - totalDiscounted - initialBalance
    };
  }, [state.players, state.matches, state.payments]);

  const getPlayerDues = useCallback((playerId: string) => {
    return getPlayerStats(playerId).pending;
  }, [getPlayerStats]);

  const value = useMemo(() => ({
    ...state,
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
    getPlayerDues,
    getPlayerStats
  }), [state, addPlayer, updatePlayer, addMatch, updateMatch, addPayment, updatePayment, addExpense, startOngoingMatch, clearOngoingMatch, switchRole, getPlayerDues, getPlayerStats]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
