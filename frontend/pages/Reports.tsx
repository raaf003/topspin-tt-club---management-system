import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart as ReChartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Download, Calendar, IndianRupee, TrendingDown, Target, Filter, ChevronRight, History, Percent } from 'lucide-react';

export const Reports: React.FC = () => {
  const { players, matches, payments, expenses, getPlayerStats, isDarkMode } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Period Selection
  const [reportRange, setReportRange] = useState<'today' | 'month' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const filteredMatches = useMemo(() => {
    if (reportRange === 'today') return matches.filter(m => m.date === todayStr);
    if (reportRange === 'month') return matches.filter(m => m.date.startsWith(thisMonthStr));
    if (reportRange === 'all') return matches;
    return matches.filter(m => m.date >= startDate && m.date <= endDate);
  }, [matches, reportRange, startDate, endDate, todayStr, thisMonthStr]);

  const filteredPayments = useMemo(() => {
    if (reportRange === 'today') return payments.filter(p => p.date === todayStr);
    if (reportRange === 'month') return payments.filter(p => p.date.startsWith(thisMonthStr));
    if (reportRange === 'all') return payments;
    return payments.filter(p => p.date >= startDate && p.date <= endDate);
  }, [payments, reportRange, startDate, endDate, todayStr, thisMonthStr]);

  const filteredExpenses = useMemo(() => {
    if (reportRange === 'today') return expenses.filter(e => e.date === todayStr);
    if (reportRange === 'month') return expenses.filter(e => e.date.startsWith(thisMonthStr));
    if (reportRange === 'all') return expenses;
    return expenses.filter(e => e.date >= startDate && e.date <= endDate);
  }, [expenses, reportRange, startDate, endDate, todayStr, thisMonthStr]);

  const summary = useMemo(() => {
    const grossRevenue = filteredMatches.reduce((sum, m) => sum + m.totalValue, 0);
    const collectedCash = filteredPayments.filter(p => p.mode === 'CASH').reduce((sum, p) => sum + p.totalAmount, 0);
    const collectedOnline = filteredPayments.filter(p => p.mode === 'ONLINE').reduce((sum, p) => sum + p.totalAmount, 0);
    const expenseTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const discountTotal = filteredPayments.reduce((sum, p) => {
      const pDisc = p.allocations.reduce((s, a) => s + (a.discount || 0), 0);
      return sum + pDisc;
    }, 0);

    return {
      grossRevenue,
      netRevenue: grossRevenue - discountTotal,
      collectedTotal: collectedCash + collectedOnline,
      collectedCash,
      collectedOnline,
      expenseTotal,
      discountTotal,
      netCashFlow: (collectedCash + collectedOnline) - expenseTotal,
      matchCount: filteredMatches.length
    };
  }, [filteredMatches, filteredPayments, filteredExpenses]);

  const topPlayersByGames = useMemo(() => {
    return players
      .map(p => {
        const periodGames = matches.filter(m => 
          (m.playerAId === p.id || m.playerBId === p.id) && 
          filteredMatches.some(fm => fm.id === m.id)
        ).length;
        return { name: p.name, games: periodGames };
      })
      .filter(p => p.games > 0)
      .sort((a, b) => b.games - a.games)
      .slice(0, 10);
  }, [players, matches, filteredMatches]);

  const exportCSV = () => {
    const data = players.map(p => {
      const stats = getPlayerStats(p.id);
      return `"${p.name}","${p.nickname || ''}",${stats.games},${stats.totalSpent},${stats.totalPaid},${stats.totalDiscounted},${stats.pending}`;
    });
    const header = "Name,Nickname,Games Played,Lifetime Value,Total Paid,Total Discounted,Current Pending\n";
    const blob = new Blob([header + data.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `TopSpin_Report_${reportRange}_${todayStr}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <div className="flex flex-col gap-3 md:gap-4 px-1">
        <div className="flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-black italic tracking-tight flex items-center gap-2 md:gap-3 dark:text-white transition-all">
            <History className="text-indigo-600 dark:text-indigo-400 w-6 h-6 md:w-8 md:h-8" />
            Financial Audit
          </h2>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-1.5 md:gap-2 bg-indigo-600 text-white px-3.5 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 uppercase tracking-widest active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" /> CSV
          </button>
        </div>

        {/* Audit Filter Controls */}
        <div className="bg-white dark:bg-slate-900 p-3 md:p-4 rounded-2xl md:rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-3 md:space-y-4 transition-all">
           <div className="flex flex-wrap gap-1.5 md:gap-2">
             {[
               { id: 'today', label: 'Today' },
               { id: 'month', label: 'Month' },
               { id: 'all', label: 'Lifetime' },
               { id: 'custom', label: 'Range' }
             ].map(opt => (
               <button
                 key={opt.id}
                 onClick={() => setReportRange(opt.id as any)}
                 className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all ${reportRange === opt.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
               >
                 {opt.label}
               </button>
             ))}
           </div>

           {reportRange === 'custom' && (
             <div className="flex items-center gap-2 md:gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="flex-1 space-y-1">
                 <label className="text-[8px] md:text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Start</label>
                 <input 
                   type="date" 
                   value={startDate} 
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-slate-800 border-none p-2 md:p-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-slate-700 dark:text-white transition-all"
                 />
               </div>
               <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-gray-300 dark:text-slate-600 mt-4" />
               <div className="flex-1 space-y-1">
                 <label className="text-[8px] md:text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">End</label>
                 <input 
                   type="date" 
                   value={endDate} 
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-slate-800 border-none p-2 md:p-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-slate-700 dark:text-white transition-all"
                 />
               </div>
             </div>
           )}
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 px-1">
        <div className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 md:space-y-5 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 md:gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" /> Period
            </div>
            <span className="text-[8px] md:text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase transition-all">
              {reportRange}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1">
              <div className="text-[9px] md:text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest">Net Revenue</div>
              <div className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic transition-all">₹{summary.netRevenue}</div>
              <div className="text-[9px] md:text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">{summary.matchCount} Matches</div>
            </div>
            <div className="space-y-1">
              <div className="text-[9px] md:text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest">Total Expenses</div>
              <div className="text-2xl md:text-3xl font-black text-rose-500 dark:text-rose-400 tracking-tighter italic transition-all">₹{summary.expenseTotal}</div>
            </div>
          </div>
          <div className="pt-4 md:pt-5 border-t border-gray-50 dark:border-slate-800 space-y-3 md:space-y-4">
             <div className="text-[9px] md:text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest text-center">Collection Breakdown</div>
             <div className="flex items-center justify-around">
               <div className="text-center">
                 <div className="text-lg md:text-xl font-black text-gray-900 dark:text-white italic transition-all">₹{summary.collectedCash}</div>
                 <div className="text-[8px] md:text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Cash</div>
               </div>
               <div className="h-8 md:h-10 w-px bg-gray-100 dark:bg-slate-800 transition-colors"></div>
               <div className="text-center">
                 <div className="text-lg md:text-xl font-black text-gray-900 dark:text-white italic transition-all">₹{summary.collectedOnline}</div>
                 <div className="text-[8px] md:text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Online</div>
               </div>
             </div>
             <div className="bg-gray-50 dark:bg-slate-800 p-2.5 md:p-3 rounded-xl md:rounded-2xl space-y-1.5 md:space-y-2 border border-gray-100 dark:border-slate-700 transition-all">
               <div className="flex justify-between items-center">
                  <span className="text-[8px] md:text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase">Gross Match Value</span>
                  <span className="text-[10px] md:text-xs font-black text-gray-600 dark:text-slate-400 transition-colors">₹{summary.grossRevenue}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[8px] md:text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase">Discounts/Waivers</span>
                  <span className="text-[10px] md:text-xs font-black text-amber-600 dark:text-amber-500 transition-colors">-₹{summary.discountTotal}</span>
               </div>
             </div>
          </div>
        </div>

        <div className="bg-indigo-600 dark:bg-indigo-700 p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] text-white space-y-3 md:space-y-4 relative overflow-hidden shadow-2xl shadow-indigo-100 dark:shadow-none group transition-all">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 md:w-48 md:h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <IndianRupee className="absolute right-4 bottom-4 w-24 h-24 md:w-32 md:h-32 opacity-10 rotate-12" />
          <div className="text-indigo-200 dark:text-indigo-300 font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em]">Net Cash Flow</div>
          <div className="text-4xl md:text-6xl font-black tracking-tighter italic transition-all">₹{summary.netCashFlow}</div>
          <div className="text-[10px] md:text-xs font-bold opacity-70 leading-relaxed max-w-[180px] md:max-w-[200px]">
            Actual liquid cash available from collections after deducting physical expenses.
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 px-1">
        <section className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all">
          <h3 className="font-black text-gray-900 dark:text-white mb-6 md:mb-8 flex items-center gap-2 uppercase text-[10px] md:text-xs tracking-widest">
            <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500" /> Active Players
          </h3>
          <div className="h-56 md:h-64">
            {topPlayersByGames.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPlayersByGames} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} fontSize={10} stroke="#94a3b8" fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                      fontWeight: 'bold',
                      fontSize: '11px',
                      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                      color: isDarkMode ? '#f1f5f9' : '#0f172a'
                    }}
                    itemStyle={{
                      color: isDarkMode ? '#f1f5f9' : '#0f172a'
                    }}
                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc', radius: 8 }} 
                  />
                  <Bar dataKey="games" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 dark:text-slate-700 italic font-bold text-xs md:text-sm">No data.</div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-all">
          <h3 className="font-black text-gray-900 dark:text-white mb-6 md:mb-8 flex items-center gap-2 uppercase text-[10px] md:text-xs tracking-widest">
            <TrendingDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-500" /> Debt List (Top 15)
          </h3>
          <div className="space-y-3 md:space-y-4">
            {players
              .map(p => ({ name: p.name, due: getPlayerStats(p.id).pending }))
              .filter(p => p.due > 0)
              .sort((a, b) => b.due - a.due)
              .slice(0, 15)
              .map((p, i) => (
                <div key={i} className="flex items-center justify-between group p-1.5 md:p-2 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl md:rounded-2xl transition-all">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gray-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 flex items-center justify-center font-black text-[10px] md:text-xs text-gray-400 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors shadow-inner shrink-0">
                      {i+1}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white tracking-tight text-xs md:text-sm truncate">{p.name}</span>
                  </div>
                  <span className="font-black text-rose-500 dark:text-rose-400 text-base md:text-lg italic transition-all shrink-0 ml-2">₹{p.due}</span>
                </div>
              ))}
            {players.every(p => getPlayerStats(p.id).pending <= 0) && (
              <div className="py-10 text-center text-emerald-500 font-black italic text-sm md:text-base">Everyone is clear! 🥂</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
