
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl">
            <Users className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">Player Registry</h2>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-orange-500 text-white p-2 rounded-xl shadow-lg shadow-orange-100 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] border border-orange-200 shadow-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              {editingPlayerId ? <UserPen className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-orange-500" />}
              {editingPlayerId ? 'Edit Player' : 'Register New Player'}
            </h3>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Name</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-50 border border-transparent focus:border-orange-500 p-3 rounded-xl outline-none font-bold shadow-inner" 
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Nickname</label>
              <input 
                type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                placeholder="Doctor, Lefty..."
                className="w-full bg-gray-50 border border-transparent focus:border-orange-500 p-3 rounded-xl outline-none shadow-inner"
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone Number</label>
            <input 
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-gray-50 border border-transparent focus:border-orange-500 p-3 rounded-xl outline-none shadow-inner"
            />
          </div>

          {isAdmin && (
            <div className="bg-orange-50 p-4 rounded-2xl space-y-3">
              <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest pl-1">Manual Balance Adjustment</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceType('DUE')}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs border-2 transition-all ${balanceType === 'DUE' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-rose-200 text-rose-400'}`}
                >
                  Manual Due
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceType('CREDIT')}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs border-2 transition-all ${balanceType === 'CREDIT' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-emerald-200 text-emerald-400'}`}
                >
                  Starting Credit
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                <input 
                  type="number" 
                  value={balanceAmount} 
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-transparent focus:border-orange-500 pl-7 p-3 rounded-xl outline-none font-black shadow-inner"
                />
              </div>
              <p className="text-[9px] text-orange-400 italic">This adjustment applies to historical dues or advance payments from the old register.</p>
            </div>
          )}

          <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-100 flex items-center justify-center gap-2">
            {editingPlayerId ? <Save className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            {editingPlayerId ? 'Update Record' : 'Create Player'}
          </button>
        </form>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm font-medium"
        />
      </div>

      {selectedPlayerId && selectedPlayer && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-4 md:p-8 overflow-y-auto flex items-start justify-center sm:items-center">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 my-4 sm:my-0">
            <button 
              onClick={() => setSelectedPlayerId(null)} 
              className="absolute top-6 right-6 text-white bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-orange-500 p-8 pt-10 text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <div className="flex items-center gap-5 mb-6">
                <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl font-black shadow-inner">
                  {selectedPlayer.name[0]}
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight">{selectedPlayer.name}</h3>
                  <div className="flex items-center gap-2 opacity-80 font-bold">
                    <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs tracking-wider uppercase">@{selectedPlayer.nickname || 'Guest'}</span>
                    {selectedPlayer.phone && <span className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {selectedPlayer.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-black/10 p-2 rounded-2xl text-center backdrop-blur-md">
                  <div className="text-[8px] uppercase font-black opacity-60 tracking-wider mb-1">Played</div>
                  <div className="text-lg font-black">{selectedStats?.games}</div>
                </div>
                <div className="bg-black/10 p-2 rounded-2xl text-center backdrop-blur-md">
                  <div className="text-[8px] uppercase font-black opacity-60 tracking-wider mb-1">Total</div>
                  <div className="text-lg font-black">₹{selectedStats?.totalSpent}</div>
                </div>
                <div className="bg-black/10 p-2 rounded-2xl text-center backdrop-blur-md">
                  <div className="text-[8px] uppercase font-black opacity-60 tracking-wider mb-1">Waived</div>
                  <div className="text-lg font-black text-amber-400">₹{selectedStats?.totalDiscounted}</div>
                </div>
                <div className="bg-white p-2 rounded-2xl text-center shadow-lg">
                  <div className="text-[8px] uppercase font-black text-orange-500 tracking-wider mb-1">Balance</div>
                  <div className={`text-lg font-black ${selectedStats!.pending > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{selectedStats?.pending}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8 max-h-[65vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
              {selectedStats?.initialBalance !== 0 && (
                <div className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <Edit3 className="w-4 h-4 text-gray-400" />
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Manual Adjustment</span>
                   </div>
                   <span className={`font-black ${selectedStats!.initialBalance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {selectedStats!.initialBalance > 0 ? '+' : '-'} ₹{Math.abs(selectedStats!.initialBalance)}
                   </span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-gray-900 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Award className="w-4 h-4 text-orange-500" /> Recent Battles
                  </h4>
                  <span className="text-[10px] font-black text-gray-400">{playerMatches.length} Recorded</span>
                </div>
                <div className="space-y-2">
                  {playerMatches.map(m => (
                    <div key={m.id} className="text-sm bg-gray-50 p-4 rounded-2xl flex justify-between border border-transparent hover:border-orange-100 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">vs {m.playerAId === selectedPlayerId ? (players.find(p => p.id === m.playerBId)?.name) : (players.find(p => p.id === m.playerAId)?.name)}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{m.date} • {m.points}p Match</span>
                      </div>
                      <span className="font-black text-rose-500 flex items-center gap-1">₹{m.charges[selectedPlayerId] || 0}</span>
                    </div>
                  ))}
                  {playerMatches.length === 0 && <p className="text-center py-4 text-gray-300 italic text-sm">No matches found.</p>}
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-black text-gray-900 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <IndianRupee className="w-4 h-4 text-emerald-500" /> Payment History
                  </h4>
                  <span className="text-[10px] font-black text-gray-400">{playerPayments.length} Recorded</span>
                </div>
                <div className="space-y-2">
                  {playerPayments.map(p => {
                    const allocation = p.allocations.find(a => a.playerId === selectedPlayerId);
                    return (
                      <div key={p.id} className="text-sm bg-emerald-50/50 p-4 rounded-2xl flex justify-between border border-emerald-100">
                        <div className="flex flex-col">
                          <span className="font-bold text-emerald-900">{p.mode} RECEIPT</span>
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">{p.date} • {p.notes || 'No Notes'}</span>
                          {allocation?.discount ? (
                             <span className="text-[9px] font-black text-amber-600 flex items-center gap-1 mt-1">
                               <Percent className="w-2 h-2" /> Waived: ₹{allocation.discount}
                             </span>
                          ) : null}
                        </div>
                        <span className="font-black text-emerald-600">₹{allocation?.amount || 0}</span>
                      </div>
                    );
                  })}
                  {playerPayments.length === 0 && <p className="text-center py-4 text-gray-300 italic text-sm">No payments found.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlayers.map(p => {
          const stats = getPlayerStats(p.id);
          return (
            <div 
              key={p.id} 
              onClick={() => setSelectedPlayerId(p.id)}
              className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-xl text-orange-400 shadow-inner">
                  {p.name[0]}
                </div>
                <div>
                  <div className="font-black text-gray-900 text-lg leading-tight group-hover:text-orange-600 transition-colors">{p.name}</div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">@{p.nickname || 'GUEST'}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-xl font-black tracking-tight ${stats.pending > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{stats.pending}
                  </div>
                  <div className="text-[9px] uppercase font-black text-gray-400 tracking-tighter">Current Balance</div>
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => handleOpenEdit(p, e)}
                    className="p-3 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
                  >
                    <Edit3 className="w-5 h-5" />
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