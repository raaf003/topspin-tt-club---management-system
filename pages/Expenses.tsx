
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-gray-800 p-2 rounded-xl">
            <ShoppingBag className="text-white w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold">Club Expenses</h2>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-gray-800 text-white p-2 rounded-xl"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Amount (₹)</label>
            <input 
              type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-xl font-bold outline-none" 
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
              <select 
                value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none"
              >
                {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Paid Via</label>
              <select 
                value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none"
              >
                {Object.values(PaymentMode).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Notes</label>
            <input 
              type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Electricity bill Jan"
              className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold">Save Expense</button>
        </form>
      )}

      <div className="space-y-3">
        {expenses.map(ex => (
          <div key={ex.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900">{ex.category}</div>
                <div className="text-xs text-gray-400">{ex.date} • {ex.mode}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-rose-600">- ₹{ex.amount}</div>
              {ex.notes && <div className="text-[10px] text-gray-400">{ex.notes}</div>}
            </div>
          </div>
        ))}
        {expenses.length === 0 && (
          <div className="text-center py-12 text-gray-400 italic">No expenses recorded yet.</div>
        )}
      </div>
    </div>
  );
};
