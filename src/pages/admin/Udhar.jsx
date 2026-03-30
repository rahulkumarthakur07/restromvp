import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, getDoc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wallet, User, CheckCircle, Plus, ArrowDownLeft, ArrowUpRight, X, ChevronLeft, TrendingUp, Download, FileText } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { generatePDFReceipt } from '../../utils/pdfGenerator';

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
  const [settings, setSettings] = useState({});
  const [downloadingOrderId, setDownloadingOrderId] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) setSettings(snap.data());
      } catch(e){}
    };
    fetchSettings();
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

  const handleDownloadReceipt = async (orderId) => {
    if(!orderId) return;
    setDownloadingOrderId(orderId);
    try {
      const snap = await getDoc(doc(db, 'orders', orderId));
      if (snap.exists()) {
        const orderData = { id: snap.id, ...snap.data() };
        generatePDFReceipt(orderData, settings);
      } else {
        alert("Order not found or deleted.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to download receipt.");
    }
    setDownloadingOrderId(null);
  }

  const theyOweMe = personas.reduce((sum, p) => p.balance > 0 ? sum + p.balance : sum, 0);
  const iOweThem = personas.reduce((sum, p) => p.balance < 0 ? sum + Math.abs(p.balance) : sum, 0);
  const netBalance = theyOweMe - iOweThem;

  const chartData = [
    { name: 'Mon', net: -1500, given: 1000, received: 2500 },
    { name: 'Tue', net: 400, given: 2000, received: 1600 },
    { name: 'Wed', net: -800, given: 800, received: 1600 },
    { name: 'Thu', net: 1200, given: 3000, received: 1800 },
    { name: 'Fri', net: 2500, given: 4000, received: 1500 },
    { name: 'Sat', net: -500, given: 1500, received: 2000 },
    { name: 'Sun', net: netBalance, given: 4500, received: 3000 }, // Connects to the current live data point
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
            <div className="flex flex-wrap md:flex-nowrap gap-3 md:gap-4 w-full md:w-auto mt-4 md:mt-0">
              <div className="flex-1 md:flex-none relative overflow-hidden px-5 py-4 bg-linear-to-br from-rose-500 to-red-600 rounded-3xl shadow-lg shadow-red-500/30 flex flex-col justify-center min-w-[130px]">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-black text-red-100 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3"/> I Owe</span>
                <span className="block text-xl md:text-2xl font-black text-white leading-none tracking-tight">Rs. {iOweThem.toFixed(0)}</span>
              </div>
              <div className="flex-1 md:flex-none relative overflow-hidden px-5 py-4 bg-linear-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-lg shadow-emerald-500/30 flex flex-col justify-center min-w-[130px]">
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 flex items-center gap-1.5"><ArrowDownLeft className="w-3 h-3"/> They Owe</span>
                <span className="block text-xl md:text-2xl font-black text-white leading-none tracking-tight">Rs. {theyOweMe.toFixed(0)}</span>
              </div>
              <div className={`flex-1 md:flex-none w-full md:w-auto relative overflow-hidden px-5 py-4 bg-linear-to-br ${netBalance >= 0 ? 'from-blue-600 to-cyan-500 shadow-blue-500/30' : 'from-gray-800 to-gray-950 shadow-gray-900/30'} rounded-3xl shadow-lg flex flex-col justify-center min-w-[140px]`}>
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-white/20 rounded-full blur-2xl pointer-events-none" />
                <span className={`text-[10px] font-black ${netBalance >= 0 ? 'text-blue-100' : 'text-gray-400'} uppercase tracking-widest mb-1 flex items-center gap-1.5`}><Wallet className="w-3 h-3"/> Net Balance</span>
                <span className="block text-2xl md:text-3xl font-black text-white leading-none tracking-tight">{netBalance < 0 ? '-' : ''}Rs. {Math.abs(netBalance).toFixed(0)}</span>
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
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-all flex justify-between items-center group relative ${
                    selectedPersona?.id === p.id
                      ? 'bg-linear-to-r from-blue-50/50 to-transparent'
                      : 'hover:bg-gray-50/80 active:bg-gray-100'
                  }`}
                >
                  {selectedPersona?.id === p.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-blue-500 to-cyan-400 rounded-r-full" />
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${
                      selectedPersona?.id === p.id ? 'bg-linear-to-tr from-blue-600 to-cyan-400 text-white shadow-lg shadow-blue-500/30' : 'bg-linear-to-tr from-gray-100 to-gray-200 text-gray-500 shadow-sm border border-white'
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
              <div className="bg-white/80 backdrop-blur-xl p-4 border-b border-gray-100 flex justify-between items-center shrink-0 z-10 sticky top-0 shadow-sm">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedPersona(null)}
                    className="flex w-10 h-10 bg-white hover:bg-gray-50 rounded-2xl items-center justify-center transition-all active:scale-95 text-gray-600 shrink-0 border border-gray-200 shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 bg-linear-to-tr from-blue-600 to-cyan-400 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30">
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
                        <div className={`max-w-[85%] md:max-w-[75%] rounded-4xl p-5 shadow-sm hover:shadow-md transition-shadow relative ${
                          isGave
                            ? 'bg-linear-to-br from-white to-rose-50/80 border border-red-100/60 rounded-tr-sm'
                            : 'bg-linear-to-br from-white to-emerald-50/80 border border-emerald-100/60 rounded-tl-sm'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isGave ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                              {isGave
                                ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                                : <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                              }
                            </div>
                            <span className={`font-black text-[10px] uppercase tracking-widest ${isGave ? 'text-red-600' : 'text-emerald-600'}`}>
                              {isGave ? 'You Gave' : 'You Received'}
                            </span>
                            <span className="font-black text-gray-950 ml-auto pl-3 text-lg md:text-xl tracking-tight">Rs. {t.amount.toFixed(0)}</span>
                          </div>
                          {t.note && (
                            <p className="text-xs text-gray-600 font-medium bg-white/60 p-2.5 rounded-xl mt-1.5 border border-black/5 leading-snug">{t.note}</p>
                          )}
                          {t.orderId && (
                            <button
                              onClick={() => handleDownloadReceipt(t.orderId)}
                              disabled={downloadingOrderId === t.orderId}
                              className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isGave ? 'bg-red-100/50 text-red-600 hover:bg-red-100' : 'bg-gray-100/50 text-gray-600 hover:bg-gray-100'}`}
                            >
                              {downloadingOrderId === t.orderId ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                              View Bill
                            </button>
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
              <div className="bg-linear-to-t from-gray-50 flex-col border-t border-gray-100 p-4 md:p-6 shrink-0 relative">
                <div className="bg-white w-full rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-200/60 p-2 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-2">
                    <div className="relative w-full md:w-48 shrink-0 bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-300 transition-all">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-base">Rs.</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={newAmount}
                        onChange={e => setNewAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-none bg-transparent font-black text-gray-900 text-lg outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Add a remark (optional)..."
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="flex-1 px-5 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 transition-all"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleTransaction('gave')}
                      disabled={!newAmount}
                      className="flex-1 bg-linear-to-tr from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-black rounded-2xl border-none shadow-lg shadow-red-500/25 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 py-3.5 text-xs uppercase tracking-widest active:scale-95"
                    >
                      <ArrowUpRight className="w-4 h-4" /> Give Udhar
                    </button>
                    <button
                      onClick={() => handleTransaction('received')}
                      disabled={!newAmount}
                      className="flex-1 bg-linear-to-tr from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black rounded-2xl border-none shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 py-3.5 text-xs uppercase tracking-widest active:scale-95"
                    >
                      <ArrowDownLeft className="w-4 h-4" /> Received
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
