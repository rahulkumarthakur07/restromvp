import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, UserPlus, Trash2, ShieldCheck, Key, X } from 'lucide-react';

export default function Waiters() {
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newWaiter, setNewWaiter] = useState({ name: '', username: '', pin: '', role: 'waiter' });

  useEffect(() => {
    fetchWaiters();
  }, []);

  const fetchWaiters = async () => {
    try {
      const q = query(collection(db, 'waiters'));
      const sn = await getDocs(q);
      setWaiters(sn.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newWaiter.name || !newWaiter.username || !newWaiter.pin) return;
    try {
      if (waiters.some(w => w.username === newWaiter.username)) {
        alert("Username already exists!");
        return;
      }
      const docRef = await addDoc(collection(db, 'waiters'), {
        ...newWaiter,
        createdAt: serverTimestamp()
      });
      setWaiters([...waiters, { id: docRef.id, ...newWaiter }]);
      setShowAdd(false);
      setNewWaiter({ name: '', username: '', pin: '', role: 'waiter' });
    } catch (e) {
      console.error(e);
      alert("Failed to add staff.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this staff credential permanently?")) return;
    try {
      await deleteDoc(doc(db, 'waiters', id));
      setWaiters(waiters.filter(w => w.id !== id));
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="w-14 h-14 border-4 border-blue-600/20 rounded-full" />
        <div className="absolute top-0 left-0 w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  const roleColors = {
    kitchen: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', label: '👨‍🍳 Kitchen', gradient: 'from-orange-400 to-red-500' },
    waiter: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', label: '🛎️ Waiter', gradient: 'from-blue-400 to-indigo-500' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-pink-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-pink-50 text-pink-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <Users className="w-4 h-4" />
              <span>Staff Management</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">
              Team Credentials
            </h1>
            <p className="text-gray-400 font-medium">Create and manage login access for waiters and kitchen staff.</p>
          </div>
          <button 
            onClick={() => setShowAdd(!showAdd)} 
            className="flex items-center gap-2.5 bg-gray-950 hover:bg-black text-white font-black px-8 py-4 rounded-3xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Add Staff Form */}
      {showAdd && (
        <div className="bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="font-black text-gray-950">New Staff Account</h3>
            </div>
            <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Display Name</label>
                <input required type="text" placeholder="e.g. Rahul Thapa" value={newWaiter.name} onChange={e => setNewWaiter({...newWaiter, name: e.target.value})} className="w-full bg-gray-50 px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Username (Login)</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required type="text" placeholder="rahul123" value={newWaiter.username} onChange={e => setNewWaiter({...newWaiter, username: e.target.value})} className="w-full bg-gray-50 pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">PIN / Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input required type="text" placeholder="e.g. 5555" value={newWaiter.pin} onChange={e => setNewWaiter({...newWaiter, pin: e.target.value})} className="w-full bg-gray-50 pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Role</label>
                <select value={newWaiter.role} onChange={e => setNewWaiter({...newWaiter, role: e.target.value})} className="w-full bg-gray-50 px-4 py-3.5 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 appearance-none transition-all cursor-pointer">
                  <option value="waiter">🛎️ Waiter</option>
                  <option value="kitchen">👨‍🍳 Kitchen Staff</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-gray-950 hover:bg-black text-white font-black py-4 rounded-3xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest">
              Create Staff Account
            </button>
          </form>
        </div>
      )}

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {waiters.map(w => {
          const role = roleColors[w.role] || roleColors.waiter;
          return (
            <div key={w.id} className="group bg-white rounded-4xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-gray-200 transition-all duration-500 relative overflow-hidden">
              {/* Gradient top bar */}
              <div className={`h-1.5 bg-linear-to-r ${role.gradient} w-full`} />
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className={`w-14 h-14 rounded-3xl ${role.bg} ${role.text} flex items-center justify-center border ${role.border} group-hover:rotate-12 transition-transform duration-500 shadow-sm`}>
                    <Users className="w-7 h-7" />
                  </div>
                  <button 
                    onClick={() => handleDelete(w.id)} 
                    className="p-2 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="text-xl font-black text-gray-950 mb-2 tracking-tight">{w.name}</h3>
                <div className={`inline-flex items-center px-3 py-1 ${role.bg} ${role.text} rounded-2xl text-[10px] font-black uppercase tracking-widest border ${role.border} mb-4`}>
                  {role.label}
                </div>
                
                <div className="space-y-2.5 pt-4 border-t border-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Username</span>
                    <span className="font-black text-gray-800 text-sm">{w.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Access PIN</span>
                    <span className="font-black text-gray-800 bg-gray-100 px-3 py-1 rounded-xl font-mono text-sm">{w.pin}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        {waiters.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-gray-200" />
            </div>
            <p className="font-black text-gray-300 text-xl mb-2">No staff accounts</p>
            <p className="text-gray-300 font-medium text-sm">Click "Add Staff" to create the first credential.</p>
          </div>
        )}
      </div>
    </div>
  );
}

