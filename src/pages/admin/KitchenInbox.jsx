import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc,
  orderBy, query
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Inbox, CheckCircle2, Trash2, Eye, ShoppingCart, MessageSquare, ChefHat } from 'lucide-react';

export default function KitchenInbox() {
  const [tab, setTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    const msgQ = query(collection(db, 'kitchenMessages'), orderBy('timestamp', 'asc'));
    const unsubMsg = onSnapshot(msgQ, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const ingQ = query(collection(db, 'ingredientRequests'), orderBy('timestamp', 'desc'));
    const unsubIng = onSnapshot(ingQ, snap => {
      setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubMsg(); unsubIng(); };
  }, []);

  const markResolved = async (id) => {
    await updateDoc(doc(db, 'kitchenMessages', id), { resolved: true });
  };

  const deleteMsg = async (id) => {
    await deleteDoc(doc(db, 'kitchenMessages', id));
  };

  const markPurchased = async (id) => {
    await updateDoc(doc(db, 'ingredientRequests', id), { purchased: true });
  };

  const deletIng = async (id) => {
    await deleteDoc(doc(db, 'ingredientRequests', id));
  };

  const unreadMessages = messages.filter(m => !m.resolved && m.from === 'kitchen').length;
  const pendingIngredients = ingredients.filter(i => !i.purchased).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-amber-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <Inbox className="w-4 h-4" />
              <span>Admin View</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">Kitchen Inbox</h1>
            <p className="text-gray-400 font-medium">Messages and ingredient requests from kitchen staff.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="text-center px-5 py-3 bg-white border border-red-100 rounded-2xl shadow-sm">
              <span className="block text-2xl font-black text-red-500">{unreadMessages}</span>
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Unread</span>
            </div>
            <div className="text-center px-5 py-3 bg-white border border-orange-100 rounded-2xl shadow-sm">
              <span className="block text-2xl font-black text-orange-500">{pendingIngredients}</span>
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-gray-100 p-1.5 rounded-3xl">
        <button
          onClick={() => setTab('messages')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
            tab === 'messages'
              ? 'bg-white text-gray-950 shadow-md'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messages</span>
          {unreadMessages > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{unreadMessages}</span>
          )}
        </button>
        <button
          onClick={() => setTab('ingredients')}
          className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
            tab === 'ingredients'
              ? 'bg-white text-gray-950 shadow-md'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Ingredient Requests</span>
          {pendingIngredients > 0 && (
            <span className="bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{pendingIngredients}</span>
          )}
        </button>
      </div>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {messages.length === 0 && (
            <div className="text-center py-20 bg-white rounded-4xl border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-gray-200" />
              </div>
              <p className="font-black text-gray-300 text-xl mb-2">No messages yet</p>
              <p className="text-gray-300 font-medium text-sm">Kitchen staff messages will appear here.</p>
            </div>
          )}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-4 items-start bg-white rounded-3xl border p-5 shadow-sm transition-all duration-300 hover:shadow-lg ${
                msg.resolved ? 'border-gray-100 opacity-60' : 'border-blue-100'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl ${
                msg.from === 'kitchen' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'
              }`}>
                {msg.from === 'kitchen' ? '🍳' : '👔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <p className="font-black text-gray-950 text-sm">{msg.sender || msg.from}</p>
                  <span className="text-[10px] text-gray-300 font-bold">
                    {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </span>
                  {msg.resolved && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 font-black px-2.5 py-1 rounded-xl border border-emerald-100 uppercase tracking-widest">✓ Seen</span>
                  )}
                </div>
                <p className="text-gray-700 text-sm font-medium leading-relaxed">{msg.text}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {!msg.resolved && (
                  <button
                    onClick={() => markResolved(msg.id)}
                    className="p-2.5 rounded-2xl hover:bg-emerald-50 text-gray-300 hover:text-emerald-600 transition-all active:scale-95 border border-gray-100 hover:border-emerald-100"
                    title="Mark as seen"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMsg(msg.id)}
                  className="p-2.5 rounded-2xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all active:scale-95 border border-gray-100 hover:border-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingredients Tab */}
      {tab === 'ingredients' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {ingredients.length === 0 && (
            <div className="text-center py-20 bg-white rounded-4xl border border-gray-100 shadow-sm">
              <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-10 h-10 text-gray-200" />
              </div>
              <p className="font-black text-gray-300 text-xl mb-2">No ingredient requests</p>
              <p className="text-gray-300 font-medium text-sm">Kitchen requests for restocking will appear here.</p>
            </div>
          )}
          {ingredients.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-4 bg-white rounded-3xl border p-5 shadow-sm transition-all duration-300 hover:shadow-lg ${
                item.purchased ? 'opacity-50 border-gray-100' : 'border-orange-100'
              }`}
            >
              <div className={`w-3 h-3 rounded-full shrink-0 ${item.purchased ? 'bg-emerald-400' : 'bg-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-black text-base leading-tight ${item.purchased ? 'text-gray-300 line-through' : 'text-gray-950'}`}>
                  {item.name}
                </p>
                <p className="text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                  Qty: {item.quantity} &nbsp;·&nbsp; By: {item.requestedBy}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!item.purchased && (
                  <button
                    onClick={() => markPurchased(item.id)}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black px-4 py-2.5 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95 border border-emerald-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Purchased
                  </button>
                )}
                <button
                  onClick={() => deletIng(item.id)}
                  className="p-2.5 rounded-2xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all active:scale-95 border border-gray-100 hover:border-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
