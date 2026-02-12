import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMode, PaymentAllocation, UserRole, Player } from '../types';
import { IndianRupee, CreditCard, Banknote, Check, UserPlus, Trash2, Edit3, X, Search, ChevronDown, Percent, Calendar } from 'lucide-react';

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (id: string) => void;
  options: Player[];
  placeholder: string;
  getPlayerDues?: (id: string) => number;
  className?: string;
  small?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  label, value, onChange, options, placeholder, getPlayerDues, className, small = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPlayer = options.find(p => p.id === value);
  const filteredOptions = options.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.nickname && p.nickname.toLowerCase().includes(search.toLowerCase()))
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
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 md:mb-1.5 block">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 dark:bg-slate-900 border-2 border-transparent rounded-xl md:rounded-2xl cursor-pointer flex justify-between items-center shadow-inner group hover:border-emerald-100 dark:hover:border-emerald-900 transition-all ${small ? 'p-2 md:p-3' : 'p-3 md:p-4'}`}
      >
        <span className={`font-bold truncate ${selectedPlayer ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-slate-500'} ${small ? 'text-xs md:text-sm' : 'text-sm md:text-base'}`}>
          {selectedPlayer ? `${selectedPlayer.name} ${selectedPlayer.nickname ? `(${selectedPlayer.nickname})` : ''}` : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
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
              placeholder="Search..."
              className="w-full outline-none text-xs md:text-sm font-medium text-gray-800 dark:text-white bg-transparent"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 md:max-h-60 overflow-y-auto py-1 md:py-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(p => {
                const due = getPlayerDues ? getPlayerDues(p.id) : null;
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/30 flex flex-col ${value === p.id ? 'bg-emerald-50 dark:bg-emerald-900/40 border-r-4 border-emerald-500' : ''}`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white truncate">{p.name}</span>
                      {due !== null && (
                        <span className={`text-[7px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded-full shrink-0 ${due > 0 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'}`}>
                          ₹{due}
                        </span>
                      )}
                    </div>
                    {p.nickname && <span className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-tight truncate">@{p.nickname}</span>}
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 md:py-8 text-center text-gray-400 italic text-xs md:text-sm font-medium">
                No players
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const Payments: React.FC = () => {
  const { players, addPayment, updatePayment, getPlayerStats, payments, currentUser, getPlayerDues } = useApp();
  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  // State for system
  const [editingId, setEditingId] = useState<string | null>(null);
  const [primaryPayerId, setPrimaryPayerId] = useState('');
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([{ playerId: '', amount: 0, discount: 0 }]);
  const [mode, setMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);

  // History & Filter State
  const todayStr = new Date().toISOString().split('T')[0];
  const [historyDate, setHistoryDate] = useState(todayStr);

  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => !historyDate || p.date === historyDate)
      .sort((a, b) => b.recordedAt - a.recordedAt);
  }, [payments, historyDate]);

  const totalPaymentAmount = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalDiscountAmount = allocations.reduce((sum, a) => sum + (a.discount || 0), 0);
  const totalSettlement = totalPaymentAmount + totalDiscountAmount;

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddAllocation = () => {
    setAllocations([...allocations, { playerId: '', amount: 0, discount: 0 }]);
  };

  const handleRemoveAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, key: keyof PaymentAllocation, value: any) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], [key]: value };
    setAllocations(newAllocations);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryPayerId) return;
    
    const validAllocations = allocations.filter(a => a.playerId && ((a.amount || 0) > 0 || (a.discount || 0) > 0));
    if (validAllocations.length === 0) return;

    if (editingId) {
      updatePayment(editingId, {
        primaryPayerId,
        totalAmount: totalPaymentAmount,
        allocations: validAllocations,
        mode,
        notes
      });
      setEditingId(null);
    } else {
      addPayment({
        primaryPayerId,
        totalAmount: totalPaymentAmount,
        allocations: validAllocations,
        mode,
        notes,
        date: new Date().toISOString().split('T')[0],
        recordedAt: Date.now(),
        recordedBy: {
          role: currentUser.role,
          name: currentUser.name
        }
      });
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setPrimaryPayerId('');
      setAllocations([{ playerId: '', amount: 0, discount: 0 }]);
      setNotes('');
    }, 1500);
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setPrimaryPayerId(p.primaryPayerId);
    setAllocations(p.allocations.map((a: any) => ({ ...a, discount: a.discount || 0 })));
    setMode(p.mode);
    setNotes(p.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setPrimaryPayerId('');
    setAllocations([{ playerId: '', amount: 0, discount: 0 }]);
    setNotes('');
  };

  const handlePrimaryPayerChange = (val: string) => {
    setPrimaryPayerId(val);
    const dues = getPlayerDues(val);
    // If the allocations list is pristine (only one empty slot), auto-populate with the payer and their current dues
    if (allocations.length === 1 && !allocations[0].playerId) {
      setAllocations([{ playerId: val, amount: dues > 0 ? dues : 0, discount: 0 }]);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-10">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`${editingId ? 'bg-amber-500' : 'bg-emerald-600'} p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all`}>
            {editingId ? <Edit3 className="text-white w-5 h-5 md:w-6 md:h-6" /> : <IndianRupee className="text-white w-5 h-5 md:w-6 md:h-6" />}
          </div>
          <h2 className="text-xl md:text-2xl font-bold dark:text-white transition-all">{editingId ? 'Update Payment' : 'Pay Dues'}</h2>
        </div>
        {editingId && (
          <button 
            onClick={handleCancelEdit}
            className="text-[9px] md:text-xs font-bold uppercase flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-4 md:space-y-6 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border shadow-xl relative overflow-hidden transition-all duration-300 ${editingId ? 'border-amber-200 dark:border-amber-800 ring-2 ring-amber-100 dark:ring-amber-900/20' : 'border-gray-100 dark:border-slate-800'}`}>
        {success && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-emerald-500 p-3 md:p-4 rounded-full mb-2 md:mb-3 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
              <Check className="w-8 h-8 md:w-10 md:h-10 text-white" />
            </div>
            <p className="text-emerald-800 dark:text-emerald-400 font-black text-lg md:text-xl">{editingId ? 'Payment Updated!' : 'Payment Logged!'}</p>
            <p className="text-emerald-600 dark:text-emerald-500 font-medium text-xs md:text-sm">Action successful.</p>
          </div>
        )}

        <div className="space-y-3 md:space-y-4">
          <SearchableSelect 
            label="Primary Payer"
            value={primaryPayerId}
            onChange={handlePrimaryPayerChange}
            options={players}
            getPlayerDues={getPlayerDues}
            placeholder="Who is paying..."
          />

          <div className="space-y-2 md:space-y-3">
             <div className="flex justify-between items-center px-1">
               <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Allocation Split</label>
               <button 
                 type="button" 
                 onClick={handleAddAllocation}
                 className="text-[8px] md:text-[9px] font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 uppercase flex items-center gap-0.5 md:gap-1 transition-colors"
               >
                 <UserPlus className="w-2.5 h-2.5 md:w-3 md:h-3" /> Add Player
               </button>
             </div>
             
             <div className="space-y-2 md:space-y-3">
               {allocations.map((allocation, index) => (
                 <div key={index} className="flex gap-1.5 md:gap-2 items-end animate-in slide-in-from-left-2 duration-300">
                   <div className="flex-[1.5] min-w-0">
                    <SearchableSelect 
                      value={allocation.playerId}
                      onChange={(id) => updateAllocation(index, 'playerId', id)}
                      options={players}
                      getPlayerDues={getPlayerDues}
                      placeholder="Player"
                      small
                    />
                   </div>
                   <div className="flex-1 space-y-0.5 md:space-y-1 min-w-0">
                     <label className="text-[7px] md:text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-tighter pl-1 truncate block">Amount</label>
                     <div className="relative group">
                       <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                       <input 
                         type="number" 
                         value={allocation.amount || ''}
                         onChange={(e) => updateAllocation(index, 'amount', Number(e.target.value))}
                         placeholder="0"
                         className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-2 md:p-3 pl-6 md:pl-7 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-gray-800 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                       />
                     </div>
                   </div>
                   <div className="flex-1 space-y-0.5 md:space-y-1 min-w-0">
                     <label className="text-[7px] md:text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-tighter pl-1 truncate block">Waiver</label>
                     <div className="relative group">
                       <Percent className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                       <input 
                         type="number" 
                         value={allocation.discount || ''}
                         onChange={(e) => updateAllocation(index, 'discount', Number(e.target.value))}
                         placeholder="0"
                         className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-2 md:p-3 pl-6 md:pl-7 rounded-lg md:rounded-xl text-xs md:text-sm font-black text-amber-600 dark:text-amber-400 outline-none focus:border-amber-500 transition-all shadow-inner"
                       />
                     </div>
                   </div>
                   {allocations.length > 1 && (
                     <button 
                       type="button" 
                       onClick={() => handleRemoveAllocation(index)}
                       title="Remove allocation"
                       className="p-2.5 md:p-3.5 bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 rounded-lg md:rounded-xl hover:bg-rose-100 transition-colors shadow-sm shrink-0"
                     >
                       <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                     </button>
                   )}
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="space-y-1.5 md:space-y-2">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Payment Mode</label>
          <div className="flex gap-2 md:gap-3">
            {[
              { id: PaymentMode.CASH, label: 'Cash', icon: <Banknote className="w-4 h-4 md:w-5 md:h-5" /> },
              { id: PaymentMode.ONLINE, label: 'Online', icon: <CreditCard className="w-4 h-4 md:w-5 md:h-5" /> }
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`flex-1 py-3 md:py-4 px-2 rounded-xl md:rounded-2xl border-2 font-black transition-all flex flex-col items-center justify-center gap-0.5 md:gap-1 ${
                  mode === opt.id 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg scale-[1.02] md:scale-105' 
                    : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {opt.icon}
                <span className="text-[10px] md:text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Remarks</label>
          <input 
            type="text" 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes..."
            className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-3 md:p-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-gray-800 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
          />
        </div>

        {totalSettlement > 0 && (
           <div className="bg-gray-900 dark:bg-slate-800 p-4 md:p-5 rounded-2xl md:rounded-3xl space-y-2 md:space-y-3 shadow-2xl transition-all">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-[8px] md:text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Total Received</p>
                   <p className="text-2xl md:text-3xl font-black italic text-white">₹{totalPaymentAmount}</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] md:text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">Total Waiver</p>
                   <p className="text-xl md:text-2xl font-black italic text-white opacity-80">₹{totalDiscountAmount}</p>
                </div>
             </div>
             <div className="pt-2 md:pt-3 border-t border-white/10 flex justify-between items-center">
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400">Total Settlement Value</p>
                <p className="text-base md:text-lg font-black text-emerald-400">₹{totalSettlement}</p>
             </div>
           </div>
        )}

        <button 
          type="submit"
          disabled={!primaryPayerId || totalSettlement === 0}
          className={`w-full py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-xl shadow-2xl transition-all flex items-center justify-center gap-2 md:gap-3 ${
            !primaryPayerId || totalSettlement === 0
              ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed' 
              : editingId
                ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-amber-100 dark:shadow-none'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-200 dark:shadow-none'
          }`}
        >
          {editingId ? <Edit3 className="w-5 h-5 md:w-6 md:h-6" /> : <Check className="w-5 h-5 md:w-6 md:h-6" />}
          {editingId ? 'Save Changes' : 'Confirm Payment'}
        </button>
      </form>

      {/* History Section */}
      <section className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 md:space-y-5 transition-all">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-base md:text-lg text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-emerald-400" />
            Recent Transactions
          </h3>
          <div className="bg-gray-50 dark:bg-slate-800 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-700 flex items-center gap-1.5 md:gap-2">
            <input 
              type="date" 
              value={historyDate}
              title="Select date"
              onChange={(e) => setHistoryDate(e.target.value)}
              className="bg-transparent text-[10px] md:text-xs font-bold outline-none text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          {filteredPayments.length > 0 ? (
            filteredPayments.map(p => {
              const payer = players.find(player => player.id === p.primaryPayerId);
              const waived = p.allocations.reduce((sum, a) => sum + (a.discount || 0), 0);
              
              return (
                <div key={p.id} className="flex flex-col group p-2 rounded-xl md:rounded-2xl transition-all hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
                      <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-lg md:rounded-2xl flex flex-col items-center justify-center font-black text-[8px] md:text-[10px] ${p.mode === PaymentMode.ONLINE ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                        {p.mode === PaymentMode.ONLINE ? <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 mb-0.5" /> : <Banknote className="w-3.5 h-3.5 md:w-4 md:h-4 mb-0.5" />}
                        {p.mode === PaymentMode.ONLINE ? 'GP' : 'CASH'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white text-xs md:text-sm flex items-center gap-1.5 md:gap-2">
                          <span className="truncate">{payer?.name}</span>
                          {p.allocations.length > 1 && (
                            <span className="text-[7px] md:text-[8px] font-black bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-1 md:px-1.5 py-0.5 rounded-full shrink-0">
                              +{p.allocations.length - 1}
                            </span>
                          )}
                        </div>
                        <div className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase mt-0.5 flex flex-wrap items-center gap-1 md:gap-2">
                          <span>{p.date}</span>
                          {waived > 0 && <span className="text-amber-600 dark:text-amber-500 font-black shrink-0">• ₹{waived} waived</span>}
                          {p.notes && <span className="w-0.5 h-0.5 rounded-full bg-gray-200 dark:bg-slate-700 shrink-0"></span>}
                          {p.notes && <span className="lowercase italic truncate max-w-[80px] md:max-w-[120px] dark:text-slate-400 shrink-0">{p.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 md:gap-4 shrink-0 ml-2">
                      <div className="text-right">
                        <div className="text-base md:text-lg font-black text-gray-900 dark:text-white tracking-tight transition-all">₹{p.totalAmount}</div>
                        <div className="text-[7px] md:text-[8px] font-black text-emerald-500 dark:text-emerald-400 uppercase">Verified</div>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleEdit(p)}
                          title="Edit payment"
                          className="p-2 md:p-2.5 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg md:rounded-xl transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {p.recordedAt && (
                    <div className="mt-1.5 md:mt-2 pt-1 md:pt-1.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="flex items-center gap-1 text-[7px] md:text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                          <Check className="w-2 md:w-2.5 h-2 md:h-2.5 text-emerald-500" />
                          {formatTime(p.recordedAt)}
                        </div>
                        {p.recordedBy && (
                          <div className="text-[7px] md:text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                            By {p.recordedBy.name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-8 md:py-10 text-center text-gray-300 dark:text-slate-700 font-bold italic border-2 border-dashed border-gray-50 dark:border-slate-800 rounded-2xl md:rounded-3xl">
              No payments yet...
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
