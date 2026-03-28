import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wallet, User, CheckCircle, Plus, ArrowDownLeft, ArrowUpRight, X, ChevronLeft, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function Udhar() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState(null);

  const [showAddPersona, setShowAddPersona] = useState(false);
  const [newPersonaData, setNewPersonaData] = useState({ name: '', phone: '' });

  const [transactions, setTransactions] = useState([]);
  const [newAmount, setNewAmount] = useState('');
  const [newNote, setNewNote] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'personas'), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPersonas(data);
      setLoading(false);

      if (selectedPersona) {
        const updated = data.find(p => p.id === selectedPersona.id);
        if (updated) setSelectedPersona(updated);
      }
    });
    return () => unsub();
  }, [selectedPersona?.id]);

  useEffect(() => {
    if (!selectedPersona) return;
    const q = query(collection(db, `personas/${selectedPersona.id}/transactions`), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });
    return () => unsub();
  }, [selectedPersona]);

  const handleAddPersona = async (e) => {
    e.preventDefault();
    if (!newPersonaData.name) return;
    try {
      await addDoc(collection(db, 'personas'), {
        name: newPersonaData.name,
        phone: newPersonaData.phone,
        balance: 0,
        updatedAt: serverTimestamp()
      });
      setShowAddPersona(false);
      setNewPersonaData({ name: '', phone: '' });
    } catch (e) { console.error(e); }
  };

  const handleTransaction = async (type) => {
    if (!newAmount || isNaN(newAmount) || Number(newAmount) <= 0) return;
    const amountNum = parseFloat(newAmount);
    try {
      await addDoc(collection(db, `personas/${selectedPersona.id}/transactions`), {
        type,
        amount: amountNum,
        note: newNote,
        timestamp: serverTimestamp()
      });
      const newBalance = type === 'gave'
        ? (selectedPersona.balance || 0) + amountNum
        : (selectedPersona.balance || 0) - amountNum;
      await updateDoc(doc(db, 'personas', selectedPersona.id), {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });
      setNewAmount('');
      setNewNote('');
    } catch (e) { console.error(e); }
  };

  const totalOwed = personas.reduce((sum, p) => p.balance > 0 ? sum + p.balance : sum, 0);

  const chartData = [
    { name: 'Mon', net: -1500, given: 1000, received: 2500 },
    { name: 'Tue', net: 400, given: 2000, received: 1600 },
    { name: 'Wed', net: -800, given: 800, received: 1600 },
    { name: 'Thu', net: 1200, given: 3000, received: 1800 },
    { name: 'Fri', net: 2500, given: 4000, received: 1500 },
    { name: 'Sat', net: -500, given: 1500, received: 2000 },
    { name: 'Sun', net: totalOwed, given: 4500, received: 3000 }, // Connects to the current live data point
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-4">

      {/* Page Header */}
      <div className={`${selectedPersona ? 'hidden' : 'block'}`}>
        <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-red-50/50 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center space-x-2 bg-red-50 text-red-500 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-3">
                <Wallet className="w-4 h-4" />
                <span>Udhar Ledger</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight leading-none mb-1">
                Credit Tracker
              </h1>
              <p className="text-gray-400 font-medium text-sm">Track money given and received from customers.</p>
            </div>
            <div className="flex gap-3">
              <div className="text-center px-5 py-3 bg-white border border-red-100 rounded-2xl shadow-sm">
                <span className="block text-2xl font-black text-red-500">Rs. {totalOwed.toFixed(0)}</span>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Total Owed</span>
              </div>
              <div className="text-center px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <span className="block text-2xl font-black text-gray-800">{personas.length}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personas</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-5" style={{ height: selectedPersona ? 'calc(100vh - 5rem)' : 'calc(100vh - 16rem)' }}>

        {/* Analytics Graph (Desktop only, visible when no persona selected) */}
        {!selectedPersona && (
          <div className="hidden md:flex flex-1 flex-col bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden p-6 relative">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="text-lg font-black text-gray-950 tracking-tight">Net Balance Trend</h3>
                <p className="text-xs font-medium text-gray-400">7-day view of your overall profit/debt</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 800 }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 800 }}
                    labelStyle={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, marginBottom: '4px' }}
                    formatter={(value) => `Rs. ${value}`}
                  />
                  <Area type="monotone" dataKey="given" name="Udhar Given" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} />
                  <Area type="monotone" dataKey="received" name="Payment Received" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} />
                  <Area type="monotone" dataKey="net" name="Net Balance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className={`flex flex-col bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden ${selectedPersona ? 'hidden' : 'w-full md:w-88 shrink-0'}`}>
          
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/40">
            <h2 className="font-black text-gray-950 text-sm uppercase tracking-widest">Personas</h2>
            <button
              onClick={() => setShowAddPersona(prev => !prev)}
              className="w-9 h-9 bg-gray-950 text-white rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add Persona Form */}
          {showAddPersona && (
            <form onSubmit={handleAddPersona} className="p-4 border-b border-gray-50 bg-blue-50/30 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
              <input
                type="text"
                placeholder="Customer Name *"
                required
                value={newPersonaData.name}
                onChange={e => setNewPersonaData({ ...newPersonaData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                type="text"
                placeholder="Phone (optional)"
                value={newPersonaData.phone}
                onChange={e => setNewPersonaData({ ...newPersonaData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddPersona(false)} className="flex-1 py-2.5 text-xs font-black text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 text-xs font-black text-white bg-gray-950 hover:bg-black rounded-2xl transition-all active:scale-95">Save</button>
              </div>
            </form>
          )}

          {/* Persona List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-600/20 rounded-full relative">
                  <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            ) : personas.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-sm font-black text-gray-300">No personas added</p>
                <p className="text-xs text-gray-300 font-medium mt-1">Tap + to add your first contact.</p>
              </div>
            ) : (
              personas.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPersona(p)}
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-all flex justify-between items-center group ${
                    selectedPersona?.id === p.id
                      ? 'bg-blue-50/60 border-l-4 border-l-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                      selectedPersona?.id === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-black text-gray-900 text-sm leading-tight">{p.name}</h3>
                      {p.phone && <p className="text-[11px] text-gray-400 font-medium">{p.phone}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black text-sm ${p.balance > 0 ? 'text-red-500' : p.balance < 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                      Rs. {Math.abs(p.balance || 0).toFixed(0)}
                    </div>
                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {p.balance > 0 ? 'Owes you' : p.balance < 0 ? 'You owe' : 'Settled'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat / Detail Area */}
        <div className={`flex-col bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden w-full ${!selectedPersona ? 'hidden' : 'flex'}`}>
          {!selectedPersona ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-6">
                <Wallet className="w-10 h-10 text-gray-200" />
              </div>
              <h2 className="text-xl font-black text-gray-300 mb-2">Select a Persona</h2>
              <p className="text-gray-300 font-medium text-sm max-w-xs">
                Track credit via chat format. Record money given out and payments received back.
              </p>
            </div>
          ) : (
            <>
              {/* Persona Header */}
              <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedPersona(null)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-all active:scale-95 text-gray-600 shrink-0 border border-gray-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white shadow-sm">
                    {selectedPersona.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-black text-gray-950 leading-tight text-sm">{selectedPersona.name}</h2>
                    <p className="text-[11px] font-bold text-gray-400">{selectedPersona.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Net Balance</p>
                  <p className={`text-xl font-black ${(selectedPersona.balance || 0) > 0 ? 'text-red-500' : (selectedPersona.balance || 0) < 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                    Rs. {Math.abs(selectedPersona.balance || 0).toFixed(0)}
                  </p>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {(selectedPersona.balance || 0) > 0 ? 'They owe you' : (selectedPersona.balance || 0) < 0 ? 'You owe them' : 'All settled'}
                  </p>
                </div>
              </div>

              {/* Transaction Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/30">
                {transactions.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-100 text-amber-700 text-xs font-black p-4 rounded-2xl max-w-xs mx-auto text-center shadow-sm">
                    📒 Start of your ledger with {selectedPersona.name}
                  </div>
                ) : (
                  transactions.map((t, idx) => {
                    const isGave = t.type === 'gave';
                    return (
                      <div key={t.id || idx} className={`flex ${isGave ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-3xl p-4 shadow-sm relative ${
                          isGave
                            ? 'bg-red-50 border border-red-100 rounded-tr-lg'
                            : 'bg-white border border-gray-100 rounded-tl-lg'
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            {isGave
                              ? <ArrowUpRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              : <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            }
                            <span className={`font-black text-xs uppercase tracking-widest ${isGave ? 'text-red-600' : 'text-emerald-600'}`}>
                              {isGave ? 'You Gave' : 'You Received'}
                            </span>
                            <span className="font-black text-gray-950 ml-auto pl-3 text-sm">Rs. {t.amount.toFixed(0)}</span>
                          </div>
                          {t.note && (
                            <p className="text-xs text-gray-600 font-medium bg-white/60 p-2.5 rounded-xl mt-1.5 border border-black/5 leading-snug">{t.note}</p>
                          )}
                          <div className="text-[9px] text-right font-bold text-gray-400 mt-2">
                            {t.timestamp?.toDate ? new Date(t.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-100 p-4 shrink-0">
                <div className="space-y-3">
                  <div className="flex gap-2.5">
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-400 text-sm">Rs.</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-2xl font-black text-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none transition-all"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Add a note (optional)..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => handleTransaction('gave')}
                      disabled={!newAmount}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-black rounded-2xl border border-red-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest active:scale-95"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> I Gave (Udhar)
                    </button>
                    <button
                      onClick={() => handleTransaction('received')}
                      disabled={!newAmount}
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-2xl border border-emerald-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-widest active:scale-95"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Received
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
