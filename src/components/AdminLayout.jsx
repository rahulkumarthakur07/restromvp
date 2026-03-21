import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, QrCode, LogOut, BarChart3, History, Wallet, Settings } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminLayout() {
  const isAuthenticated = localStorage.getItem('resmvp_admin_auth') === 'true';
  const location = useLocation();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (e) {}
    };
    if (isAuthenticated) fetchSettings();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('resmvp_admin_auth');
    window.location.href = '/admin/login';
  };

  const navItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Live Orders' },
    { path: '/admin/products', icon: Package, label: 'Manage Menu' },
    { path: '/admin/tables', icon: QrCode, label: 'Tables & QR' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/admin/history', icon: History, label: 'History' },
    { path: '/admin/udhar', icon: Wallet, label: 'Ledger (Udhar)' },
    { path: '/admin/settings', icon: Settings, label: 'About Open My Restro' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-3">
          {settings.logo && <img src={settings.logo} className="w-10 h-10 object-contain rounded-lg shadow-sm border border-gray-100 shrink-0" alt="Logo"/>}
          <h2 className="text-lg font-black text-gray-800 leading-tight tracking-tight">{settings.name || 'Restaurant Admin'}</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {settings.logo && <img src={settings.logo} className="w-8 h-8 object-contain rounded-md shadow-sm border border-gray-100 shrink-0" alt="Logo"/>}
            <h2 className="text-lg font-black text-gray-800 tracking-tight">{settings.name || 'Admin'}</h2>
          </div>
          <button onClick={handleLogout} className="text-red-600 p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Nav (Bottom) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 z-50">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 rounded-lg ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
