import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, ChevronDown, LogOut, User, Settings, Slash, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAllNotificationsAsRead } from '../services/api';

export default function Header({ onToggleSidebar, activePage }) {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setIsProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      // Assuming API returns { data: [] } or just []
      const response = await getNotifications();
      const notes = response.data?.data || response.data || [];
      setNotifications(notes);
      setHasUnread(notes.some(n => !n.read));
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const handleMarkRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setHasUnread(false);
    } catch (error) {
      console.error("Failed to mark notifications read", error);
    }
  };

  return (
    <header className="sticky top-0 z-30 px-6 py-4 transition-all bg-white/80 border-b border-gray-200 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center justify-between">

        {/* Left: Breadcrumbs & Toggle */}
        <div className="flex items-center gap-4">
          <button
            className="p-2 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 lg:hidden"
            onClick={onToggleSidebar}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb Context */}
          <div className="hidden md:flex items-center text-sm font-medium text-gray-500">
            <span className="hover:text-indigo-600 cursor-pointer">HomeTax</span>
            <Slash size={12} className="mx-2 text-gray-300" />
            <span className="text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">{activePage}</span>
          </div>
        </div>

        {/* Center: Search (Floating Style) */}
        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            </div>
            <input
              type="text"
              placeholder="Search Tax ID, Owner..."
              className="w-72 lg:w-96 pl-10 pr-4 py-2 text-sm bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-xs text-gray-400 border border-gray-300 rounded px-1.5 py-0.5">⌘K</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 text-gray-500 transition-colors rounded-full hover:bg-gray-100 hover:text-indigo-600"
            >
              <Bell size={20} />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping bg-rose-400"></span>
                  <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                </span>
              )}
            </button>

            {/* Notification Menu */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-xl shadow-2xl origin-top-right z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                  {hasUnread && (
                    <button onClick={handleMarkRead} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notif, index) => (
                      <div key={index} className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 ${!notif.read ? 'bg-indigo-50/30' : ''}`}>
                        <div className="flex gap-3">
                          <div className={`mt-1 ${notif.type === 'alert' ? 'text-amber-500' : 'text-indigo-500'}`}>
                            {notif.type === 'alert' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                          </div>
                          <div>
                            <p className={`text-sm text-gray-800 ${!notif.read ? 'font-semibold' : 'font-medium'}`}>{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center bg-gray-50/50">
                  <span className="text-[10px] text-gray-400">Real-time alerts connected</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-gray-200 hidden sm:block mx-1"></div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pr-3 transition-all rounded-full hover:bg-gray-100 group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-gray-400">{user.role}</p>
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* User Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white border border-gray-100 rounded-xl shadow-2xl origin-top-right z-50 p-1">
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{user.name}</p>
                </div>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <User size={16} /> Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setIsProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Settings size={16} /> Settings
                </button>
                <div className="my-1 border-t border-gray-100"></div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}