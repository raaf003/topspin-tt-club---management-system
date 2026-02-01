
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
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  mode: PaymentMode;
  notes?: string;
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
}
