
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, PaymentMode, Expense } from '../types';
import { ShoppingBag, Plus, Trash2, Calendar, Edit2, PieChart as PieChartIcon, ChevronDown, ChevronUp, Filter, IndianRupee } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const ADMINS = ['Partner 1', 'Partner 2', 'Partner 3'];
const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

export const Expenses: React.FC = () => {
  const { expenses, addExpense, updateExpense, currentUser } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [mode, setMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminName, setAdminName] = useState(currentUser.name);

  // Filter State - Default to current month
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(lastDayOfMonth);
  const [showFilters, setShowFilters] = useState(false);
  const [showChart, setShowChart] = useState(true);

  // Update adminName if currentUser changes
  useEffect(() => {
    if (!editingId) setAdminName(currentUser.name);
  }, [currentUser.name, editingId]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(ex => ex.date >= startDate && ex.date <= endDate)
                   .sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt - a.recordedAt);
  }, [expenses, startDate, endDate]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(ex => {
      categories[ex.category] = (categories[ex.category] || 0) + ex.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);
  }, [filteredExpenses]);

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setMode(expense.mode);
    setNotes(expense.notes || '');
    setDate(expense.date);
    setAdminName(expense.recordedBy?.name || currentUser.name);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setAmount('');
    setCategory(ExpenseCategory.OTHER);
    setMode(PaymentMode.CASH);
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setAdminName(currentUser.name);
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    const expenseData = {
      amount: parseFloat(amount),
      category,
      mode,
      notes,
      date,
      recordedBy: {
        role: currentUser.role,
        name: adminName
      },
      recordedAt: Date.now()
    };

    if (editingId) {
      updateExpense(editingId, expenseData);
    } else {
      addExpense(expenseData);
    }
    resetForm();
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-gray-800 dark:bg-slate-800 p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <ShoppingBag className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tight dark:text-white transition-all">Club Expenses</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
            className={`p-1.5 md:p-2 rounded-lg md:rounded-xl active:scale-95 transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}
          >
            <Filter className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <button 
            onClick={() => { if(showAdd) resetForm(); else setShowAdd(true); }}
            title="Add new expense"
            className="bg-gray-800 dark:bg-slate-800 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl active:scale-95 transition-all"
          >
            {showAdd ? <ChevronDown className="w-5 h-5 md:w-6 md:h-6" /> : <Plus className="w-5 h-5 md:w-6 md:h-6" />}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="startDate" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">From</label>
              <input 
                id="startDate"
                type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                title="Filter start date"
                className="w-full bg-gray-50 dark:bg-slate-800 border-none p-2.5 rounded-xl text-xs font-bold dark:text-white outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="endDate" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">To</label>
              <input 
                id="endDate"
                type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                title="Filter end date"
                className="w-full bg-gray-50 dark:bg-slate-800 border-none p-2.5 rounded-xl text-xs font-bold dark:text-white outline-none" 
              />
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-indigo-500/20 dark:border-indigo-500/30 shadow-xl space-y-3 md:space-y-4 transition-all animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {editingId ? <Edit2 className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
              {editingId ? 'Edit' : 'New'} Expense
            </h3>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Cancel</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label htmlFor="amount" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Amount (₹)</label>
              <input 
                id="amount"
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 md:p-4 rounded-xl text-lg md:text-xl font-bold outline-none dark:text-white transition-all shadow-inner focus:ring-2 ring-indigo-500/20" 
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="expenseDate" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Date</label>
              <input 
                id="expenseDate"
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 md:p-4 rounded-xl text-sm md:text-base outline-none dark:text-white transition-all" 
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label htmlFor="category" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Category</label>
              <select 
                id="category"
                value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                title="Select expense category"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm font-bold"
              >
                {Object.values(ExpenseCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="paymentMode" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Via</label>
              <select 
                id="paymentMode"
                value={mode} onChange={(e) => setMode(e.target.value as PaymentMode)}
                title="Select payment mode"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm font-bold"
              >
                {Object.values(PaymentMode).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label htmlFor="recordedBy" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Recorded By</label>
              <select 
                id="recordedBy"
                value={adminName} onChange={(e) => setAdminName(e.target.value)}
                title="Administrator recording the expense"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm font-bold"
              >
                {ADMINS.map(admin => <option key={admin} value={admin}>{admin}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="notes" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Notes</label>
              <input 
                id="notes"
                type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Electricity bill"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2.5 md:p-3 rounded-lg md:rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 md:py-4 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none active:scale-[0.98] transition-all text-sm md:text-base">
            {editingId ? 'Update Expense' : 'Save Expense'}
          </button>
        </form>
      )}

      {/* Summary card & Pie Chart */}
      {filteredExpenses.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-gray-50 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Selected Period Total</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <IndianRupee className="w-5 h-5" strokeWidth={3} />
                {totalFilteredAmount.toLocaleString()}
              </div>
            </div>
            <button 
              onClick={() => setShowChart(!showChart)}
              title={showChart ? "Hide chart" : "Show chart"}
              className="text-gray-400 hover:text-indigo-500 transition-colors"
            >
              {showChart ? <ChevronUp className="w-5 h-5" /> : <PieChartIcon className="w-5 h-5" />}
            </button>
          </div>
          
          {showChart && chartData.length > 0 && (
            <div className="h-64 px-2 py-4 animate-in fade-in duration-500">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 md:space-y-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mt-6">Expense History ({filteredExpenses.length})</h3>
        {filteredExpenses.map(ex => (
          <div key={ex.id} className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-800 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center gap-2.5 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 dark:text-slate-500 transition-all shrink-0">
                <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-white text-xs md:text-sm flex items-center gap-2">
                  {ex.category}
                  <button 
                    onClick={() => handleEdit(ex)}
                    title="Edit expense"
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-indigo-500 transition-all"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-[10px] md:text-xs text-gray-400 dark:text-slate-500">
                  {ex.date} • {ex.mode}
                  {ex.recordedBy && <span className="ml-1 opacity-75 hidden md:inline"> • By {ex.recordedBy.name}</span>}
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-base md:text-lg font-black text-rose-600 dark:text-rose-400">- ₹{ex.amount}</div>
              {ex.notes && <div className="text-[8px] md:text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[80px] md:max-w-[150px]">{ex.notes}</div>}
            </div>
          </div>
        ))}
        {filteredExpenses.length === 0 && (
          <div className="text-center py-10 md:py-12 text-gray-400 dark:text-slate-700 italic border-2 border-dashed border-gray-50 dark:border-slate-800 rounded-xl md:rounded-2xl text-xs md:text-sm transition-all">No expenses found for this period.</div>
        )}
      </div>
    </div>
  );
};
