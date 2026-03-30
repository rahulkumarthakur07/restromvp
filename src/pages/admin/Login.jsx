import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight, 
  ChevronRight, 
  AlertCircle,
  Loader2 
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Success: Set legacy auth for AdminLayout compatibility
      // (Optional: In a full refactor, AdminLayout would use onAuthStateChanged)
      localStorage.setItem('resmvp_admin_auth', 'true');
      
      // Navigate to dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      console.error("Login Error:", err.code);
      switch (err.code) {
        case 'auth/user-not-found':
          setError('User not found. Please check your email.');
          break;
        case 'auth/wrong-password':
          setError('Incorrect password. Please try again.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        default:
          setError('Failed to login. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-inter select-none">
      {/* Background Abstract Shapes */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-500/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-[440px] relative text-center">
        <div className="absolute inset-0 bg-white/3 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-2xl shadow-black/40 -z-10" />
        
        <div className="p-10 md:p-12 space-y-10 text-left">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-linear-to-tr from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-blue-600/20 relative group overflow-hidden">
               <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
               <Sparkles className="w-10 h-10 text-white relative z-10" />
            </div>
            
            <div className="space-y-1 mt-6">
              <h1 className="text-3xl font-black text-white tracking-tight leading-none">RestroMVP Admin</h1>
              <p className="text-gray-400 font-medium text-sm">Dashboard Login Access</p>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-blue-400">Email Address</label>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 focus-within:border-blue-500/50 focus-within:bg-white/8 transition-all duration-300">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent pl-12 pr-4 py-4.5 text-white font-semibold text-sm outline-none placeholder:text-gray-600 placeholder:font-medium"
                    placeholder="name@restaurant.com"
                  />
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-500 transition-all duration-500 group-focus-within:w-full" />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors group-focus-within:text-blue-400">Security Password</label>
                  <button type="button" className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest hover:text-blue-400 transition-colors">Forgot?</button>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 focus-within:border-blue-500/50 focus-within:bg-white/8 transition-all duration-300">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                     <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent pl-12 pr-12 py-4.5 text-white font-semibold text-sm outline-none placeholder:text-gray-600 placeholder:font-medium"
                    placeholder="••••••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-500 transition-all duration-500 group-focus-within:w-full" />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white font-black py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all duration-300 shadow-xl shadow-blue-900/20 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="text-xs uppercase tracking-[0.2em] italic">Authenticate</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="pt-4 text-center">
             <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 shadow-inner">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Encrypted Admin Access</span>
             </div>
          </div>
        </div>
      </div>

      {/* Decorative Branding */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] flex items-center gap-3">
         <span>© 2024 RestroMVP v2.0</span>
         <span className="w-1 h-1 bg-gray-700 rounded-full" />
         <span>Enterprise Ready</span>
      </div>
    </div>
  );
}
