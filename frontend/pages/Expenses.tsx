
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, PaymentMode, Expense, UserRole } from '../types';
import { ShoppingBag, Plus, Calendar, Edit2, PieChart as PieChartIcon, ChevronUp, Filter, IndianRupee, Search, ChevronLeft, ChevronRight, X, Tag, CreditCard, Banknote } from 'lucide-react';
import { getLocalTodayStr, getMonthName } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e', '#84cc16'];

const CATEGORY_COLORS: Record<string, string> = {
  RENT: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  SALARY: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  ELECTRICITY: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  WATER: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  EQUIPMENT: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  BATS: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  BALLS: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  MAINTENANCE: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  MARKETING: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  INTERNET: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  CLEANING: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  TOURNAMENT: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  REFRESHMENTS: 'bg-lime-50 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400',
  OFFICE: 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400',
  OTHER: 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400',
};

export const Expenses: React.FC = () => {
  const { expenses, addExpense, updateExpense, currentUser } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canManageExpenses = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN;

  // Form State
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHER);
  const [mode, setMode] = useState<PaymentMode>(PaymentMode.CASH);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalTodayStr());

  // Filter & Search State
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const usersList = useMemo(() => {
    const users = new Set<string>();
    expenses.forEach(ex => {
      if (ex.recordedBy?.name) users.add(ex.recordedBy.name);
    });
    return Array.from(users).sort();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return expenses.filter(ex => {
      const exDate = new Date(ex.date);
      const matchesMonth = selectedMonth === 'all' || exDate.getMonth() === selectedMonth;
      const matchesYear = exDate.getFullYear() === selectedYear;
      const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
      const matchesUser = selectedUser === 'all' || ex.recordedBy?.name === selectedUser;
      const matchesSearch = !query ||
        ex.category.toLowerCase().includes(query) ||
        (ex.description && ex.description.toLowerCase().includes(query)) ||
        ex.amount.toString().includes(query) ||
        (ex.recordedBy?.name?.toLowerCase().includes(query));
      return matchesMonth && matchesYear && matchesCategory && matchesUser && matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.recordedAt - a.recordedAt);
  }, [expenses, selectedMonth, selectedYear, selectedCategory, selectedUser, searchQuery]);

  const totalFilteredAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);
  }, [filteredExpenses]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, selectedCategory, selectedUser, searchQuery, itemsPerPage]);

  const chartData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(ex => {
      categories[ex.category] = (categories[ex.category] || 0) + ex.amount;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const handleEdit = (expense: Expense) => {
    if (!canManageExpenses) return;
    setEditingId(expense.id);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setMode(expense.mode);
    setDescription(expense.description || '');
    setDate(expense.date);
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setAmount('');
    setCategory(ExpenseCategory.OTHER);
    setMode(PaymentMode.CASH);
    setDescription('');
    setDate(getLocalTodayStr());
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !canManageExpenses) return;

    const expenseData = {
      amount: parseFloat(amount),
      category,
      mode,
      description,
      date,
      recordedBy: {
        role: currentUser.role,
        name: currentUser.name
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

  const hasActiveFilters = selectedCategory !== 'all' || selectedUser !== 'all' || searchQuery.trim() !== '';

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2 md:gap-3">
          <div className={`${editingId ? 'bg-amber-500' : 'bg-gray-800 dark:bg-slate-800'} p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all`}>
            {editingId ? <Edit2 className="text-white w-5 h-5 md:w-6 md:h-6" /> : <ShoppingBag className="text-white w-5 h-5 md:w-6 md:h-6" />}
          </div>
          <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tight dark:text-white transition-all">
            {editingId ? 'Edit Expense' : 'Club Expenses'}
          </h2>
        </div>
        <div className="flex gap-2">
          {editingId && (
            <button
              onClick={resetForm}
              className="text-[9px] md:text-xs font-bold uppercase flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          )}
          {canManageExpenses && (
            <button
              onClick={() => { if (showAdd && !editingId) resetForm(); else if (!editingId) setShowAdd(true); }}
              title={showAdd && !editingId ? 'Close form' : 'Add new expense'}
              className="bg-gray-800 dark:bg-slate-800 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl active:scale-95 transition-all"
            >
              {showAdd && !editingId ? <X className="w-5 h-5 md:w-6 md:h-6" /> : <Plus className="w-5 h-5 md:w-6 md:h-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAdd && (
        <form
          onSubmit={handleSubmit}
          className={`bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 shadow-xl space-y-4 transition-all animate-in zoom-in-95 duration-200 ${editingId ? 'border-amber-200 dark:border-amber-800 ring-2 ring-amber-100 dark:ring-amber-900/20' : 'border-indigo-500/20 dark:border-indigo-500/30'}`}
        >
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label htmlFor="amount" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Amount (₹)</label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 md:p-4 rounded-xl text-lg md:text-xl font-bold outline-none dark:text-white transition-all shadow-inner focus:ring-2 ring-indigo-500/20"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="expenseDate" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Date</label>
              <input
                id="expenseDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 md:p-4 rounded-xl text-sm md:text-base outline-none dark:text-white transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(ExpenseCategory).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-2.5 rounded-xl text-[10px] md:text-xs font-bold transition-all border-2 ${
                    category === cat
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none scale-[1.02]'
                      : 'bg-gray-50 dark:bg-slate-800 border-transparent text-gray-600 dark:text-gray-400 hover:border-indigo-200 dark:hover:border-slate-600'
                  }`}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1">
              <label htmlFor="paymentMode" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Payment Via</label>
              <select
                id="paymentMode"
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                title="Select payment mode"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl outline-none dark:text-white transition-all text-xs md:text-sm font-bold"
              >
                {Object.values(PaymentMode).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="description" className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Description</label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Electricity bill for Jan"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-3 rounded-xl outline-none dark:text-white transition-all text-sm focus:ring-2 ring-indigo-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-3.5 md:py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all text-sm md:text-base text-white ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100 dark:shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'}`}
          >
            {editingId ? 'Update Expense' : 'Save Expense'}
          </button>
        </form>
      )}

      {/* Summary Card & Pie Chart */}
      {filteredExpenses.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 flex justify-between items-center border-b border-gray-50 dark:border-slate-800">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Period Total</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <IndianRupee className="w-5 h-5" strokeWidth={3} />
                {totalFilteredAmount.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => setShowChart(!showChart)}
              title={showChart ? 'Hide chart' : 'Show breakdown chart'}
              className="p-2 rounded-xl text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
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
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      <section className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-3xl md:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 md:space-y-5 transition-all">
        {/* Section Header */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-base md:text-lg text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
              Expense History
            </h3>
            {/* Year + Month pickers inline in header */}
            <div className="flex items-center gap-1.5">
              <div className="bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-700">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  title="Select month"
                  className="bg-transparent text-[10px] md:text-xs font-bold outline-none text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  <option value="all">All</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{getMonthName(i)}</option>
                  ))}
                </select>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-700">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  title="Select year"
                  className="bg-transparent text-[10px] md:text-xs font-bold outline-none text-indigo-600 dark:text-indigo-400 cursor-pointer"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by category, description, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border-none pl-9 md:pl-12 pr-8 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-slate-700 focus:ring-indigo-300 dark:focus:ring-indigo-800 transition-all text-gray-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 flex-1">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Tag className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  title="Filter by category"
                  aria-label="Filter by category"
                  className="bg-gray-50 dark:bg-slate-800 border-none text-[9px] md:text-[10px] font-black text-indigo-600 dark:text-indigo-400 rounded-lg px-1.5 md:px-2 py-1 outline-none ring-1 ring-gray-100 dark:ring-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <option value="all">All Categories</option>
                  {Object.values(ExpenseCategory).map(cat => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Recorded By Filter */}
              {usersList.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-400" />
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    title="Filter by user"
                    aria-label="Filter by user"
                    className="bg-gray-50 dark:bg-slate-800 border-none text-[9px] md:text-[10px] font-black text-indigo-600 dark:text-indigo-400 rounded-lg px-1.5 md:px-2 py-1 outline-none ring-1 ring-gray-100 dark:ring-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <option value="all">All Users</option>
                    {usersList.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              )}

              {/* Show X items */}
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-tighter">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  title="Items per page"
                  aria-label="Items per page"
                  className="bg-gray-50 dark:bg-slate-800 border-none text-[9px] md:text-[10px] font-black text-indigo-600 dark:text-indigo-400 rounded-lg px-1.5 md:px-2 py-1 outline-none ring-1 ring-gray-100 dark:ring-slate-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Total Count Badge */}
            <div className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-tighter shrink-0 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-gray-100 dark:border-slate-700">
              Total: <span className="text-indigo-600 dark:text-indigo-400">{filteredExpenses.length}</span>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  {selectedCategory.replace(/_/g, ' ')}
                  <button onClick={() => setSelectedCategory('all')}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
              {selectedUser !== 'all' && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  By {selectedUser}
                  <button onClick={() => setSelectedUser('all')}><X className="w-2.5 h-2.5" /></button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expense Cards */}
        <div className="space-y-2 md:space-y-3">
          {paginatedExpenses.length > 0 ? (
            paginatedExpenses.map(ex => (
              <div
                key={ex.id}
                className="flex flex-col group p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: mode icon + category + meta */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-lg md:rounded-2xl flex flex-col items-center justify-center font-black text-[8px] md:text-[10px] ${ex.mode === PaymentMode.ONLINE ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                      {ex.mode === PaymentMode.ONLINE
                        ? <CreditCard className="w-3.5 h-3.5 md:w-4 md:h-4 mb-0.5" />
                        : <Banknote className="w-3.5 h-3.5 md:w-4 md:h-4 mb-0.5" />
                      }
                      {ex.mode === PaymentMode.ONLINE ? 'ONLINE' : 'CASH'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] md:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.OTHER}`}>
                          {ex.category.replace(/_/g, ' ')}
                        </span>
                        {canManageExpenses && (
                          <button
                            onClick={() => handleEdit(ex)}
                            title="Edit expense"
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-indigo-500 dark:text-slate-600 dark:hover:text-indigo-400 transition-all rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-[9px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase mt-0.5 flex flex-wrap items-center gap-1 md:gap-2">
                        <span>{ex.date}</span>
                        {ex.recordedBy?.name && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-slate-600 shrink-0"></span>
                            <span>By {ex.recordedBy.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Right: amount */}
                  <div className="text-right shrink-0">
                    <div className="text-base md:text-lg font-black text-rose-600 dark:text-rose-400 tracking-tight">
                      - ₹{ex.amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Description row — full width, shown when present */}
                {ex.description && (
                  <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800 flex items-start gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest shrink-0 pt-px">Note:</span>
                    <span className="text-[10px] md:text-xs text-gray-600 dark:text-slate-300 font-medium italic leading-tight">{ex.description}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-10 md:py-12 text-center text-gray-300 dark:text-slate-700 font-bold italic border-2 border-dashed border-gray-50 dark:border-slate-800 rounded-2xl md:rounded-3xl text-xs md:text-sm">
              No expenses found{hasActiveFilters || selectedMonth !== 'all' ? ' for the selected filters.' : '.'}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-3 md:pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase text-gray-500 dark:text-slate-400 transition-all hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" /> Prev
              </button>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl border border-gray-100 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-[9px] md:text-[10px] font-black uppercase text-gray-500 dark:text-slate-400 transition-all hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Next <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
