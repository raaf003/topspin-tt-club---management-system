
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { Users, Search, Plus, Phone, Award, IndianRupee, Edit3, X, Check, Save, UserPen, Percent } from 'lucide-react';

export const Players: React.FC = () => {
  const { players, addPlayer, updatePlayer, getPlayerStats, matches, payments, currentUser } = useApp();
  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [balanceType, setBalanceType] = useState<'CREDIT' | 'DUE'>('DUE');
  const [balanceAmount, setBalanceAmount] = useState('');

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.nickname?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingPlayerId(null);
    setName('');
    setNickname('');
    setPhone('');
    setBalanceAmount('');
    setBalanceType('DUE');
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEdit = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlayerId(p.id);
    setName(p.name);
    setNickname(p.nickname || '');
    setPhone(p.phone || '');
    const bal = p.initialBalance || 0;
    setBalanceAmount(Math.abs(bal).toString());
    setBalanceType(bal >= 0 ? 'CREDIT' : 'DUE');
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const numericAmount = parseFloat(balanceAmount) || 0;
    const initialBalance = balanceType === 'CREDIT' ? numericAmount : -numericAmount;

    if (editingPlayerId) {
      updatePlayer(editingPlayerId, { name, nickname, phone, initialBalance });
    } else {
      addPlayer({ name, nickname, phone, initialBalance });
    }

    setName('');
    setNickname('');
    setPhone('');
    setBalanceAmount('');
    setShowAdd(false);
    setEditingPlayerId(null);
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);
  const selectedStats = selectedPlayerId ? getPlayerStats(selectedPlayerId) : null;
  const playerMatches = selectedPlayerId ? matches.filter(m => m.playerAId === selectedPlayerId || m.playerBId === selectedPlayerId).slice(0, 10) : [];
  const playerPayments = selectedPlayerId ? payments.filter(p => p.allocations.some(a => a.playerId === selectedPlayerId)).slice(0, 10) : [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-orange-500 p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Users className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold dark:text-white transition-all">Player Registry</h2>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-orange-500 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-lg shadow-orange-100 dark:shadow-orange-900/20 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl md:rounded-[2rem] border border-orange-200 dark:border-orange-900 shadow-xl space-y-3 md:space-y-4 animate-in slide-in-from-top-4 duration-300 transition-all">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <h3 className="font-black text-sm md:text-base text-gray-900 dark:text-white flex items-center gap-2">
              {editingPlayerId ? <UserPen className="w-4 h-4 md:w-5 md:h-5 text-orange-500" /> : <Plus className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />}
              {editingPlayerId ? 'Edit Player' : 'New Player'}
            </h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 p-1">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Name</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-orange-500 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none font-bold shadow-inner dark:text-white transition-all text-xs md:text-sm" 
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nickname</label>
              <input 
                type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                placeholder="Doctor, Lefty..."
                className="w-full bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-orange-500 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none shadow-inner dark:text-white transition-all text-xs md:text-sm"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Phone</label>
            <input 
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-orange-500 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none shadow-inner dark:text-white transition-all text-xs md:text-sm"
            />
          </div>

          {isAdmin && (
            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 md:p-4 rounded-xl md:rounded-2xl space-y-2 md:space-y-3">
              <label className="text-[8px] md:text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest pl-1">Balance Adjustment</label>
              <div className="flex gap-1.5 md:gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceType('DUE')}
                  className={`flex-1 py-1.5 md:py-2 rounded-lg font-bold text-[10px] md:text-xs border-2 transition-all ${balanceType === 'DUE' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50 text-rose-400'}`}
                >
                  Manual Due
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceType('CREDIT')}
                  className={`flex-1 py-1.5 md:py-2 rounded-lg font-bold text-[10px] md:text-xs border-2 transition-all ${balanceType === 'CREDIT' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/50 text-emerald-400'}`}
                >
                  Credit
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-xs md:text-sm">₹</span>
                <input 
                  type="number" 
                  value={balanceAmount} 
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white dark:bg-slate-800 border border-transparent focus:border-orange-500 pl-7 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none font-black shadow-inner dark:text-white transition-all text-xs md:text-sm"
                />
              </div>
            </div>
          )}

          <button type="submit" className="w-full bg-orange-600 text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-lg shadow-orange-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-95 transition-all">
            {editingPlayerId ? <Save className="w-4 h-4 md:w-5 md:h-5" /> : <Check className="w-4 h-4 md:w-5 md:h-5" />}
            {editingPlayerId ? 'Update Record' : 'Create Player'}
          </button>
        </form>
      )}

      <div className="relative px-1">
        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 pl-11 md:pl-12 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm font-medium dark:text-white transition-all text-sm"
        />
      </div>

      {selectedPlayerId && selectedPlayer && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-3 md:p-8 overflow-y-auto flex items-start justify-center sm:items-center">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-4 sm:my-0 transition-all">
            <button 
              onClick={() => setSelectedPlayerId(null)} 
              className="absolute top-4 md:top-6 right-4 md:right-6 text-white bg-black/20 p-1.5 md:p-2 rounded-full hover:bg-black/40 transition-colors z-10"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="bg-orange-500 p-6 md:p-8 pt-8 md:pt-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex items-center gap-4 md:gap-5 mb-5 md:mb-6">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-white/20 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-black shadow-inner">
                  {selectedPlayer.name[0]}
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight">{selectedPlayer.name}</h3>
                  <div className="flex items-center gap-1.5 md:gap-2 opacity-80 font-bold">
                    <span className="bg-white/20 px-1.5 md:px-2 py-0.5 rounded-lg text-[10px] md:text-xs tracking-wider uppercase">@{selectedPlayer.nickname || 'Guest'}</span>
                    {selectedPlayer.phone && <span className="flex items-center gap-1 text-[10px] md:text-xs"><Phone className="w-2.5 h-2.5 md:w-3 md:h-3" /> {selectedPlayer.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                <StatBox label="Played" value={selectedStats?.games.toString() || '0'} />
                <StatBox label="Total" value={`₹${selectedStats?.totalSpent}`} />
                <StatBox label="Waived" value={`₹${selectedStats?.totalDiscounted}`} color="text-amber-400" />
                <StatBox label="Balance" value={`₹${selectedStats?.pending}`} color={selectedStats!.pending > 0 ? 'text-rose-500' : 'text-emerald-500'} isWhiteBg />
              </div>
            </div>

            <div className="p-5 md:p-8 space-y-6 md:space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {selectedStats?.initialBalance !== 0 && (
                <div className="bg-gray-50 dark:bg-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl flex justify-between items-center transition-all">
                   <div className="flex items-center gap-2">
                     <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
                     <span className="text-[10px] md:text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest">Adjustment</span>
                   </div>
                   <span className={`text-sm md:text-base font-black ${selectedStats!.initialBalance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {selectedStats!.initialBalance > 0 ? '+' : '-'} ₹{Math.abs(selectedStats!.initialBalance)}
                   </span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h4 className="font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase text-[10px] md:text-xs tracking-widest">
                    <Award className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500" /> Recent Battles
                  </h4>
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500">{playerMatches.length} Logs</span>
                </div>
                <div className="space-y-2">
                  {playerMatches.map(m => (
                    <div key={m.id} className="text-xs md:text-sm bg-gray-50 dark:bg-slate-800 p-3 md:p-4 rounded-xl md:rounded-2xl flex justify-between border border-transparent hover:border-orange-100 dark:hover:border-orange-900 transition-all">
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-gray-900 dark:text-white truncate">vs {m.playerAId === selectedPlayerId ? (players.find(p => p.id === m.playerBId)?.name) : (players.find(p => p.id === m.playerAId)?.name)}</span>
                        <span className="text-[9px] md:text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">{m.date} • {m.points}p</span>
                      </div>
                      <span className="font-black text-rose-500 dark:text-rose-400 shrink-0 ml-2">₹{m.charges[selectedPlayerId] || 0}</span>
                    </div>
                  ))}
                  {playerMatches.length === 0 && <p className="text-center py-4 text-gray-300 dark:text-slate-700 italic text-xs md:text-sm">No matches yet.</p>}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <h4 className="font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase text-[10px] md:text-xs tracking-widest">
                    <IndianRupee className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 dark:text-emerald-400" /> Payment History
                  </h4>
                  <span className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500">{playerPayments.length} Logs</span>
                </div>
                <div className="space-y-2">
                  {playerPayments.map(p => {
                    const allocation = p.allocations.find(a => a.playerId === selectedPlayerId);
                    return (
                      <div key={p.id} className="text-xs md:text-sm bg-emerald-50/50 dark:bg-emerald-900/10 p-3 md:p-4 rounded-xl md:rounded-2xl flex justify-between border border-emerald-100 dark:border-emerald-900/30 transition-all">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-emerald-900 dark:text-emerald-400 truncate">{p.mode} RECEIPT</span>
                          <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase truncate">{p.date} • {p.notes || 'No notes'}</span>
                          {allocation?.discount ? (
                             <span className="text-[8px] md:text-[9px] font-black text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                               <Percent className="w-2 h-2" /> Waived: ₹{allocation.discount}
                             </span>
                          ) : null}
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">₹{allocation?.amount || 0}</span>
                      </div>
                    );
                  })}
                  {playerPayments.length === 0 && <p className="text-center py-4 text-gray-300 dark:text-slate-700 italic text-xs md:text-sm">No payments yet.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {filteredPlayers.map(p => {
          const stats = getPlayerStats(p.id);
          return (
            <div 
              key={p.id} 
              onClick={() => setSelectedPlayerId(p.id)}
              className="bg-white dark:bg-slate-900 p-3.5 md:p-5 rounded-xl md:rounded-[1.5rem] border border-gray-100 dark:border-slate-800 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-gray-50 dark:bg-slate-800 rounded-lg md:rounded-2xl shrink-0 flex items-center justify-center font-black text-lg md:text-xl text-orange-400 shadow-inner group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                  {p.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-gray-900 dark:text-white text-sm md:text-lg leading-tight group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">{p.name}</div>
                  <div className="text-[8px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5 truncate">@{p.nickname || 'GUEST'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-2">
                <div className="text-right">
                  <div className={`text-base md:text-xl font-black tracking-tight transition-all ${stats.pending > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{stats.pending}
                  </div>
                  <div className="text-[7px] md:text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-tighter">Balance</div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => handleOpenEdit(p, e)}
                    className="p-2 md:p-3 text-gray-300 dark:text-slate-600 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg md:rounded-xl transition-all"
                  >
                    <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; color?: string; isWhiteBg?: boolean }> = ({ label, value, color = "text-white", isWhiteBg }) => (
  <div className={`${isWhiteBg ? 'bg-white dark:bg-slate-800' : 'bg-black/10'} p-1.5 md:p-2 rounded-xl md:rounded-2xl text-center backdrop-blur-md transition-all shadow-sm`}>
    <div className={`text-[7px] md:text-[8px] uppercase font-black ${isWhiteBg ? 'text-orange-500 dark:text-orange-400' : 'opacity-60'} tracking-wider mb-0.5 md:mb-1`}>{label}</div>
    <div className={`text-base md:text-lg font-black ${color} transition-all`}>{value}</div>
  </div>
);