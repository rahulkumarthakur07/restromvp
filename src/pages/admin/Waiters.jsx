import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, UserPlus, Trash2, ShieldCheck, Key } from 'lucide-react';

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
      // Check if username already exists locally
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
      setNewWaiter({ name: '', username: '', pin: '' });
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

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 flex border-2 border-blue-600 rounded-full border-b-transparent"></div></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Staff Management</h1>
            <p className="text-gray-500 font-medium">Create credentials for Waiters and Staff.</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex justify-center items-center transition-colors">
          <UserPlus className="w-5 h-5 mr-2" /> Add Staff
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Display Name</label>
            <input required type="text" placeholder="e.g. Rahul Thapa" value={newWaiter.name} onChange={e => setNewWaiter({...newWaiter, name: e.target.value})} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" />
          </div>
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Username (Login)</label>
            <div className="absolute left-3 top-[38px] text-gray-400"><ShieldCheck className="w-5 h-5"/></div>
            <input required type="text" placeholder="rahul123" value={newWaiter.username} onChange={e => setNewWaiter({...newWaiter, username: e.target.value})} className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" />
          </div>
          <div className="flex-1 w-[90%] md:w-auto relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">PIN / Password</label>
            <div className="absolute left-3 top-[38px] text-gray-400"><Key className="w-5 h-5"/></div>
            <input required type="text" placeholder="e.g. 5555" value={newWaiter.pin} onChange={e => setNewWaiter({...newWaiter, pin: e.target.value})} className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800" />
          </div>
          <div className="flex-1 w-[90%] md:w-auto">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Role</label>
            <select value={newWaiter.role} onChange={e => setNewWaiter({...newWaiter, role: e.target.value})} className="w-full bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 appearance-none">
              <option value="waiter">Waiter</option>
              <option value="kitchen">Kitchen Staff</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-xl shrink-0 h-[48px] w-full md:w-auto">Save</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {waiters.map(w => (
          <div key={w.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 border border-gray-200">
                <Users className="w-6 h-6" />
              </div>
              <button onClick={() => handleDelete(w.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2 -mr-2">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-1">{w.name}</h3>
            <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-black uppercase tracking-widest mb-2">
              {w.role === 'kitchen' ? '👨‍🍳 Kitchen' : '🛎️ Waiter'}
            </div>
            <div className="space-y-2 mt-2 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium tracking-wide">Username</span>
                <span className="font-bold text-gray-800">{w.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium tracking-wide">Access PIN</span>
                <span className="font-bold text-gray-800 font-mono bg-gray-100 px-2 rounded">{w.pin}</span>
              </div>
            </div>
          </div>
        ))}
        {waiters.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No external staff accounts created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
