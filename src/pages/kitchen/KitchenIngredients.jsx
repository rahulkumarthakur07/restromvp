import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShoppingBag, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function KitchenIngredients() {
  const [ingredients, setIngredients] = useState([]);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [adding, setAdding] = useState(false);
  const staffName = localStorage.getItem('resmvp_waiter_name') || 'Kitchen Staff';

  useEffect(() => {
    const q = query(collection(db, 'ingredientRequests'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const addIngredient = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await addDoc(collection(db, 'ingredientRequests'), {
        name: name.trim(),
        quantity: qty.trim() || 'Unspecified',
        requestedBy: staffName,
        timestamp: serverTimestamp(),
        purchased: false,
      });
      setName('');
      setQty('');
    } catch (err) {
      console.error(err);
      alert('Failed to add request.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    try { await deleteDoc(doc(db, 'ingredientRequests', id)); } catch (e) { alert('Failed.'); }
  };

  const pending = ingredients.filter(i => !i.purchased);
  const done = ingredients.filter(i => i.purchased);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-orange-600" />
          Ingredient Requests
        </h1>
        <p className="text-gray-500 font-medium text-sm mt-0.5">Request ingredients that need to be purchased. Admin can see and fulfil these.</p>
      </div>

      {/* Add form */}
      <form onSubmit={addIngredient} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="font-bold text-gray-700">Add New Request</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Ingredient name *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
          <input
            type="text"
            placeholder="Quantity (e.g. 2kg)"
            value={qty}
            onChange={e => setQty(e.target.value)}
            className="w-36 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400"
          />
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </form>

      {/* Pending */}
      <div className="space-y-2">
        <h2 className="font-bold text-gray-600 text-sm uppercase tracking-wider">Pending ({pending.length})</h2>
        {pending.length === 0 && (
          <div className="text-center py-8 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 font-medium text-sm">
            No pending requests
          </div>
        )}
        {pending.map(item => (
          <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl border border-orange-100 p-3 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-500">Qty: {item.quantity} · By: {item.requestedBy}</p>
            </div>
            <button onClick={() => remove(item.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Fulfilled */}
      {done.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-gray-400 text-sm uppercase tracking-wider">Purchased ({done.length})</h2>
          {done.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 p-3 opacity-60">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-500 line-through">{item.name}</p>
                <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
              </div>
              <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 p-1.5 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
