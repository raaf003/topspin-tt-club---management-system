export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export enum PaymentMode {
  CASH = 'CASH',
  ONLINE = 'ONLINE'
}

export enum ExpenseCategory {
  RENT = 'RENT',
  BALLS = 'BALLS',
  MAINTENANCE = 'MAINTENANCE',
  LIGHTS = 'LIGHTS',
  OTHER = 'OTHER'
}

export enum PayerOption {
  BOTH = 'BOTH PAY (SPLIT)',
  LOSER = 'LOSER PAYS',
  PLAYER_A = 'PLAYER_A',
  PLAYER_B = 'PLAYER_B'
}

export type MatchPoints = 10 | 20;

export interface Player {
  id: string;
  name: string;
  phone?: string;
  nickname?: string;
  initialBalance: number; // Positive = Credit (paid extra), Negative = Initial Dues (manual balance)
  createdAt: number;
  // Glicko-2 fields
  rating?: number;
  ratingDeviation?: number;
  volatility?: number;
}

export interface OngoingMatch {
  id: string;
  playerAId: string;
  playerBId: string;
  points: MatchPoints;
  table: string;
  startTime: number;
}

export interface Match {
  id: string;
  date: string;
  recordedAt: number;
  recordedBy: {
    role: UserRole;
    name: string;
  };
  table?: string;
  points: MatchPoints;
  playerAId: string;
  playerBId: string;
  winnerId?: string;
  payerOption: PayerOption;
  totalValue: number;
  charges: { [playerId: string]: number };
  isRated?: boolean;
  weight?: number;
}

export interface PaymentAllocation {
  playerId: string;
  amount: number;
  discount?: number;
}

export interface Payment {
  id: string;
  primaryPayerId: string;
  totalAmount: number;
  allocations: PaymentAllocation[];
  mode: PaymentMode;
  date: string;
  notes?: string;
  recordedAt: number;
  recordedBy: {
    role: UserRole;
    name: string;
  };
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  mode: PaymentMode;
  notes?: string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalSpent: number;
  totalPaid: number;
  totalDiscounted: number;
  pending: number;
  initialBalance: number;
  dailyStats: {
    date: string;
    games: number;
    wins: number;
  }[];
  monthlyStats: {
    month: string;
    games: number;
    wins: number;
  }[];
  recentForm: ('W' | 'L' | 'N')[];
  currentStreak: number;
  bestStreak: number;
  avgSpendPerGame: number;
  favoriteOpponent?: {
    id: string;
    name: string;
    played: number;
  };
  performanceTrend: {
    date: string;
    rating: number; // Cumulative win rate or similar performance metric
    matchId: string;
  }[];
  rivalries: {
    opponentId: string;
    opponentName: string;
    played: number;
    wins: number;
    losses: number;
  }[];
  // New metrics
  consistencyScore: number;
  playStreak: number;
  onFire: boolean;
  rating: number;
  rd: number;
  volatility: number;
  ratedMatchesLast30: number;
  // Climb-only tier system
  totalRatedMatches: number;
  earnedTier: number;
  peakRating: number;
}

export interface AppState {
  players: Player[];
  matches: Match[];
  payments: Payment[];
  expenses: Expense[];
  ongoingMatch: OngoingMatch | null;
  currentUser: {
    role: UserRole;
    name: string;
  };
  themeMode: ThemeMode;
}
