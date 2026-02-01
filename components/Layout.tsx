
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Trophy, 
  IndianRupee, 
  Users, 
  PieChart, 
  ShoppingBag,
  ShieldCheck,
  UserCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, switchRole } = useApp();
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pl-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Trophy className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">TopSpin <span className="text-indigo-600 font-extrabold">TT</span></h1>
        </div>
        
        <button 
          onClick={() => switchRole(isAdmin ? UserRole.STAFF : UserRole.ADMIN)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCircle className="w-3.5 h-3.5" />}
          {currentUser.role}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>

      {/* Navigation - Bottom for Mobile, Left for Desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:top-0 md:left-0 md:right-auto md:w-20 md:h-full md:border-t-0 md:border-r">
        <div className="flex md:flex-col justify-around md:justify-start items-center h-16 md:h-full md:py-8 gap-1 md:gap-8">
          <NavItem to="/" icon={<Home className="w-6 h-6" />} label="Home" />
          <NavItem to="/matches" icon={<Trophy className="w-6 h-6" />} label="Matches" />
          <NavItem to="/payments" icon={<IndianRupee className="w-6 h-6" />} label="Pay" />
          <NavItem to="/players" icon={<Users className="w-6 h-6" />} label="Players" />
          {isAdmin && <NavItem to="/expenses" icon={<ShoppingBag className="w-6 h-6" />} label="Bills" />}
          {isAdmin && <NavItem to="/reports" icon={<PieChart className="w-6 h-6" />} label="Daily" />}
        </div>
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center justify-center gap-0.5 w-full md:w-auto px-2 md:px-0 transition-colors ${
        isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
      }`
    }
  >
    {icon}
    <span className="text-[10px] md:hidden font-medium">{label}</span>
  </NavLink>
);
