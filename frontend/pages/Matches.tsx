import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api';
import { PayerOption, MatchPoints, UserRole, Player, Match } from '../types';
import { Trophy, Check, RefreshCw, Zap, Table as TableIcon, Edit3, X, Clock, User, AlertCircle, Search, ChevronDown, Calendar, Filter, Activity, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { generateUUID, getLocalTodayStr } from '../utils';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: Player[];
  placeholder: string;
  excludeId?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ label, value, onChange, options, placeholder, excludeId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPlayer = options.find(p => p.id === value);
  const filteredOptions = options.filter(p => 
    p.id !== excludeId && 
    (p.name.toLowerCase().includes(search.toLowerCase()) || 
     (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase())))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1 md:space-y-1.5 relative" ref={containerRef}>
      <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 dark:bg-slate-900 border-2 border-transparent p-2.5 md:p-4 rounded-xl md:rounded-2xl cursor-pointer flex justify-between items-center shadow-inner group hover:border-indigo-100 dark:hover:border-indigo-900 transition-all"
      >
        <span className={`font-bold truncate text-xs md:text-sm ${selectedPlayer ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
          {selectedPlayer ? `${selectedPlayer.name} ${selectedPlayer.nickname ? `(${selectedPlayer.nickname})` : ''}` : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 md:mt-2 w-full bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 md:p-3 border-b border-gray-50 dark:border-slate-800 flex items-center gap-1.5 md:gap-2">
            <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
            <input 
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full outline-none text-xs md:text-sm font-medium text-gray-800 dark:text-white bg-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 md:max-h-60 overflow-y-auto py-1 md:py-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex flex-col ${value === p.id ? 'bg-indigo-50 dark:bg-indigo-900/40 border-r-4 border-indigo-500' : ''}`}
                >
                  <span className="font-bold text-gray-900 dark:text-white">{p.name}</span>
                  {p.nickname && <span className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tight">@{p.nickname}</span>}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 md:py-8 text-center text-gray-400 italic text-xs md:text-sm font-medium">
                No players found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TableSelectProps {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: any[]; // Tables
  placeholder: string;
}

const TableSelect: React.FC<TableSelectProps> = ({ label, value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedTable = options.find(t => t.id === value);
  const activeOptions = options.filter(t => t.isActive || t.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1 md:space-y-1.5 relative" ref={containerRef}>
      <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 dark:bg-slate-900 border-2 border-transparent p-2.5 md:p-4 rounded-xl md:rounded-2xl cursor-pointer flex justify-between items-center shadow-inner group hover:border-indigo-100 dark:hover:border-indigo-900 transition-all font-black text-xs md:text-sm"
      >
        <div className="flex items-center gap-2 truncate">
           <div className={`w-1.5 h-1.5 rounded-full ${selectedTable ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
           <span className={`${selectedTable ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-slate-500'}`}>
             {selectedTable ? selectedTable.name : placeholder}
           </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 md:mt-2 w-full bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-48 md:max-h-60 overflow-y-auto py-1 md:py-2">
            {activeOptions.map(t => (
              <div 
                key={t.id}
                onClick={() => {
                  onChange(t.id);
                  setIsOpen(false);
                }}
                className={`px-3 md:px-4 py-2.5 md:py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-indigo-900/30 flex flex-col justify-center gap-0.5 border-l-4 transition-all ${value === t.id ? 'bg-indigo-50/50 dark:bg-indigo-900/40 border-indigo-500' : 'border-transparent'}`}
              >
                <span className={`text-xs md:text-sm font-black ${value === t.id ? 'text-indigo-600 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{t.name}</span>
                {t.description && <span className="text-[8px] md:text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{t.description}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const Matches: React.FC = () => {
  const { players, tables, gameConfigs, addMatch, updateMatch, matches, currentUser, getPlayerStats, getPlayerDues, ongoingMatch, startOngoingMatch, clearOngoingMatch, matchRates } = useApp();
  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.STAFF || currentUser.role === UserRole.SUPER_ADMIN;
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDirectRecord, setIsDirectRecord] = useState(false);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [points, setPoints] = useState<MatchPoints>(20);
  const [table, setTable] = useState(''); // Stores table ID now
  const [payerOption, setPayerOption] = useState<PayerOption>(PayerOption.LOSER);
  const [winnerId, setWinnerId] = useState('');
  const [isRated, setIsRated] = useState(true);
  const [matchDate, setMatchDate] = useState(getLocalTodayStr());
  const [success, setSuccess] = useState(false);

  // Set default table once loaded
  useEffect(() => {
    if (!table && tables.length > 0) {
      setTable(tables[0].id);
    }
  }, [tables, table]);

  // Auto-populate from ongoing match if it exists and we aren't editing something else
  useEffect(() => {
    if (ongoingMatch && !editingId && !playerAId && !playerBId) {
      setPlayerAId(ongoingMatch.playerAId);
      setPlayerBId(ongoingMatch.playerBId);
      setPoints(ongoingMatch.points);
      setTable(ongoingMatch.table);
    }
  }, [ongoingMatch, editingId]);

  // Check if the current selection matches a live match
  const isCurrentlyLive = useMemo(() => {
    return ongoingMatch && 
           ongoingMatch.playerAId === playerAId && 
           ongoingMatch.playerBId === playerBId;
  }, [ongoingMatch, playerAId, playerBId]);

  // History & Filter State
  const todayStr = getLocalTodayStr();
  const [historyDate, setHistoryDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_RESULT' | 'PENDING_PAYMENT'>('ALL');

  // Paginated log state
  const [logMatches, setLogMatches] = useState<Match[]>([]);
  const [logLimit, setLogLimit] = useState(50);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [isFetchingLog, setIsFetchingLog] = useState(false);

  const fetchLog = useCallback(async (date: string, page: number = 1, limit: number = 50) => {
    setIsFetchingLog(true);
    try {
      const resp = await api.get(`/matches?date=${date}&page=${page}&limit=${limit}`);
      if (resp && resp.matches) {
        setLogMatches(resp.matches);
        setPagination(resp.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch matches log', err);
    } finally {
      setIsFetchingLog(false);
    }
  }, []);

  useEffect(() => {
    fetchLog(historyDate, 1, logLimit);
  }, [historyDate, logLimit, fetchLog]);

  // Live match timer
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!ongoingMatch) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - ongoingMatch.startTime) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [ongoingMatch]);

  const formatElapsedTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  const matchTotal = useMemo(() => {
    const config = gameConfigs.find(c => c.type === (points === 20 ? '20_POINTS' : '10_POINTS'));
    return config?.price || 0;
  }, [points, gameConfigs]);

  /**
   * FIFO Logic: Determine if a specific match is "Paid" for a player.
   * A match is paid if (Lifetime Payments + Initial Credits + Lifetime Discounts) >= (Cumulative Charges up to this match).
   */
  const checkIsMatchPaid = useCallback((match: Match, playerId: string) => {
    const stats = getPlayerStats(playerId);

    // Get all matches where this player was charged, sorted chronologically
    const playerMatchHistory = matches
      .filter(m => ((m.charges as any)?.[playerId] || 0) > 0)
      .sort((a, b) => a.recordedAt - b.recordedAt);
    
    let cumulativeCharge = 0;
    for (const m of playerMatchHistory) {
      cumulativeCharge += (m.charges as any)?.[playerId] || 0;
      if (m.id === match.id) break;
    }
    
    // Resources include actual payments, initial credit balance, AND waivers/discounts
    const totalAvailableResources = (stats?.totalPaid || 0) + (stats?.initialBalance || 0) + (stats?.totalDiscounted || 0);
    return totalAvailableResources >= cumulativeCharge;
  }, [matches, getPlayerStats]);
  
  const chargePreview = useMemo(() => {
    if (!playerAId || !playerBId) return { a: 0, b: 0 };
    
    const half = matchTotal / 2;
    switch (payerOption) {
      case PayerOption.BOTH:
        return { a: half, b: half };
      case PayerOption.LOSER:
        if (!winnerId) return { a: 0, b: 0 };
        return winnerId === playerAId ? { a: 0, b: matchTotal } : { a: matchTotal, b: 0 };
      case PayerOption.PLAYER_A:
        return { a: matchTotal, b: 0 };
      case PayerOption.PLAYER_B:
        return { a: 0, b: matchTotal };
      default:
        return { a: 0, b: 0 };
    }
  }, [playerAId, playerBId, matchTotal, payerOption, winnerId]);

  const filteredMatches = useMemo(() => {
    return logMatches.filter(m => {
      // Date filter is already handled by server-side fetch, but we keep it for consistency if needed
      if (m.date !== historyDate) return false;
      // Search filter (player names) - Support comma separated multiple names
      const searchTerms = searchQuery.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== '');
      const pA = players.find(p => p.id === m.playerAId);
      const pB = players.find(p => p.id === m.playerBId);
      
      const searchMatch = searchTerms.length === 0 || searchTerms.every(term => {
        const matchesA = pA?.name.toLowerCase().includes(term) || pA?.nickname?.toLowerCase().includes(term);
        const matchesB = pB?.name.toLowerCase().includes(term) || pB?.nickname?.toLowerCase().includes(term);
        // At least one of the players in this match must match the current term
        return matchesA || matchesB;
      });
      
      if (!searchMatch) return false;

      // Status Filter
      if (statusFilter === 'PENDING_RESULT') {
        const isPendingResult = !m.winnerId && m.payerOption === PayerOption.LOSER;
        if (!isPendingResult) return false;
      }

      if (statusFilter === 'PENDING_PAYMENT') {
        const isPendingResult = !m.winnerId && m.payerOption === PayerOption.LOSER;

        // A match is "Pending Payment" if:
        // 1. It has no result yet (for loser pays format)
        // 2. Any player charged in this match hasn't cleared their charges according to FIFO
        const matchHasUnpaidCharges = [m.playerAId, m.playerBId].some(id => {
          const charge = (m.charges as any)?.[id] || 0;
          if (charge === 0) return false;
          return !checkIsMatchPaid(m, id);
        });
        if (!isPendingResult && !matchHasUnpaidCharges) return false;
      }

      return true;
    });
  }, [logMatches, historyDate, searchQuery, statusFilter, players, checkIsMatchPaid]);

  const handleGoLive = async () => {
    if (!playerAId || !playerBId) return;

    const selectedTable = tables.find(t => t.id === table);
    if (selectedTable && !selectedTable.isActive) {
      alert("This table is currently inactive. Please select an active table.");
      return;
    }

    try {
      await startOngoingMatch({
        id: generateUUID(),
        playerAId,
        playerBId,
        points,
        table,
        startTime: Date.now()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to start live match. Another match might be in progress.');
    }
  };

  useEffect(() => {
    if (matchDate !== todayStr && !isDirectRecord) {
      setIsDirectRecord(true);
    }
  }, [matchDate, todayStr, isDirectRecord]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!playerAId || !playerBId) return;

     // Handle Live Logic first: If it's a new match and we are in default (Live) mode
    if (!editingId && !isDirectRecord && !isCurrentlyLive) {
      handleGoLive();
      return;
    }

    // Otherwise, we are recording/finishing
    const charges: { [id: string]: number } = {};
    if (chargePreview.a > 0) charges[playerAId] = chargePreview.a;
    if (chargePreview.b > 0) charges[playerBId] = chargePreview.b;

    if (editingId) {
      await updateMatch(editingId, {
        date: matchDate,
        points,
        playerAId,
        playerBId,
        winnerId: winnerId || undefined,
        tableId: table,
        payerOption,
        totalValue: matchTotal,
        charges,
        isRated
      });
      setEditingId(null);
    } else {
      // Find proper gameTypeId from gameConfigs if it matches the point format
      const gameType = gameConfigs.find(c => c.type === (points === 20 ? '20_POINTS' : '10_POINTS'));
      
      await addMatch({
        date: matchDate,
        recordedAt: Date.now(),
        recordedBy: {
          id: currentUser.id || '', // Include ID if available
          role: currentUser.role,
          name: currentUser.name,
          email: '' // Email not needed for recordedMatch in Frontend
        },
        points,
        playerAId,
        playerBId,
        winnerId: winnerId || undefined,
        tableId: table, // tableId is expected by type
        typeId: gameType?.id, // Use actual ID from config
        payerOption,
        totalValue: matchTotal,
        charges,
        isRated
      });
      // Clear ongoing match if it matches the recorded one
      if (isCurrentlyLive) {
        clearOngoingMatch();
      }
    }

    // Refresh the log
    fetchLog(historyDate, pagination.page, logLimit);

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setWinnerId('');
      setIsDirectRecord(false); // Reset to live default
      if (editingId) {
        setPlayerAId('');
        setPlayerBId('');
      }
    }, 1200);
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setPlayerAId(m.playerAId);
    setPlayerBId(m.playerBId);
    setPoints(m.points);
    setTable(m.tableId || '');
    setPayerOption(m.payerOption);
    setWinnerId(m.winnerId || '');
    setIsRated(m.isRated ?? true);
    setMatchDate(m.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPlayerAId('');
    setPlayerBId('');
    setWinnerId('');
    setPayerOption(PayerOption.LOSER);
  };

  const handleClearPlayers = () => {
    setEditingId(null);
    setPlayerAId('');
    setPlayerBId('');
    setWinnerId('');
    setIsDirectRecord(false); // Reset to live default
    setSuccess(false);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-xl mx-auto pb-8">
      {ongoingMatch && (
        <div 
          onClick={() => {
            setPlayerAId(ongoingMatch.playerAId);
            setPlayerBId(ongoingMatch.playerBId);
            setPoints(ongoingMatch.points);
            setTable(ongoingMatch.table);
          }}
          className="sticky top-[60px] md:top-[76px] z-30 bg-gradient-to-r from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 p-3 rounded-2xl shadow-lg shadow-rose-200 dark:shadow-rose-900/20 animate-pulse border border-rose-400 dark:border-rose-500 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow mb-8 md:-mx-2"
        >
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="text-white font-black text-xs uppercase tracking-tight shrink-0">LIVE</span>
              </div>
              <span className="text-white font-bold text-xs truncate">
                {players.find(p => p.id === ongoingMatch.playerAId)?.name} vs {players.find(p => p.id === ongoingMatch.playerBId)?.name}
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-lg text-[10px] text-white font-black shrink-0">
                 <Activity className="w-2.5 h-2.5" />
                 {tables.find(t => t.id === ongoingMatch.table)?.name}
              </div>
              <span className="text-white/70 font-bold text-xs shrink-0">({formatElapsedTime(elapsedTime)})</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`${editingId ? 'bg-amber-500' : 'bg-indigo-600'} p-1.5 md:p-2 rounded-lg md:rounded-xl transition-colors`}>
              {editingId ? <Edit3 className="text-white w-5 h-5 md:w-6 md:h-6" /> : <Trophy className="text-white w-5 h-5 md:w-6 md:h-6" />}
            </div>
            <h2 className="text-xl md:text-2xl font-bold dark:text-white transition-all">{editingId ? 'Update Match' : 'Game Entry'}</h2>
          </div>
          {(playerAId || playerBId) && (
            <button 
              onClick={editingId ? handleCancelEdit : handleClearPlayers}
              className={`text-[9px] md:text-xs font-bold uppercase flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors ${
                editingId ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400'
              }`}
            >
              {editingId ? <X className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
              {editingId ? 'Cancel' : 'Clear'}
            </button>
          )}
        </div>

      <form onSubmit={handleSubmit} className={`space-y-4 md:space-y-5 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border shadow-xl relative overflow-hidden transition-all duration-300 ${editingId ? 'border-amber-200 dark:border-amber-800 ring-2 ring-amber-100 dark:ring-amber-900/20' : 'border-gray-100 dark:border-slate-800'}`}>
        {success && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-emerald-500 p-3 md:p-4 rounded-full mb-2 md:mb-3 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
              <Check className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <p className="text-emerald-800 dark:text-emerald-400 font-black text-lg md:text-xl">{editingId ? 'Update Saved!' :isCurrentlyLive || isDirectRecord ? 'Match Logged!': 'Live Match Started'}</p>
            <p className="text-emerald-600 dark:text-emerald-500 font-medium text-xs md:text-sm">Action successful.</p>
          </div>
        )}

        <div className="space-y-1.5 md:space-y-2">
          <div className="flex justify-between items-center pr-1">
            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Point Format</label>
            {isCurrentlyLive && (
               <div className="text-[8px] md:text-[10px] font-black text-rose-500 flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-0.5 md:py-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800">
                 <span className="relative flex h-1.5 md:h-2 w-1.5 md:w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-1.5 md:h-2 w-1.5 md:w-2 bg-rose-500"></span>
                 </span>
                 LIVE
               </div>
            )}
          </div>
          <div className="flex gap-2 md:gap-3">
            {[20, 10].map((pts) => (
              <button
                key={pts}
                type="button"
                onClick={() => setPoints(pts as MatchPoints)}
                className={`flex-1 py-3 md:py-4 px-2 rounded-xl md:rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-0.5 md:gap-1 ${
                  points === pts 
                    ? (editingId ? 'bg-amber-500 border-amber-500 text-white' : 'bg-indigo-600 border-indigo-600 text-white') + ' shadow-lg scale-[1.02] md:scale-105' 
                    : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-base md:text-lg">{pts} Points</span>
                <span className={`text-[8px] md:text-[10px] opacity-80 ${points === pts ? 'text-white/70' : 'text-gray-400 dark:text-slate-500'}`}>
                  Value: ₹{matchRates[`${pts}_POINTS`] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <TableSelect 
              label="Table"
              value={table}
              onChange={setTable}
              options={tables}
              placeholder="Select..."
            />
          </div>

          <div className="space-y-1 md:space-y-1.5 col-span-1">
            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Match Date</label>
            <div className="bg-gray-50 dark:bg-slate-900 rounded-xl md:rounded-2xl border-2 border-transparent shadow-inner p-1 md:p-1.5 h-[42px] md:h-[52px] flex items-center">
              <input 
                type="date" 
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-transparent px-2 text-[10px] md:text-xs font-bold text-gray-800 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="space-y-1 md:space-y-1.5 col-span-1">
            <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Ranked</label>
            <div className="flex items-center justify-between px-3 bg-gray-50 dark:bg-slate-900 rounded-xl md:rounded-2xl border-2 border-transparent shadow-inner h-[42px] md:h-[52px]">
              <Zap className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isRated ? 'text-amber-500' : 'text-gray-400'}`} />
              <button 
                type="button"
                onClick={() => setIsRated(!isRated)}
                className={`w-7 h-3.5 md:w-8 md:h-4 rounded-full transition-colors relative ${isRated ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${isRated ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <SearchableSelect 
            label="Player A"
            value={playerAId}
            onChange={setPlayerAId}
            options={players}
            placeholder="Select..."
            excludeId={playerBId}
          />
          <SearchableSelect 
            label="Player B"
            value={playerBId}
            onChange={setPlayerBId}
            options={players}
            placeholder="Select..."
            excludeId={playerAId}
          />
        </div>

        {(playerAId && playerBId && (isDirectRecord || isCurrentlyLive || editingId)) && (
          <div className="space-y-1.5 md:space-y-2 py-1 md:py-2 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center pr-1">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Winner (Optional)</label>
              {winnerId && (
                <button 
                  type="button" 
                  onClick={() => setWinnerId('')}
                  className="text-[8px] md:text-[9px] font-black text-gray-400 hover:text-rose-500 uppercase transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2 md:gap-3">
              {[playerAId, playerBId].map(id => {
                const name = players.find(p => p.id === id)?.name;
                const isSelected = winnerId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWinnerId(id)}
                    className={`flex-1 py-3 md:py-4 px-3 md:px-4 rounded-xl md:rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-1.5 md:gap-2 min-w-0 ${
                      isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    {isSelected && <Zap className="w-3 h-3 md:w-4 md:h-4 fill-current shrink-0" />}
                    <span className="truncate text-xs md:text-sm">{name}</span>
                  </button>
                );
              })}
            </div>
            {!winnerId && payerOption === PayerOption.LOSER && (
              <p className="text-[9px] md:text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5 md:w-3 md:h-3" /> Result pending: ₹0 dues.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5 md:space-y-2">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Billing</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: PayerOption.LOSER, label: `Loser Pays` },
              { id: PayerOption.BOTH, label: `Split (50/50)` },
              { id: PayerOption.PLAYER_A, label: `A pays ₹${matchTotal}` },
              { id: PayerOption.PLAYER_B, label: `B pays ₹${matchTotal}` },
            ].map(opt => {
              const isSelected = payerOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPayerOption(opt.id)}
                  className={`py-2.5 md:py-3 px-2 rounded-xl md:rounded-2xl border-2 text-[10px] md:text-[11px] font-black transition-all ${
                    isSelected ? (editingId ? 'bg-amber-600 border-amber-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white') + ' shadow-md' : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {playerAId && playerBId && (
          <div className="bg-gray-900 dark:bg-slate-800 p-3.5 md:p-5 rounded-2xl md:rounded-3xl flex items-center justify-between text-white shadow-2xl transition-all">
            <div className="space-y-0.5">
              <p className="text-[8px] md:text-[9px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-[0.2em]">Add to Dues</p>
              <div className="flex gap-3 md:gap-4">
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-500"></div>
                  <span className="text-xs md:text-sm font-bold opacity-80">A: ₹{chargePreview.a}</span>
                </div>
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-orange-500"></div>
                  <span className="text-xs md:text-sm font-bold opacity-80">B: ₹{chargePreview.b}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] md:text-[9px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-[0.2em]">Game Value</p>
              <p className="text-xl md:text-2xl font-black italic">₹{matchTotal}</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-3 md:gap-4 pt-1 md:pt-2">
          <button 
            type="submit"
            disabled={!playerAId || !playerBId || (!!ongoingMatch && !isCurrentlyLive && !isDirectRecord && !editingId)}
            className={`w-full py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-2xl transition-all flex items-center justify-center gap-2 md:gap-3 ${
              (!playerAId || !playerBId || (!!ongoingMatch && !isCurrentlyLive && !isDirectRecord && !editingId))
                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed' 
                : editingId 
                  ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-amber-100 dark:shadow-none'
                  : isCurrentlyLive || isDirectRecord
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-200 dark:shadow-none'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200 dark:shadow-none'
            }`}
          >
            {editingId ? <Edit3 className="w-5 h-5 md:w-6 md:h-6" /> : isCurrentlyLive || isDirectRecord ? <Check className="w-5 h-5 md:w-6 md:h-6" /> : <Play className="w-5 h-5 md:w-6 md:h-6" />}
            {editingId ? 'Save Changes' : isCurrentlyLive ? 'Finish & Record' : isDirectRecord ? 'Log Past Match' : (!!ongoingMatch && !isCurrentlyLive) ? 'Table Occupied' : 'Start Match'}
          </button>

          {!editingId && !isCurrentlyLive && playerAId && playerBId && (
            <button 
              type="button"
              onClick={() => setIsDirectRecord(!isDirectRecord)}
              className="text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {isDirectRecord ? '← Switch to Live Entry' : 'Log result directly →'}
            </button>
          )}
        </div>
      </form>

      {/* History & Filtering Section */}
      <section className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 md:space-y-5 transition-all">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-base md:text-lg text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
              Session Log
            </h3>
            <div className="bg-gray-50 dark:bg-slate-800 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-1.5 md:gap-2">
               <input 
                 type="date" 
                 value={historyDate}
                 title="Select date"
                 aria-label="Select date for session log"
                 onChange={(e) => setHistoryDate(e.target.value)}
                 className="bg-transparent text-[10px] md:text-xs font-bold outline-none text-indigo-600 dark:text-indigo-400"
               />
            </div>
          </div>

          <div className="relative">
                <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search name(s) separated by comma..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border-none pl-9 md:pl-12 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-slate-700 focus:ring-indigo-300 dark:focus:ring-indigo-800 transition-all text-gray-800 dark:text-white"
                />
                </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PENDING_RESULT', label: 'Result Missing' },
                { id: 'PENDING_PAYMENT', label: 'Unpaid' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id as any)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all border ${
                    statusFilter === filter.id 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                    : 'bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 md:gap-3 ml-auto">
               <div className="flex items-center gap-1.5">
                 <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-tighter">Show</span>
                 <select 
                   value={logLimit}
                   onChange={(e) => setLogLimit(Number(e.target.value))}
                   className="bg-gray-50 dark:bg-slate-800 border-none text-[9px] md:text-[10px] font-black text-indigo-600 dark:text-indigo-400 rounded-lg px-1.5 md:px-2 py-1 outline-none ring-1 ring-gray-100 dark:ring-slate-700"
                 >
                   {[10, 20, 50, 100].map(v => (
                     <option key={v} value={v}>{v}</option>
                   ))}
                 </select>
               </div>
               <div className="h-4 w-px bg-gray-100 dark:bg-slate-800"></div>
               <div className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                 Total: <span className="text-indigo-600 dark:text-indigo-400">{pagination.total}</span>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {isFetchingLog ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin opacity-30" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Log...</p>
            </div>
          ) : filteredMatches.length > 0 ? (
            filteredMatches.map(m => {
              const pA = players.find(p => p.id === m.playerAId);
              const pB = players.find(p => p.id === m.playerBId);
              const isPendingResult = !m.winnerId && m.payerOption === PayerOption.LOSER;
              // NEW FIFO LOGIC: Determine if any involved player has not cleared their charge for THIS match
              const playersWithUnpaidBalance = [m.playerAId, m.playerBId].filter(id => {
                const playerCharges = (m.charges as any) || {};
                if ((playerCharges[id] || 0) === 0) return false;
                return !checkIsMatchPaid(m, id);
              });

              // Descriptive 'Who Pays' logic for Session Log
              const getPayerStatusLabel = () => {
                switch (m.payerOption) {
                  case PayerOption.BOTH:
                    return 'Split';
                  case PayerOption.PLAYER_A:
                    return `${pA?.name || 'A'} Pays`;
                  case PayerOption.PLAYER_B:
                    return `${pB?.name || 'B'} Pays`;
                  case PayerOption.LOSER:
                    if (!m.winnerId) return 'Loser (Pending)';
                    const loserId = m.winnerId === m.playerAId ? m.playerBId : m.playerAId;
                    const loserName = players.find(p => p.id === loserId)?.name || 'Loser';
                    return `${loserName} Pays (Loser)`;
                  default:
                    // Fix: Exhaustive check default should cast to string to avoid 'never' type errors
                    return (m.payerOption as string).replace('_', ' ');
                }
              };
              
              return (
                <div key={m.id} className={`flex flex-col group p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all ${editingId === m.id ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5 md:gap-3 min-w-0">
                      <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-lg md:rounded-xl flex items-center justify-center font-black text-[10px] md:text-xs ${m.points === 20 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                        {m.points}p
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white text-xs md:text-sm">
                          {pA?.name} vs {pB?.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 md:gap-1.5 mt-0.5">
                          {m.winnerId ? (
                            <span className="text-[7px] md:text-[8px] font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1 md:px-1.5 py-0.5 rounded-md uppercase">
                              Winner: {players.find(p => p.id === m.winnerId)?.name}
                            </span>
                          ) : isPendingResult ? (
                            <span className="text-[7px] md:text-[8px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-1 md:px-1.5 py-0.5 rounded-md uppercase flex items-center gap-0.5 md:gap-1">
                              <AlertCircle className="w-2 h-2" /> Result Pending
                            </span>
                          ) : (
                            <span className="text-[7px] md:text-[8px] font-black bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 px-1 md:px-1.5 py-0.5 rounded-md uppercase">
                              ENDED
                            </span>
                          )}
                          <span className="text-[7px] md:text-[8px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-1 md:px-1.5 py-0.5 rounded-md uppercase truncate">
                            {getPayerStatusLabel()}
                          </span>
                          <span className="text-[7px] md:text-[8px] font-black bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 px-1 md:px-1.5 py-0.5 rounded-md uppercase">
                            {m.table?.name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0 ml-2">
                      <div className="text-right">
                        <div className="text-sm md:text-base font-black text-gray-900 dark:text-white tracking-tight">₹{m.totalValue}</div>
                        {isPendingResult || playersWithUnpaidBalance.length > 0 ? (
                           <div className="text-[7px] md:text-[8px] font-black text-rose-500 dark:text-rose-400 uppercase flex items-center justify-end gap-0.5">
                             Unpaid
                           </div>
                        ) : (
                          <div className="text-[7px] md:text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase flex items-center justify-end gap-0.5">
                             <Check className="w-2 h-2" /> Cleared
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <button 
                          onClick={() => handleEdit(m)}
                          title="Edit match"
                          className="p-1.5 md:p-2 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg md:rounded-xl transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 md:pt-2 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                     <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-bold text-gray-400 dark:text-slate-500">
                          <Clock className="w-2 md:w-2.5 h-2 md:h-2.5" />
                          {formatTime(m.recordedAt)}
                        </div>
                        <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-bold text-gray-400 dark:text-slate-500">
                          <User className="w-2 md:w-2.5 h-2 md:h-2.5" />
                          {m.recordedBy?.name || 'System'}
                        </div>
                     </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 md:py-10 text-center text-gray-300 dark:text-slate-700 font-bold italic border-2 border-dashed border-gray-50 dark:border-slate-800 rounded-2xl md:rounded-3xl">
              No games found...
            </div>
          )}

          {!isFetchingLog && pagination.totalPages > 1 && (
            <div className="pt-3 md:pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <button 
                type="button"
                onClick={() => fetchLog(historyDate, pagination.page - 1, logLimit)}
                disabled={pagination.page === 1}
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-300 dark:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase text-gray-500 dark:text-slate-400 transition-all hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" /> Prev
              </button>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button 
                type="button"
                onClick={() => fetchLog(historyDate, pagination.page + 1, logLimit)}
                disabled={pagination.page === pagination.totalPages}
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-300 dark:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase text-gray-500 dark:text-slate-400 transition-all hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Next <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
};
