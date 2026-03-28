import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, QrCode, LogOut, BarChart3, History, Wallet, Settings, Sun, Moon, Menu as MenuIcon, X, Users, Inbox, Hotel } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useDarkMode } from '../hooks/useDarkMode';

export default function AdminLayout() {
  const isAuthenticated = localStorage.getItem('resmvp_admin_auth') === 'true';
  const location = useLocation();
  const [settings, setSettings] = useState({});
  const { isDark, toggleDarkMode } = useDarkMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    { path: '/admin/staff', icon: Users, label: 'Staff Management' },
    { path: '/admin/kitchen-inbox', icon: Inbox, label: 'Kitchen Inbox' },
    { path: '/admin/cabins', icon: Hotel, label: 'Cabins & VIP' },
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Fixed Mobile Drawer or Static Desktop Sidebar) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.logo && <img src={settings.logo} className="w-10 h-10 object-contain rounded-lg shadow-sm border border-gray-100 shrink-0" alt="Logo"/>}
            <h2 className="text-lg font-black text-gray-800 leading-tight tracking-tight">{settings.name || 'Admin'}</h2>
          </div>
          <button className="md:hidden p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 font-bold translate-x-1' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-blue-50'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button 
            onClick={toggleDarkMode}
            className="flex items-center space-x-3 text-gray-600 hover:bg-gray-50 w-full px-4 py-3 rounded-xl transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top header for mobile */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm transition-all duration-300">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="p-2 -ml-2 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all active:scale-95 border border-gray-100"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center justify-center space-x-2 overflow-hidden mx-4">
            {settings.logo && <img src={settings.logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain border border-gray-100 shadow-sm shrink-0" />}
            <h2 className="font-black text-gray-950 text-base tracking-tight truncate">{settings.name || 'Dashboard'}</h2>
          </div>
          <button 
            onClick={toggleDarkMode} 
            className="text-gray-700 bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl border border-gray-100 transition-all active:scale-95 shadow-sm"
          >
            {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
