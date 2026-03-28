import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { ChefHat, LogOut, Sun, Moon, Menu as MenuIcon, X, PackageX, MessageSquare, ShoppingBag } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useDarkMode } from '../hooks/useDarkMode';

export default function KitchenLayout() {
  const waiterAuth = localStorage.getItem('resmvp_waiter_auth');
  const staffRole = localStorage.getItem('resmvp_staff_role');
  const [waiterName, setWaiterName] = useState(localStorage.getItem('resmvp_waiter_name') || 'Chef');
  
  const isAuthenticated = waiterAuth === 'true' && staffRole === 'kitchen';
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/staffs/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('resmvp_waiter_auth');
    localStorage.removeItem('resmvp_waiter_name');
    localStorage.removeItem('resmvp_staff_role');
    window.location.href = '/staffs/login';
  };

  const navItems = [
    { path: '/kitchen/dashboard', icon: ChefHat, label: 'Kitchen Orders' },
    { path: '/kitchen/stock', icon: PackageX, label: 'Stock Manager' },
    { path: '/kitchen/messages', icon: MessageSquare, label: 'Message Admin' },
    { path: '/kitchen/ingredients', icon: ShoppingBag, label: 'Ingredients' },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-200 flex flex-col space-y-4 relative">
          <button className="md:hidden absolute top-4 right-4 p-2 text-gray-500 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            {settings.logo && <img src={settings.logo} className="w-10 h-10 object-contain rounded-lg shadow-sm border border-gray-100 shrink-0" alt="Logo"/>}
            <h2 className="text-lg font-black text-gray-800 leading-tight tracking-tight">{settings.name || 'Kitchen Portal'}</h2>
          </div>
          
          <div className="bg-orange-50 text-orange-800 px-3 py-2 rounded-xl text-sm font-bold flex items-center shadow-sm border border-orange-100">
            Welcome, {waiterName}
          </div>
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
                  isActive ? 'bg-orange-600 text-white font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50 font-medium'
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
            className="flex items-center space-x-3 text-gray-600 hover:bg-gray-50 w-full px-4 py-3 rounded-xl transition-colors font-medium"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-xl transition-colors font-bold"
          >
            <LogOut className="w-5 h-5" />
            <span>Clock Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-3 z-10 sticky top-0">
          <button 
            onClick={() => setMobileMenuOpen(true)} 
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center space-x-2 overflow-hidden">
            {settings.logo && <img src={settings.logo} className="w-8 h-8 object-contain rounded-md shadow-sm border border-gray-100 shrink-0" alt="Logo"/>}
            <h2 className="text-lg font-black text-gray-800 tracking-tight truncate">{settings.name || 'Kitchen Portal'}</h2>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            <button onClick={toggleDarkMode} className="text-gray-600 hover:bg-gray-100 p-2 rounded-lg">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
