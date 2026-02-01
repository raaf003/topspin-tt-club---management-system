
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PayerOption, MatchPoints, UserRole, Player, Match } from '../types';
import { Trophy, Check, RefreshCw, Zap, Table as TableIcon, Edit3, X, Clock, User, AlertCircle, Search, ChevronDown, Calendar, Filter, Activity, Play } from 'lucide-react';
import { generateUUID } from '../utils';

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
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-50 border-2 border-transparent p-4 rounded-2xl cursor-pointer flex justify-between items-center shadow-inner group hover:border-indigo-100 transition-all"
      >
        <span className={`font-bold truncate ${selectedPlayer ? 'text-gray-800' : 'text-gray-400'}`}>
          {selectedPlayer ? `${selectedPlayer.name} ${selectedPlayer.nickname ? `(${selectedPlayer.nickname})` : ''}` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-gray-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full outline-none text-sm font-medium text-gray-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    onChange(p.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-indigo-50 flex flex-col ${value === p.id ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''}`}
                >
                  <span className="font-bold text-gray-900">{p.name}</span>
                  {p.nickname && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">@{p.nickname}</span>}
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-400 italic text-sm font-medium">
                No players found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Matches: React.FC = () => {
  const { players, addMatch, updateMatch, matches, currentUser, getPlayerStats, getPlayerDues, ongoingMatch, startOngoingMatch, clearOngoingMatch } = useApp();
  const canEdit = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.STAFF;
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDirectRecord, setIsDirectRecord] = useState(false);
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');
  const [points, setPoints] = useState<MatchPoints>(20);
  const [table, setTable] = useState('Table 1');
  const [payerOption, setPayerOption] = useState<PayerOption>(PayerOption.LOSER);
  const [winnerId, setWinnerId] = useState('');
  const [success, setSuccess] = useState(false);

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
  const todayStr = new Date().toISOString().split('T')[0];
  const [historyDate, setHistoryDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_RESULT' | 'PENDING_PAYMENT'>('ALL');

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

  const matchTotal = points === 20 ? 30 : 20;

  /**
   * FIFO Logic: Determine if a specific match is "Paid" for a player.
   * A match is paid if (Lifetime Payments + Initial Credits + Lifetime Discounts) >= (Cumulative Charges up to this match).
   */
  const checkIsMatchPaid = (match: Match, playerId: string) => {
    const stats = getPlayerStats(playerId);

    // Get all matches where this player was charged, sorted chronologically
    const playerMatchHistory = matches
      .filter(m => m.charges[playerId] !== undefined)
      .sort((a, b) => a.recordedAt - b.recordedAt);
    
    let cumulativeCharge = 0;
    for (const m of playerMatchHistory) {
      cumulativeCharge += m.charges[playerId] || 0;
      if (m.id === match.id) break;
    }
    
    // Resources include actual payments, initial credit balance, AND waivers/discounts
    const totalAvailableResources = stats.totalPaid + stats.initialBalance + stats.totalDiscounted;
    return totalAvailableResources >= cumulativeCharge;
  };
  
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
    return matches.filter(m => {
      // Date filter
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
          const charge = m.charges[id] || 0;
          if (charge === 0) return false;
          return !checkIsMatchPaid(m, id);
        });
        if (!isPendingResult && !matchHasUnpaidCharges) return false;
      }

      return true;
    });
  }, [matches, historyDate, searchQuery, statusFilter, players, getPlayerDues, getPlayerStats]);

  const handleGoLive = () => {
    if (!playerAId || !playerBId) return;
    startOngoingMatch({
      id: generateUUID(),
      playerAId,
      playerBId,
      points,
      table,
      startTime: Date.now()
    });
    setSuccess(true);
    setTimeout(() => setSuccess(false), 1200);
  };

  const handleSubmit = (e?: React.FormEvent) => {
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
      updateMatch(editingId, {
        points,
        playerAId,
        playerBId,
        winnerId: winnerId || undefined,
        table,
        payerOption,
        totalValue: matchTotal,
        charges
      });
      setEditingId(null);
    } else {
      addMatch({
        date: new Date().toISOString().split('T')[0],
        recordedAt: Date.now(),
        recordedBy: {
          role: currentUser.role,
          name: currentUser.name
        },
        points,
        playerAId,
        playerBId,
        winnerId: winnerId || undefined,
        table,
        payerOption,
        totalValue: matchTotal,
        charges
      });
      // Clear ongoing match if it matches the recorded one
      if (isCurrentlyLive) {
        clearOngoingMatch();
      }
    }

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
    setTable(m.table || 'Table 1');
    setPayerOption(m.payerOption);
    setWinnerId(m.winnerId || '');
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

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {ongoingMatch && (
        <div 
          onClick={() => {
            setPlayerAId(ongoingMatch.playerAId);
            setPlayerBId(ongoingMatch.playerBId);
            setPoints(ongoingMatch.points);
            setTable(ongoingMatch.table);
          }}
          className="bg-gradient-to-r from-rose-500 to-rose-600 p-3 rounded-2xl shadow-lg shadow-rose-200 animate-pulse border border-rose-400 relative overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
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
              <span className="text-white/70 font-bold text-xs shrink-0">({formatElapsedTime(elapsedTime)})</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`${editingId ? 'bg-amber-500' : 'bg-indigo-600'} p-2 rounded-xl transition-colors`}>
            {editingId ? <Edit3 className="text-white w-6 h-6" /> : <Trophy className="text-white w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold">{editingId ? 'Update Match' : 'Game Entry'}</h2>
        </div>
        {(playerAId || playerBId) && (
          <button 
            onClick={editingId ? handleCancelEdit : handleClearPlayers}
            className={`text-xs font-bold uppercase flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors ${
              editingId ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-rose-500'
            }`}
          >
            {editingId ? <X className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
            {editingId ? 'Cancel Edit' : 'Clear Players'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-5 bg-white p-6 rounded-[2.5rem] border shadow-xl relative overflow-hidden transition-all duration-300 ${editingId ? 'border-amber-200 ring-2 ring-amber-100' : 'border-gray-100'}`}>
        {success && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-emerald-500 p-4 rounded-full mb-3 shadow-lg shadow-emerald-200">
              <Check className="w-10 h-10 text-white" />
            </div>
            <p className="text-emerald-800 font-black text-xl">{editingId ? 'Update Saved!' :isCurrentlyLive || isDirectRecord ? 'Match Logged!': 'Live Match Started'}</p>
            <p className="text-emerald-600 font-medium text-sm">Action successful.</p>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center pr-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Point Format</label>
            {isCurrentlyLive && (
               <div className="text-[10px] font-black text-rose-500 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 border border-rose-100">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                 </span>
                 LIVE NOW
               </div>
            )}
          </div>
          <div className="flex gap-3">
            {[20, 10].map((pts) => (
              <button
                key={pts}
                type="button"
                onClick={() => setPoints(pts as MatchPoints)}
                className={`flex-1 py-4 px-2 rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-1 ${
                  points === pts 
                    ? (editingId ? 'bg-amber-500 border-amber-500 text-white' : 'bg-indigo-600 border-indigo-600 text-white') + ' shadow-lg scale-105' 
                    : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{pts} Points</span>
                <span className={`text-[10px] opacity-80 ${points === pts ? 'text-white/70' : 'text-gray-400'}`}>
                  Match Value: ₹{pts === 20 ? 30 : 20}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SearchableSelect 
            label="Player A"
            value={playerAId}
            onChange={setPlayerAId}
            options={players}
            placeholder="Select Player..."
            excludeId={playerBId}
          />
          <SearchableSelect 
            label="Player B"
            value={playerBId}
            onChange={setPlayerBId}
            options={players}
            placeholder="Select Player..."
            excludeId={playerAId}
          />
        </div>

        {(playerAId && playerBId && (isDirectRecord || isCurrentlyLive || editingId)) && (
          <div className="space-y-2 py-2 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center pr-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Winner (Optional)</label>
              {winnerId && (
                <button 
                  type="button" 
                  onClick={() => setWinnerId('')}
                  className="text-[9px] font-black text-gray-400 hover:text-rose-500 uppercase transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {[playerAId, playerBId].map(id => {
                const name = players.find(p => p.id === id)?.name;
                const isSelected = winnerId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWinnerId(id)}
                    className={`flex-1 py-4 px-4 rounded-2xl border-2 font-black transition-all flex items-center justify-center gap-2 ${
                      isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-600'
                    }`}
                  >
                    {isSelected && <Zap className="w-4 h-4 fill-current" />}
                    {name}
                  </button>
                );
              })}
            </div>
            {!winnerId && payerOption === PayerOption.LOSER && (
              <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Result pending: Dues will be ₹0 until updated.
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Billing Method</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: PayerOption.LOSER, label: `Loser Pays (₹${matchTotal})` },
              { id: PayerOption.BOTH, label: `Split (₹${matchTotal/2} ea)` },
              { id: PayerOption.PLAYER_A, label: `A pays ₹${matchTotal}` },
              { id: PayerOption.PLAYER_B, label: `B pays ₹${matchTotal}` },
            ].map(opt => {
              const isSelected = payerOption === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPayerOption(opt.id)}
                  className={`py-3 px-2 rounded-2xl border-2 text-[11px] font-black transition-all ${
                    isSelected ? (editingId ? 'bg-amber-600 border-amber-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white') + ' shadow-md' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {playerAId && playerBId && (
          <div className="bg-gray-900 p-5 rounded-3xl flex items-center justify-between text-white shadow-2xl">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Add to Dues</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                  <span className="text-sm font-bold opacity-80">A: ₹{chargePreview.a}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-bold opacity-80">B: ₹{chargePreview.b}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Game Value</p>
              <p className="text-2xl font-black italic">₹{matchTotal}</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4 pt-2">
          <button 
            type="submit"
            disabled={!playerAId || !playerBId}
            className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 ${
              !playerAId || !playerBId 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : editingId 
                  ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-amber-100'
                  : isCurrentlyLive || isDirectRecord
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-indigo-200'
            }`}
          >
            {editingId ? <Edit3 className="w-6 h-6" /> : isCurrentlyLive || isDirectRecord ? <Check className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            {editingId ? 'Save Changes' : isCurrentlyLive ? 'Finish & Record Result' : isDirectRecord ? 'Record Past Match' : 'Start Live Match'}
          </button>

          {!editingId && !isCurrentlyLive && playerAId && playerBId && (
            <button 
              type="button"
              onClick={() => setIsDirectRecord(!isDirectRecord)}
              className="text-center text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              {isDirectRecord ? '← Switch to Live Entry' : 'Recording a past match? Log result directly →'}
            </button>
          )}
        </div>
      </form>

      {/* History & Filtering Section */}
      <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-lg text-gray-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Session Log
            </h3>
            <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2">
               <input 
                 type="date" 
                 value={historyDate} 
                 onChange={(e) => setHistoryDate(e.target.value)}
                 className="bg-transparent text-xs font-bold outline-none text-indigo-600"
               />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search player name(s), e.g. Rafaqat, Saqib"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none pl-9 p-3 rounded-2xl text-xs font-bold outline-none ring-1 ring-gray-100 focus:ring-indigo-300 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Games' },
              { id: 'PENDING_RESULT', label: 'Result Missing' },
              { id: 'PENDING_PAYMENT', label: 'Pending Dues' }
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  statusFilter === filter.id 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                  : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredMatches.length > 0 ? (
            filteredMatches.map(m => {
              const pA = players.find(p => p.id === m.playerAId);
              const pB = players.find(p => p.id === m.playerBId);
              const isPendingResult = !m.winnerId && m.payerOption === PayerOption.LOSER;
              // NEW FIFO LOGIC: Determine if any involved player has not cleared their charge for THIS match
              const playersWithUnpaidBalance = [m.playerAId, m.playerBId].filter(id => {
                if ((m.charges[id] || 0) === 0) return false;
                return !checkIsMatchPaid(m, id);
              });

              // Descriptive 'Who Pays' logic for Session Log
              const getPayerStatusLabel = () => {
                switch (m.payerOption) {
                  case PayerOption.BOTH:
                    return 'Both Pay (Split)';
                  case PayerOption.PLAYER_A:
                    return `${pA?.name || 'A'} Pays`;
                  case PayerOption.PLAYER_B:
                    return `${pB?.name || 'B'} Pays`;
                  case PayerOption.LOSER:
                    if (!m.winnerId) return 'Loser Pays (Pending Result)';
                    const loserId = m.winnerId === m.playerAId ? m.playerBId : m.playerAId;
                    const loserName = players.find(p => p.id === loserId)?.name || 'Loser';
                    return `${loserName} Pays (Loser)`;
                  default:
                    // Fix: Exhaustive check default should cast to string to avoid 'never' type errors
                    return (m.payerOption as string).replace('_', ' ');
                }
              };
              
              return (
                <div key={m.id} className={`flex flex-col group p-3 rounded-2xl transition-colors ${editingId === m.id ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${m.points === 20 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                        {m.points}p
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {pA?.name} vs {pB?.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {m.winnerId ? (
                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase">
                              Winner: {players.find(p => p.id === m.winnerId)?.name}
                            </span>
                          ) : isPendingResult ? (
                            <span className="text-[8px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md uppercase flex items-center gap-1">
                              <AlertCircle className="w-2 h-2" /> Result Pending
                            </span>
                          ) : (
                            <span className="text-[8px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md uppercase">
                              Match Ended
                            </span>
                          )}
                          <span className="text-[8px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md uppercase">
                            {getPayerStatusLabel()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-base font-black text-gray-900 tracking-tight">₹{m.totalValue}</div>
                        {isPendingResult || playersWithUnpaidBalance.length > 0 ? (
                           <div className="text-[8px] font-black text-rose-500 uppercase flex items-center justify-end gap-1">
                             Unpaid
                           </div>
                        ) : (
                          <div className="text-[8px] font-black text-emerald-500 uppercase flex items-center justify-end gap-1">
                             <Check className="w-2 h-2" /> Cleared
                          </div>
                        )}
                      </div>
                      {canEdit && (
                        <button 
                          onClick={() => handleEdit(m)}
                          className="p-2 bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600 rounded-xl transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                     <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTime(m.recordedAt)}
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-bold text-gray-400">
                          <User className="w-2.5 h-2.5" />
                          By {m.recordedBy.name} ({m.recordedBy.role})
                        </div>
                     </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-50 rounded-3xl">
              No matching games found...
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
