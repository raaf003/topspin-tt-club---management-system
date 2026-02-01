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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic tracking-tight flex items-center gap-3 dark:text-white">
            <History className="text-indigo-600 dark:text-indigo-400 w-8 h-8" />
            Financial Audit
          </h2>
          <button 
            onClick={exportCSV}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 uppercase tracking-widest active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>

        {/* Audit Filter Controls */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
           <div className="flex flex-wrap gap-2">
             {[
               { id: 'today', label: 'Today' },
               { id: 'month', label: 'This Month' },
               { id: 'all', label: 'Lifetime' },
               { id: 'custom', label: 'Custom Range' }
             ].map(opt => (
               <button
                 key={opt.id}
                 onClick={() => setReportRange(opt.id as any)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${reportRange === opt.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
               >
                 {opt.label}
               </button>
             ))}
           </div>

           {reportRange === 'custom' && (
             <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="flex-1 space-y-1">
                 <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">Start Date</label>
                 <input 
                   type="date" 
                   value={startDate} 
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-slate-800 border-none p-3 rounded-xl text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-slate-700 dark:text-white transition-all"
                 />
               </div>
               <ChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 mt-4" />
               <div className="flex-1 space-y-1">
                 <label className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest pl-1">End Date</label>
                 <input 
                   type="date" 
                   value={endDate} 
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-full bg-gray-50 dark:bg-slate-800 border-none p-3 rounded-xl text-xs font-bold outline-none ring-1 ring-gray-100 dark:ring-slate-700 dark:text-white transition-all"
                 />
               </div>
             </div>
           )}
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-widest">
              <Calendar className="w-4 h-4" /> Selected Period
            </div>
            <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full uppercase transition-colors">
              {reportRange}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest">Net Revenue</div>
              <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter italic transition-colors">₹{summary.netRevenue}</div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">{summary.matchCount} Matches Logged</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest">Total Expenses</div>
              <div className="text-3xl font-black text-rose-500 dark:text-rose-400 tracking-tighter italic transition-colors">₹{summary.expenseTotal}</div>
            </div>
          </div>
          <div className="pt-5 border-t border-gray-50 dark:border-slate-800 space-y-4">
             <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest text-center">Collection Breakdown</div>
             <div className="flex items-center justify-around">
               <div className="text-center">
                 <div className="text-xl font-black text-gray-900 dark:text-white italic transition-colors">₹{summary.collectedCash}</div>
                 <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">Cash In</div>
               </div>
               <div className="h-10 w-px bg-gray-100 dark:bg-slate-800 transition-colors"></div>
               <div className="text-center">
                 <div className="text-xl font-black text-gray-900 dark:text-white italic transition-colors">₹{summary.collectedOnline}</div>
                 <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest">Online In</div>
               </div>
             </div>
             <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-2xl space-y-2 border border-gray-100 dark:border-slate-700 transition-colors">
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-gray-400 dark:text-slate-500 uppercase">Gross Match Value</span>
                  <span className="text-xs font-black text-gray-600 dark:text-slate-400 transition-colors">₹{summary.grossRevenue}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase">Discounts/Waivers</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-500 transition-colors">-₹{summary.discountTotal}</span>
               </div>
             </div>
          </div>
        </div>

        <div className="bg-indigo-600 dark:bg-indigo-700 p-8 rounded-[2.5rem] text-white space-y-4 relative overflow-hidden shadow-2xl shadow-indigo-100 dark:shadow-none group transition-all">
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <IndianRupee className="absolute right-4 bottom-4 w-32 h-32 opacity-10 rotate-12" />
          <div className="text-indigo-200 dark:text-indigo-300 font-black uppercase text-[10px] tracking-[0.3em]">Net Cash Flow</div>
          <div className="text-6xl font-black tracking-tighter italic">₹{summary.netCashFlow}</div>
          <div className="text-xs font-bold opacity-70 leading-relaxed max-w-[200px]">
            Actual liquid cash available from collections after deducting physical expenses.
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="font-black text-gray-900 dark:text-white mb-8 flex items-center gap-2 uppercase text-xs tracking-widest">
            <Target className="w-4 h-4 text-orange-500" /> Active Players (Period) Top 10 by Games Played
          </h3>
          <div className="h-64">
            {topPlayersByGames.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPlayersByGames} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} fontSize={11} stroke="#94a3b8" fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                      fontWeight: 'bold',
                      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                      color: isDarkMode ? '#f1f5f9' : '#0f172a'
                    }}
                    itemStyle={{
                      color: isDarkMode ? '#f1f5f9' : '#0f172a'
                    }}
                    cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f8fafc', radius: 8 }} 
                  />
                  <Bar dataKey="games" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 dark:text-slate-700 italic font-bold text-sm">No match data for this range.</div>
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <h3 className="font-black text-gray-900 dark:text-white mb-8 flex items-center gap-2 uppercase text-xs tracking-widest">
            <TrendingDown className="w-4 h-4 text-rose-500" /> Current Debt List of Top 15 Players
          </h3>
          <div className="space-y-4">
            {players
              .map(p => ({ name: p.name, due: getPlayerStats(p.id).pending }))
              .filter(p => p.due > 0)
              .sort((a, b) => b.due - a.due)
              .slice(0, 15)
              .map((p, i) => (
                <div key={i} className="flex items-center justify-between group p-2 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-2xl transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 flex items-center justify-center font-black text-xs text-gray-400 dark:text-slate-500 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors shadow-inner">
                      {i+1}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white tracking-tight">{p.name}</span>
                  </div>
                  <span className="font-black text-rose-500 dark:text-rose-400 text-lg italic transition-colors">₹{p.due}</span>
                </div>
              ))}
            {players.every(p => getPlayerStats(p.id).pending <= 0) && (
              <div className="py-10 text-center text-emerald-500 dark:text-emerald-400 font-black italic">Everyone is clear! 🥂</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
