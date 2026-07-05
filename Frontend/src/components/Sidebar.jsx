import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  Wallet,
  FileSpreadsheet,
  PieChart,
  ShieldCheck,
  Settings,
  LogOut,
  Building2,
  History,
  Bell,
  Map,
  ChevronRight,
  MoreVertical,
  TrendingUp,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activePage, isSidebarOpen, setIsSidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Defined Navigation Items with Routes
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'Tax Officer'] },
    { name: 'Owner Portal', path: '/owner-portal', icon: Home, roles: ['Owner'] },
    { name: 'Properties', path: '/properties', icon: Building2, roles: ['Super Admin', 'Tax Officer'] },
    { name: 'Property Transfers', path: '/property-transfers', icon: ArrowRightLeft, roles: ['Super Admin', 'Tax Officer'] },
    { name: 'Owners', path: '/owners', icon: Users, roles: ['Super Admin', 'Tax Officer'] },
    { name: 'Tax Management', path: '/tax-management', icon: Wallet, roles: ['Super Admin', 'Tax Officer'] },
    { name: 'Payment Records', path: '/payment-records', icon: FileSpreadsheet, roles: ['Super Admin', 'Tax Officer'] },
    { name: 'Map View', path: '/map', icon: Map, roles: ['Super Admin', 'Tax Officer', 'Owner'] },
    { name: 'Reports', path: '/reports', icon: PieChart, roles: ['Super Admin'] },
    { name: 'District Performance', path: '/district-performance', icon: TrendingUp, roles: ['Super Admin'] },
    { name: 'User Management', path: '/users', icon: ShieldCheck, roles: ['Super Admin'] },
    { name: 'Audit Log', path: '/audit', icon: History, roles: ['Super Admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  const handleNavigation = (path, name) => {
    navigate(path);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const NavLink = ({ item }) => {
    const isActive = activePage === item.name;
    const Icon = item.icon;

    return (
      <button
        onClick={() => handleNavigation(item.path, item.name)}
        className={`
          group relative flex items-center w-full gap-3 px-3 py-3 mb-1.5 rounded-xl transition-all duration-300
          ${isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            : 'text-slate-400 hover:bg-white/5 hover:text-indigo-300'
          }
          ${!isSidebarOpen && 'justify-center px-0'}
        `}
      >
        {/* Icon Wrapper */}
        <div className={`relative flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-100' : 'group-hover:scale-110'}`}>
          <Icon
            size={20}
            strokeWidth={isActive ? 2.5 : 2}
            className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-300'}
          />
        </div>

        {/* Text Label (Collapsible) */}
        <div className={`overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 ml-1' : 'w-0 opacity-0'}`}>
          <span className={`text-sm tracking-wide whitespace-nowrap ${isActive ? 'font-bold' : 'font-medium'}`}>
            {item.name}
          </span>
        </div>

        {/* Active Indicator Dot (Only when open) */}
        {isActive && isSidebarOpen && (
          <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
        )}

        {/* Tooltip for Collapsed State */}
        {!isSidebarOpen && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shadow-xl border border-slate-700 z-50 whitespace-nowrap">
            {item.name}
            {/* Arrow */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 h-screen 
          bg-[#0B1121] 
          border-r border-slate-800/60
          flex flex-col transition-all duration-500 cubic-bezier(0.25, 0.8, 0.25, 1)
          ${isSidebarOpen ? 'w-[280px]' : 'w-[88px]'}
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
        `}>

        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80"></div>

        {/* --- Header / Logo Section --- */}
        <div className="h-24 flex items-center justify-center relative">
          <div className={`flex items-center gap-3 transition-all duration-300 ${isSidebarOpen ? 'px-6 w-full' : 'justify-center'}`}>
            {/* Logo Icon */}
            <div className="relative group cursor-pointer" onClick={() => navigate('/')}>
              <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20 border border-white/10">
                <Building2 className="text-white w-5 h-5" />
              </div>
            </div>

            {/* Logo Text */}
            <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">
                Tax<span className="text-indigo-400">Admin</span>
              </h1>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">Workspace</span>
            </div>
          </div>
        </div>

        {/* --- Navigation Scroll Area --- */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className={`mb-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            Main Menu
          </div>

          {filteredNavItems.map((item) => <NavLink key={item.name} item={item} />)}

          <div className="my-6 border-t border-slate-800/50"></div>

          <div className={`mb-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            Preferences
          </div>

          <NavLink item={{ name: 'Notifications', path: '/notifications', icon: Bell, roles: ['Super Admin', 'Tax Officer', 'Owner'] }} />
          <NavLink item={{ name: 'Settings', path: '/settings', icon: Settings, roles: ['Super Admin'] }} />
        </nav>

        {/* --- Footer / Logout Section --- */}
        <div className="p-4 bg-[#0F1629] border-t border-slate-800">
          <button
            onClick={logout}
            className={`
               flex items-center gap-3 w-full p-2.5 rounded-xl transition-all duration-300
               text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20
               ${!isSidebarOpen && 'justify-center'}
             `}
          >
            <LogOut size={20} />
            {isSidebarOpen && (
              <span className="font-semibold text-sm">Logout</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}