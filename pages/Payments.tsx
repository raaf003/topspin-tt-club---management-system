
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMode, PaymentAllocation, UserRole, Player } from '../types';
import { IndianRupee, CreditCard, Banknote, Check, UserPlus, Trash2, Users, Edit3, X, Search, ChevronDown, Percent } from 'lucide-react';

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
      {label && <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1.5 block">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 border-2 border-transparent rounded-2xl cursor-pointer flex justify-between items-center shadow-inner group hover:border-emerald-100 transition-all ${small ? 'p-3' : 'p-4'}`}
      >
        <span className={`font-bold truncate ${selectedPlayer ? 'text-gray-800' : 'text-gray-400'} ${small ? 'text-sm' : ''}`}>
          {selectedPlayer ? `${selectedPlayer.name} ${selectedPlayer.nickname ? `(${selectedPlayer.nickname})` : ''}` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
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
                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-emerald-50 flex flex-col ${value === p.id ? 'bg-emerald-50 border-r-4 border-emerald-500' : ''}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">{p.name}</span>
                      {due !== null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${due > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          ₹{due}
                        </span>
                      )}
                    </div>
                    {p.nickname && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">@{p.nickname}</span>}
                  </div>
                );
              })
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

  const totalPaymentAmount = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalDiscountAmount = allocations.reduce((sum, a) => sum + (a.discount || 0), 0);
  const totalSettlement = totalPaymentAmount + totalDiscountAmount;

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
        date: new Date().toISOString().split('T')[0]
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`${editingId ? 'bg-amber-500' : 'bg-emerald-600'} p-2 rounded-xl transition-colors`}>
            {editingId ? <Edit3 className="text-white w-6 h-6" /> : <IndianRupee className="text-white w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold">{editingId ? 'Update Payment' : 'Record Payment'}</h2>
        </div>
        {editingId && (
          <button 
            onClick={handleCancelEdit}
            className="text-xs font-bold uppercase flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full"
          >
            <X className="w-3 h-3" /> Cancel Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className={`space-y-6 bg-white p-6 rounded-[2.5rem] border shadow-xl relative overflow-hidden transition-all duration-300 ${editingId ? 'border-amber-200 ring-2 ring-amber-100' : 'border-gray-100'}`}>
        {success && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-emerald-500 p-4 rounded-full mb-3 shadow-lg shadow-emerald-200">
              <Check className="w-10 h-10 text-white" />
            </div>
            <p className="text-emerald-800 font-black text-xl">{editingId ? 'Payment Updated!' : 'Payment Received!'}</p>
            <p className="text-emerald-600 font-medium text-sm">Balances updated instantly.</p>
          </div>
        )}

        {/* Primary Payer Selection */}
        <SearchableSelect 
          label="Who is giving the money?"
          value={primaryPayerId}
          onChange={handlePrimaryPayerChange}
          options={players}
          placeholder="Select Primary Payer..."
          getPlayerDues={getPlayerDues}
        />

        {/* Multi-Allocation Section */}
        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment Distribution</label>
             <button 
               type="button" 
               onClick={handleAddAllocation}
               className="text-emerald-600 text-xs font-bold flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"
             >
               <UserPlus className="w-3 h-3" /> Add Player
             </button>
          </div>
          
          <div className="space-y-4">
            {allocations.map((alloc, idx) => (
              <div key={idx} className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100 space-y-3 animate-in slide-in-from-left-2 duration-200">
                <div className="flex justify-between items-center gap-2">
                  <SearchableSelect 
                    value={alloc.playerId}
                    onChange={(id) => updateAllocation(idx, 'playerId', id)}
                    options={players}
                    placeholder="Recipient..."
                    small
                    getPlayerDues={getPlayerDues}
                    className="flex-grow"
                  />
                  {allocations.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAllocation(idx)}
                      className="p-2 text-gray-300 hover:text-rose-500 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-[8px] font-black text-gray-400 uppercase absolute -top-2 left-2 bg-white px-1">Amount Paid</label>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                    <input 
                      type="number" 
                      value={alloc.amount || ''}
                      placeholder="0"
                      onChange={(e) => updateAllocation(idx, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border-2 border-transparent pl-6 p-2 rounded-xl outline-none focus:border-emerald-500 font-bold text-sm shadow-inner"
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[8px] font-black text-amber-500 uppercase absolute -top-2 left-2 bg-white px-1">Discount/Waiver</label>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold text-xs">₹</span>
                    <input 
                      type="number" 
                      value={alloc.discount || ''}
                      placeholder="0"
                      onChange={(e) => updateAllocation(idx, 'discount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border-2 border-transparent pl-6 p-2 rounded-xl outline-none focus:border-amber-500 font-bold text-sm text-amber-600 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mode & Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Payment Mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode(PaymentMode.CASH)}
                className={`flex-1 py-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all text-sm ${
                  mode === PaymentMode.CASH ? (editingId ? 'bg-amber-600 border-amber-600' : 'bg-emerald-600 border-emerald-600') + ' text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-500'
                }`}
              >
                <Banknote className="w-4 h-4" /> Cash
              </button>
              <button
                type="button"
                onClick={() => setMode(PaymentMode.ONLINE)}
                className={`flex-1 py-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold transition-all text-sm ${
                  mode === PaymentMode.ONLINE ? (editingId ? 'bg-amber-600 border-amber-600' : 'bg-emerald-600 border-emerald-600') + ' text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-500'
                }`}
              >
                <CreditCard className="w-4 h-4" /> GPay
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Short Note</label>
            <input 
              type="text" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Friends"
              className="w-full bg-gray-50 border-2 border-transparent p-3 rounded-2xl outline-none focus:border-emerald-500 text-sm shadow-inner"
            />
          </div>
        </div>

        {/* Summary Footer */}
        <div className="bg-gray-900 p-5 rounded-3xl flex items-center justify-between text-white shadow-2xl">
           <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
               <div className={`${editingId ? 'bg-amber-500' : 'bg-emerald-500'} p-1.5 rounded-lg transition-colors`}>
                  <Users className="w-4 h-4" />
               </div>
               <div className="text-[10px] font-black uppercase tracking-widest opacity-60">
                 Clearing ₹{totalSettlement} from Dues
               </div>
             </div>
             <div className="text-[9px] font-bold text-gray-400 ml-1">
               ₹{totalPaymentAmount} Collection + ₹{totalDiscountAmount} Waived
             </div>
           </div>
           <div className={`text-3xl font-black italic tracking-tighter ${editingId ? 'text-amber-400' : 'text-emerald-400'}`}>₹{totalPaymentAmount}</div>
        </div>

        <button 
          type="submit"
          disabled={!primaryPayerId || (totalPaymentAmount <= 0 && totalDiscountAmount <= 0)}
          className={`w-full py-6 rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 ${
            !primaryPayerId || (totalPaymentAmount <= 0 && totalDiscountAmount <= 0)
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : editingId
                ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95 shadow-amber-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-100'
          }`}
        >
          {editingId ? <Edit3 className="w-6 h-6" /> : <Check className="w-6 h-6" />}
          {editingId ? 'Save Changes' : 'Confirm Payment'}
        </button>
      </form>

      <section className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h3 className="font-black text-lg text-gray-900 mb-5">Recent Transactions</h3>
        <div className="space-y-5">
          {payments.slice(0, 15).map(p => {
            const payerName = players.find(pl => pl.id === p.primaryPayerId)?.name || 'Unknown';
            const totalDisc = p.allocations.reduce((s, a) => s + (a.discount || 0), 0);
            
            return (
              <div key={p.id} className={`flex justify-between items-center group p-2 rounded-2xl transition-colors ${editingId === p.id ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${p.mode === PaymentMode.ONLINE ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {p.mode === PaymentMode.ONLINE ? 'GP' : 'CA'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm leading-tight">
                      {payerName} {p.allocations.length > 1 && <span className="text-emerald-600 font-medium text-[10px]"> + {p.allocations.length - 1} more</span>}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">{p.date} • {p.mode}</div>
                    {totalDisc > 0 && <div className="text-[9px] text-amber-600 font-bold italic">₹{totalDisc} Waived</div>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-base font-black text-emerald-600 tracking-tight">₹{p.totalAmount}</div>
                    {p.notes && <div className="text-[8px] text-gray-400 font-bold uppercase">{p.notes}</div>}
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => handleEdit(p)}
                      className="p-2 bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-600 rounded-xl transition-all"
                      title="Edit Payment"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {payments.length === 0 && (
             <div className="py-10 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-50 rounded-3xl">
               No payments recorded yet.
             </div>
          )}
        </div>
      </section>
    </div>
  );
};
