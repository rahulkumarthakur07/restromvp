import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc,
  orderBy, query
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Inbox, ShoppingBag, CheckCircle2, Trash2, Eye } from 'lucide-react';

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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Inbox className="w-7 h-7 text-blue-600" />
          Kitchen Inbox
        </h1>
        <p className="text-gray-500 font-medium text-sm mt-0.5">Messages and ingredient requests from kitchen staff.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setTab('messages')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition-colors relative ${
            tab === 'messages'
              ? 'bg-white border border-b-white -mb-px border-gray-200 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💬 Messages
          {unreadMessages > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
          )}
        </button>
        <button
          onClick={() => setTab('ingredients')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition-colors relative ${
            tab === 'ingredients'
              ? 'bg-white border border-b-white -mb-px border-gray-200 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🛒 Ingredient Requests
          {pendingIngredients > 0 && (
            <span className="ml-2 bg-orange-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{pendingIngredients}</span>
          )}
        </button>
      </div>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-400 font-medium bg-white rounded-2xl border border-dashed border-gray-200">No messages yet</div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 items-start bg-white rounded-2xl border p-4 shadow-sm transition-all ${msg.resolved ? 'border-gray-100 opacity-60' : 'border-blue-100'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm ${msg.from === 'kitchen' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                {msg.from === 'kitchen' ? '🍳' : '👔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-800 text-sm">{msg.sender}</p>
                  <span className="text-xs text-gray-400">
                    {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : ''}
                  </span>
                  {msg.resolved && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">Seen</span>}
                </div>
                <p className="text-gray-700 text-sm mt-1">{msg.text}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!msg.resolved && (
                  <button onClick={() => markResolved(msg.id)} className="p-2 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Mark as seen">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteMsg(msg.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingredients Tab */}
      {tab === 'ingredients' && (
        <div className="space-y-3">
          {ingredients.length === 0 && (
            <div className="text-center py-12 text-gray-400 font-medium bg-white rounded-2xl border border-dashed border-gray-200">No ingredient requests</div>
          )}
          {ingredients.map(item => (
            <div key={item.id} className={`flex items-center gap-3 bg-white rounded-xl border p-4 shadow-sm ${item.purchased ? 'opacity-50 border-gray-100' : 'border-orange-100'}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.purchased ? 'bg-green-400' : 'bg-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-bold ${item.purchased ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item.name}</p>
                <p className="text-xs text-gray-500">Qty: {item.quantity} · By: {item.requestedBy}</p>
              </div>
              <div className="flex gap-1">
                {!item.purchased && (
                  <button onClick={() => markPurchased(item.id)} className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Purchased
                  </button>
                )}
                <button onClick={() => deletIng(item.id)} className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
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
