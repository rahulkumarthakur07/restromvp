import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wallet, User, Phone, CheckCircle, Plus, Send, ArrowDownLeft, ArrowUpRight, MessageSquare } from 'lucide-react';

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
      
      // Update selected persona if balance changed
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

  return (
    <div className="h-[calc(100vh-8rem)] max-w-6xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 flex overflow-hidden">
      
      {/* Sidebar: Persona List */}
      <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${selectedPersona ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800 flex items-center">
            <Wallet className="w-5 h-5 mr-2 text-red-500" /> Udhar Ledger
          </h2>
          <button onClick={() => setShowAddPersona(true)} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm hover:shadow transition-all border border-gray-100">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {showAddPersona && (
          <form onSubmit={handleAddPersona} className="p-4 border-b border-gray-100 bg-blue-50/30">
            <input type="text" placeholder="Customer Name *" required value={newPersonaData.name} onChange={e => setNewPersonaData({...newPersonaData, name: e.target.value})} className="w-full px-3 py-2 mb-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            <input type="text" placeholder="Phone (Optional)" value={newPersonaData.phone} onChange={e => setNewPersonaData({...newPersonaData, phone: e.target.value})} className="w-full px-3 py-2 mb-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-500" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddPersona(false)} className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg">Save Persona</button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 flex justify-center"><div className="animate-spin w-6 h-6 border-b-2 border-blue-500 rounded-full" /></div>
          ) : personas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No personas yet.</p>
            </div>
          ) : (
            personas.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSelectedPersona(p)}
                className={`p-4 border-b border-gray-50 cursor-pointer transition-colors flex justify-between items-center ${selectedPersona?.id === p.id ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}`}
              >
                <div>
                  <h3 className="font-bold text-gray-800">{p.name}</h3>
                  {p.phone && <p className="text-xs text-gray-500">{p.phone}</p>}
                </div>
                <div className={`font-black ${p.balance > 0 ? 'text-red-500' : p.balance < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                  Rs. {Math.abs(p.balance || 0).toFixed(2)}
                  <span className="text-[10px] block text-right font-medium text-gray-400">
                    {p.balance > 0 ? 'They owe you' : p.balance < 0 ? 'You owe them' : 'Settled'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#e5ddd5]/20 relative ${!selectedPersona ? 'hidden md:flex' : 'flex'}`}>
        {!selectedPersona ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-gray-500 mb-2">Select a Persona</h2>
            <p className="max-w-xs text-sm">Track udhar via chat format. Record money given out and money received back.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white p-4 border-b border-gray-100 flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center space-x-3">
                <button onClick={() => setSelectedPersona(null)} className="md:hidden p-2 -ml-2 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg">
                  <ArrowDownLeft className="w-5 h-5 rotate-45" />
                </button>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-gray-800 leading-tight">{selectedPersona.name}</h2>
                  <p className="text-xs font-bold text-gray-500">{selectedPersona.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Net Balance</p>
                <p className={`text-xl font-black ${(selectedPersona.balance||0) > 0 ? 'text-red-600' : (selectedPersona.balance||0) < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  Rs. {Math.abs(selectedPersona.balance || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transactions.length === 0 ? (
                <div className="bg-yellow-50 text-yellow-800 text-xs font-bold p-3 rounded-xl max-w-sm mx-auto text-center border border-yellow-200 shadow-sm">
                  This is the start of your ledger with {selectedPersona.name}.
                </div>
              ) : (
                transactions.map((t, idx) => {
                  const isGave = t.type === 'gave';
                  // Gave = They owe us = Red = Right Side
                  // Received = They paid us = Green = Left Side
                  return (
                    <div key={t.id || idx} className={`flex ${isGave ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm relative ${isGave ? 'bg-red-50 border border-red-100 rounded-tr-sm' : 'bg-white border border-gray-100 rounded-tl-sm'}`}>
                        <div className="flex items-center space-x-2 mb-1">
                          {isGave ? <ArrowUpRight className="w-4 h-4 text-red-500 shrink-0" /> : <ArrowDownLeft className="w-4 h-4 text-green-500 shrink-0" />}
                          <span className={`font-black tracking-tight ${isGave ? 'text-red-700' : 'text-green-700'}`}>
                            {isGave ? 'You Gave' : 'You Received'}
                          </span>
                          <span className="font-black text-lg text-gray-900 ml-auto pl-4">Rs. {t.amount.toFixed(2)}</span>
                        </div>
                        {t.note && <p className="text-sm text-gray-700 font-medium bg-white/50 p-2 rounded-lg mt-1 border border-black/5 leading-snug">{t.note}</p>}
                        <div className="text-[10px] text-right font-bold text-gray-400 mt-2">
                          {t.timestamp?.toDate ? new Date(t.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-gray-100 shadow-xl relative z-20">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="relative w-32 shrink-0">
                    <span className="absolute left-3 top-2.5 font-black text-gray-400">Rs.</span>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Add a note (Optional)..." 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-2 h-11 mt-1">
                  <button onClick={() => handleTransaction('gave')} disabled={!newAmount} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-black rounded-xl border border-red-200 transition-colors disabled:opacity-50 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 mr-1" /> I Gave (Udhar)
                  </button>
                  <button onClick={() => handleTransaction('received')} disabled={!newAmount} className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 font-black rounded-xl border border-green-200 transition-colors disabled:opacity-50 flex items-center justify-center">
                    <ArrowDownLeft className="w-5 h-5 mr-1" /> I Received
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
    </div>
  );
}
