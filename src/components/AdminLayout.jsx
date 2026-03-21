import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, QrCode, LogOut, BarChart3, History, Wallet, Settings, Sun, Moon, Menu as MenuIcon, X } from 'lucide-react';
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
    { path: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3 z-10 sticky top-0">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center space-x-2 overflow-hidden">
            {settings.logo && <img src={settings.logo} className="w-8 h-8 object-contain rounded-md shadow-sm border border-gray-100 shrink-0" alt="Logo"/>}
            <h2 className="text-lg font-black text-gray-800 tracking-tight truncate">{settings.name || 'Admin'}</h2>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <button onClick={toggleDarkMode} className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={handleLogout} className="text-red-600 p-2 hover:bg-red-50 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Removed Mobile Nav (Bottom) since we now use Sidebar Drawer */}

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
