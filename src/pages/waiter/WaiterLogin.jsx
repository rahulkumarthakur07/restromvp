import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Coffee, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function WaiterLogin() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    // If already authenticated, redirect based on role
    if (localStorage.getItem('resmvp_waiter_auth') === 'true') {
      const role = localStorage.getItem('resmvp_staff_role') || 'waiter';
      navigate(role === 'kitchen' ? '/kitchen/dashboard' : '/waiter/dashboard');
    }
    
    // Fetch settings for logo
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) setSettings(snap.data());
      } catch(e) {}
    };
    fetchSettings();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !pin) {
      setError("Please enter both username and PIN");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const q = query(collection(db, 'waiters'), where('username', '==', username), where('pin', '==', pin));
      const sn = await getDocs(q);
      
      if (!sn.empty) {
        const waiterDoc = sn.docs[0];
        const data = waiterDoc.data();
        const role = data.role || 'waiter';
        
        localStorage.setItem('resmvp_waiter_auth', 'true');
        localStorage.setItem('resmvp_waiter_name', data.name || username);
        localStorage.setItem('resmvp_staff_role', role);

        if (role === 'kitchen') {
          navigate('/kitchen/dashboard');
        } else {
          navigate('/waiter/dashboard');
        }
      } else {
        setError('Invalid username or PIN');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {settings.logo ? (
            <img src={settings.logo} alt="Logo" className="w-20 h-20 mx-auto object-contain rounded-2xl shadow-sm mb-4" />
          ) : (
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
              <Coffee className="w-10 h-10" />
            </div>
          )}
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Staff Portal</h1>
          <p className="text-gray-500 font-medium mt-1">Sign in to manage active tables</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Access PIN</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-11 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900 tracking-widest"
                  placeholder="••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center disabled:active:scale-100"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Clock In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
