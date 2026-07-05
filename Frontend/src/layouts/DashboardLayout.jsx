import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import Properties from '../pages/Properties.jsx';
import Owners from '../pages/Owners.jsx';
import TaxManagement from '../pages/TaxManagement.jsx';
import PaymentRecords from '../pages/PaymentRecords.jsx';
import UserManagement from '../pages/UserManagement.jsx';
import AuditLog from '../pages/AuditLog.jsx';
import Reports from '../pages/Reports.jsx';
import DistrictPerformance from '../pages/DistrictPerformance.jsx';
import Settings from '../pages/Settings.jsx';
import OwnerPortal from '../pages/OwnerPortal.jsx';
import Notifications from '../pages/Notifications.jsx';
import Profile from '../pages/Profile.jsx';
import MapView from '../pages/MapView.jsx';
import PropertyTransfers from '../pages/PropertyTransfers.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sync URL to State Logic
  useEffect(() => {
    // 1. Get path without leading slash
    const path = location.pathname.substring(1).split('/')[0] || '';

    // 2. Map paths to Human Readable Names for the Header/Active State
    const pageMap = {
      '': user.role === 'Owner' ? 'Owner Portal' : 'Dashboard',
      'dashboard': 'Dashboard',
      'properties': 'Properties',
      'property-transfers': 'Property Transfers',
      'owners': 'Owners',
      'tax-management': 'Tax Management',
      'payment-records': 'Payment Records',
      'reports': 'Reports',
      'district-performance': 'District Performance',
      'users': 'User Management',
      'audit': 'Audit Log',
      'settings': 'Settings',
      'owner-portal': 'Owner Portal',
      'notifications': 'Notifications',
      'profile': 'Profile',
      'map': 'Map View'
    };

    // 3. Normalize logic
    const normalizedPath = path.toLowerCase();
    const targetPage = pageMap[normalizedPath];

    if (targetPage) {
      setActivePage(targetPage);
    } else {
      // Fallback or 404 handling logic could go here
      setActivePage('Dashboard');
    }
  }, [location.pathname, user.role]);

  // Page Renderer
  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard': return <AdminDashboard />;
      case 'Properties': return <Properties />;
      case 'Property Transfers': return <PropertyTransfers />;
      case 'Owners': return <Owners />;
      case 'Tax Management': return <TaxManagement />;
      case 'Payment Records': return <PaymentRecords />;
      case 'Reports': return <Reports />;
      case 'District Performance': return <DistrictPerformance />;
      case 'User Management': return <UserManagement />;
      case 'Audit Log': return <AuditLog />;
      case 'Settings': return <Settings />;
      case 'Owner Portal': return <OwnerPortal />;
      case 'Notifications': return <Notifications />;
      case 'Profile': return <Profile />;
      case 'Map View': return <MapView />;
      default: return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100">

      {/* 1. Sidebar Component */}
      <Sidebar
        activePage={activePage}
        // Sidebar doesn't need setActivePage anymore, it uses navigate()
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* 2. Main Layout Wrapper */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen transition-[margin] duration-500 ease-in-out
          ${isSidebarOpen ? 'md:ml-[280px]' : 'md:ml-[88px]'}
        `}
      >

        {/* 3. Header */}
        {/* We pass a fixed styling prop to header if needed to match width */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activePage={activePage}
          user={user}
        />

        {/* 4. Scrollable Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto relative">

          {/* Subtle Background Pattern for texture */}
          <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none -z-10"></div>

          {/* Content Container */}
          <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 slide-in-from-bottom-2">
            {renderPage()}
          </div>

        </main>
      </div>
    </div>
  );
}