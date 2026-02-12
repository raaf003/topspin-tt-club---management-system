
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Trophy, 
  IndianRupee, 
  Users, 
  PieChart, 
  ShoppingBag,
  ShieldCheck,
  UserCircle,
  Moon,
  Sun,
  Monitor,
  LayoutDashboard,
  Zap,
  Table as TableIcon,
  LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, isDarkMode, themeMode, setThemeMode } = useApp();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const isSuperAdmin = currentUser.role === UserRole.SUPER_ADMIN;
  const isAdmin = currentUser.role === UserRole.ADMIN || isSuperAdmin;

  const themeOptions: { mode: 'light' | 'dark' | 'auto'; icon: React.ReactNode; label: string }[] = [
    { mode: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { mode: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { mode: 'auto', icon: <Monitor className="w-4 h-4" />, label: 'Auto' }
  ];

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pl-20 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-3 md:px-4 py-2.5 md:py-3 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1 md:p-1.5 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
            <Trophy className="text-white w-4 h-4 md:w-5 md:h-5" />
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight dark:text-white transition-all">TopSpin <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">TT</span></h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Select theme"
            >
              {themeMode === 'light' && <Sun className="w-4 h-4" />}
              {themeMode === 'dark' && <Moon className="w-4 h-4" />}
              {themeMode === 'auto' && <Monitor className="w-4 h-4" />}
            </button>
            
            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-slate-900/50 border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
                {themeOptions.map(option => (
                  <button
                    key={option.mode}
                    onClick={() => {
                      setThemeMode(option.mode);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                      themeMode === option.mode
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {option.icon}
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            isAdmin 
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' 
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'
          }`}>
            {isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> : isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCircle className="w-3.5 h-3.5" />}
            {currentUser.role}
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      {/* Navigation - Bottom for Mobile, Left for Desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 md:top-0 md:left-0 md:right-auto md:w-20 md:h-full md:border-t-0 md:border-r transition-colors duration-300">
        <div className="flex md:flex-col justify-around md:justify-start items-center h-16 md:h-full md:py-8 gap-1 md:gap-8 overflow-x-auto md:overflow-visible">
          <NavItem to="/" icon={<Home className="w-6 h-6" />} label="Home" />
          <NavItem to="/leaderboard" icon={<Trophy className="w-6 h-6" />} label="Rank" />
          <NavItem to="/matches" icon={<TableIcon className="w-6 h-6" />} label="Matches" />
          <NavItem to="/payments" icon={<IndianRupee className="w-6 h-6" />} label="Pay" />
          <NavItem to="/players" icon={<Users className="w-6 h-6" />} label="Players" />
          {isAdmin && <NavItem to="/expenses" icon={<ShoppingBag className="w-6 h-6" />} label="Expenses" />}
          {isAdmin && <NavItem to="/reports" icon={<PieChart className="w-6 h-6" />} label="Reports" />}
          {isSuperAdmin && <NavItem to="/admin" icon={<ShieldCheck className="w-6 h-6 text-amber-500" />} label="Admin" />}
        </div>
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center gap-0.5 w-full md:w-auto px-2 md:px-0 transition-all duration-200 ${
        isActive 
          ? 'text-indigo-600 dark:text-indigo-400 scale-110 md:scale-100' 
          : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
      }`
    }
  >
    {icon}
    <span className="text-[10px] md:hidden font-medium">{label}</span>
  </NavLink>
);
