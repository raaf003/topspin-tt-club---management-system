
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, PaymentMode } from '../types';
import { ShoppingBag, Plus, Trash2, Calendar } from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, addExpense } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [mode, setMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    addExpense({
      amount: parseFloat(amount),
      category,
      mode,
      notes,
      date: new Date().toISOString().split('T')[0]
    });
    setAmount('');
    setNotes('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-gray-800 dark:bg-slate-800 p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <ShoppingBag className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold dark:text-white transition-all">Club Expenses</h2>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          title="Add new expense"
          className="bg-gray-800 dark:bg-slate-800 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-200 dark:border-slate-800 shadow-lg space-y-3 md:space-y-4 transition-all">
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Amount (₹)</label>
            <input 
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 md:p-4 rounded-xl text-lg md:text-xl font-bold outline-none dark:text-white transition-all shadow-inner" 
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Category</label>
              <select 
                value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                title="Select expense category"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm font-bold"
              >
                {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Via</label>
              <select 
                value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}
                title="Select payment mode"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm font-bold"
              >
                {Object.values(PaymentMode).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Notes</label>
            <input 
              type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Electricity bill"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm"
            />
          </div>
          <button type="submit" className="w-full bg-gray-900 dark:bg-indigo-600 text-white py-3.5 md:py-4 rounded-xl font-bold shadow-lg shadow-gray-200 dark:shadow-none active:scale-95 transition-all text-sm md:text-base">Save Expense</button>
        </form>
      )}

      <div className="space-y-2 md:space-y-3">
        {expenses.map(ex => (
          <div key={ex.id} className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-800 flex justify-between items-center shadow-sm transition-all">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-500 transition-all shrink-0">
                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-xs md:text-sm">{ex.category}</div>
                <div className="text-[10px] md:text-xs text-gray-400 dark:text-slate-500">{ex.date} • {ex.mode}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base md:text-lg font-bold text-rose-600 dark:text-rose-400">- ₹{ex.amount}</div>
              {ex.notes && <div className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[100px] md:max-w-none">{ex.notes}</div>}
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="text-center py-10 md:py-12 text-gray-400 dark:text-slate-700 italic border-2 border-dashed border-gray-50 dark:border-slate-800 rounded-xl md:rounded-2xl text-xs md:text-sm transition-all">No expenses yet.</div>
        )}
      </div>
    </div>
  );
};
