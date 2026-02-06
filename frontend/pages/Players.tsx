import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { Users, Search, Plus, Phone, Edit3, X, Check, Save, UserPen } from 'lucide-react';

export const Players: React.FC = () => {
  const { players, addPlayer, updatePlayer, getPlayerStats, currentUser } = useApp();
  const navigate = useNavigate();
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

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-orange-500 p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Users className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold dark:text-white transition-all">Player Registry</h2>
        </div>
        <button 
          onClick={handleOpenAdd}
          title="Add new player"
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
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 p-1" title="Close">
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Name</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-orange-500 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none font-bold shadow-inner dark:text-white transition-all text-xs md:text-sm" 
                required
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
              placeholder="Mobile number"
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
          placeholder="Search registry..."
          className="w-full bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 pl-11 md:pl-12 pr-4 py-3 md:py-4 rounded-xl md:rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 shadow-sm font-medium dark:text-white transition-all text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {filteredPlayers.map(p => {
          const stats = getPlayerStats(p.id);
          return (
            <div 
              key={p.id} 
              onClick={() => navigate(`/players/${p.id}`)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(p, e);
                    }}
                    title="Edit player"
                    className="p-2 md:p-3 text-gray-300 dark:text-slate-600 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg md:rounded-xl transition-all"
                  >
                    <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredPlayers.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
            <p className="text-gray-400 font-bold italic">No players found match your search...</p>
          </div>
        )}
      </div>
    </div>
  );
};
