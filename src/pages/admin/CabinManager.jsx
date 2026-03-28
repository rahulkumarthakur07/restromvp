import React, { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, onSnapshot, doc, deleteDoc,
  updateDoc, serverTimestamp, orderBy, query, getDocs, where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Hotel, Plus, Trash2, Edit3, Check, X, Image as ImageIcon, Receipt, Users, PhoneCall, Crown } from 'lucide-react';

const EMPTY = { name: '', description: '', price: '', capacity: '', image: '' };

function CombinedBillModal({ cabin, onClose, onCheckout }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!cabin.tableId) { setLoadingOrders(false); return; }
        const q = query(collection(db, 'orders'), where('tableId', '==', String(cabin.tableId)));
        const snap = await getDocs(q);
        const tableOrders = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(o => o.status !== 'Served' && o.status !== 'Completed');
        setOrders(tableOrders);
      } catch (e) { console.error(e); }
      setLoadingOrders(false);
    };
    fetchOrders();
  }, [cabin]);

  const foodTotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const cabinTotal = cabin.price || 0;
  const grandTotal = foodTotal + cabinTotal;
  const printRef = useRef();

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Bill</title><style>
      body{font-family:monospace;padding:20px;max-width:320px;margin:auto}
      .title{text-align:center;font-size:20px;font-weight:bold;margin-bottom:10px}
      .divider{border-top:1px dashed #333;margin:8px 0}
      .row{display:flex;justify-content:space-between;font-size:13px;margin:3px 0}
      .total{font-size:16px;font-weight:bold}
    </style></head><body>${printRef.current?.innerHTML || ''}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-gray-950">Combined Bill</h2>
              <p className="text-xs text-gray-400 font-medium">{cabin.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={printRef}>
          {/* Cabin fee */}
          <div className="bg-indigo-50 rounded-3xl p-4 border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">🏠 Cabin / VIP Fee</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-black text-gray-950">{cabin.name}</p>
                {cabin.bookedBy && <p className="text-xs text-gray-400 font-medium mt-0.5">Guest: {cabin.bookedBy}</p>}
              </div>
              <p className="font-black text-indigo-600 text-xl">Rs. {cabinTotal.toFixed(0)}</p>
            </div>
          </div>

          {/* Food orders */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">🍽️ Food Orders</p>
            {loadingOrders ? (
              <div className="text-center py-6 text-gray-400 text-sm font-medium">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6 text-gray-300 text-sm font-black bg-gray-50 rounded-2xl border border-dashed border-gray-200">No active food orders</div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Order #{order.tokenNumber || order.id.slice(0, 6)}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${order.paid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        {order.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm font-bold text-gray-600">
                        <span>{item.quantity}× {item.name}</span>
                        <span>Rs. {(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-sm mt-2 pt-2 border-t border-gray-200 text-gray-800">
                      <span>Subtotal</span>
                      <span>Rs. {(order.totalAmount || 0).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grand total */}
          <div className="border-t-2 border-dashed border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-400 font-bold">
              <span>Food Total</span><span>Rs. {foodTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm text-indigo-600 font-bold">
              <span>Cabin Fee</span><span>Rs. {cabinTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-gray-950 mt-1 pt-3 border-t border-gray-100">
              <span>Grand Total</span><span>Rs. {grandTotal.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="p-5 flex gap-3 border-t border-gray-50">
          <button
            onClick={handlePrint}
            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95 border border-gray-200"
          >
            🖨️ Print
          </button>
          <button
            onClick={() => onCheckout(cabin.id)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Checkout & Free
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ cabin, onClose, onBook }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tableId, setTableId] = useState('');
  const [saving, setSaving] = useState(false);
  const [tableOptions, setTableOptions] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const [tabSnap, cabSnap] = await Promise.all([
        getDocs(query(collection(db, 'tables'), orderBy('number'))),
        getDocs(query(collection(db, 'cabins'), orderBy('name'))),
      ]);
      setTableOptions([
        { value: '', label: '— None —' },
        ...tabSnap.docs.map(d => ({ value: String(d.data().number), label: `Table ${d.data().number}` })),
        ...cabSnap.docs.filter(d => d.id !== cabin.id).map(d => ({ value: `cabin-${d.id}`, label: `🏠 ${d.data().name}` })),
      ]);
    };
    fetch();
  }, [cabin.id]);

  const handleBook = async () => {
    if (!name.trim()) { alert('Enter guest name'); return; }
    setSaving(true);
    await onBook(cabin.id, { name: name.trim(), phone: phone.trim(), tableId });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-gray-950">Book {cabin.name}</h2>
              <p className="text-xs text-indigo-500 font-black">Rs. {cabin.price} / session</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Guest Name *</label>
            <input type="text" placeholder="e.g. Ramesh Sharma" value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300 transition-all bg-gray-50" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Phone (optional)</label>
            <input type="tel" placeholder="+977 98XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300 transition-all bg-gray-50" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Link to Table (for combined bill)</label>
            <select value={tableId} onChange={e => setTableId(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-300 transition-all bg-gray-50 appearance-none cursor-pointer">
              {tableOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <button onClick={handleBook} disabled={saving || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest mt-2">
            {saving ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CabinManager() {
  const [cabins, setCabins] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [bookingModal, setBookingModal] = useState(null);
  const [billModal, setBillModal] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'cabins'), orderBy('name'));
    const unsub = onSnapshot(q, snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        capacity: form.capacity ? Number(form.capacity) : null,
        image: form.image.trim(),
        ...(editId ? {} : { status: 'available', createdAt: serverTimestamp() }),
      };
      if (editId) {
        await updateDoc(doc(db, 'cabins', editId), payload);
      } else {
        await addDoc(collection(db, 'cabins'), payload);
      }
      setForm(EMPTY); setEditId(null); setShowForm(false);
    } catch (err) {
      console.error(err); alert('Failed to save cabin.');
    } finally { setSaving(false); }
  };

  const startEdit = (cabin) => {
    setForm({ name: cabin.name || '', description: cabin.description || '', price: cabin.price || '', capacity: cabin.capacity || '', image: cabin.image || '' });
    setEditId(cabin.id); setShowForm(true);
  };

  const bookCabin = async (id, { name, phone, tableId }) => {
    await updateDoc(doc(db, 'cabins', id), {
      status: 'booked', bookedBy: name, bookingPhone: phone || '',
      tableId: tableId || '', bookedAt: serverTimestamp(), bookedByRole: 'admin',
    });
  };

  const checkout = async (id) => {
    await updateDoc(doc(db, 'cabins', id), {
      status: 'available', bookedBy: null, bookingPhone: null,
      tableId: null, bookedAt: null, bookedByRole: null,
    });
    setBillModal(null);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this cabin?')) return;
    await deleteDoc(doc(db, 'cabins', id));
  };

  const available = cabins.filter(c => c.status !== 'booked').length;
  const booked = cabins.filter(c => c.status === 'booked').length;

  return (
    <div className="space-y-6 max-w-5xl pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {bookingModal && <BookingModal cabin={bookingModal} onClose={() => setBookingModal(null)} onBook={bookCabin} />}
      {billModal && <CombinedBillModal cabin={billModal} onClose={() => setBillModal(null)} onCheckout={checkout} />}

      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <Crown className="w-4 h-4" />
              <span>Cabins & VIP</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">
              VIP Room Manager
            </h1>
            <p className="text-gray-400 font-medium">Manage, book, and checkout cabins & VIP rooms.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-5 py-3 bg-white border border-emerald-100 rounded-2xl shadow-sm">
              <span className="block text-2xl font-black text-emerald-600">{available}</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Available</span>
            </div>
            <div className="text-center px-5 py-3 bg-white border border-indigo-100 rounded-2xl shadow-sm">
              <span className="block text-2xl font-black text-indigo-600">{booked}</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Booked</span>
            </div>
            <button
              onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-gray-950 hover:bg-black text-white font-black px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Cabin
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={save} className="bg-white rounded-4xl border border-indigo-100 shadow-xl p-6 md:p-8 space-y-5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Hotel className="w-4 h-4" />
              </div>
              <h2 className="font-black text-gray-950">{editId ? 'Edit Cabin' : 'New Cabin'}</h2>
            </div>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required placeholder="Cabin name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="col-span-2 md:col-span-1 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 transition-all" />
            <input placeholder="Capacity (persons)" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} type="number" min="1"
              className="border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 transition-all" />
            <input required placeholder="Price per session (Rs.) *" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} type="number" min="0"
              className="border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 transition-all" />
            <input placeholder="Image URL (optional)" value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
              className="col-span-2 md:col-span-1 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 transition-all" />
            <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="col-span-2 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 resize-none transition-all" rows={2} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY); }}
              className="px-6 py-3 rounded-2xl border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-3 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50">
              {saving ? 'Saving...' : editId ? 'Update Cabin' : 'Create Cabin'}
            </button>
          </div>
        </form>
      )}

      {/* Cabin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cabins.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-4xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
              <Hotel className="w-10 h-10 text-indigo-100" />
            </div>
            <p className="font-black text-gray-300 text-xl mb-2">No cabins yet</p>
            <p className="text-gray-300 font-medium text-sm">Click "Add Cabin" to create your first VIP room.</p>
          </div>
        )}

        {cabins.map(cabin => (
          <div key={cabin.id} className={`group bg-white rounded-4xl border overflow-hidden flex flex-col shadow-sm hover:shadow-2xl transition-all duration-500 ${cabin.status === 'booked' ? 'border-indigo-200 shadow-indigo-50' : 'border-gray-100'}`}>
            {/* Image or gradient placeholder */}
            {cabin.image ? (
              <img src={cabin.image} alt={cabin.name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-linear-to-br from-indigo-50 via-purple-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-indigo-100/50 to-purple-100/50" />
                <ImageIcon className="w-12 h-12 text-indigo-200 relative z-10" />
              </div>
            )}

            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-black text-gray-950 text-lg tracking-tight">{cabin.name}</h3>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-2xl uppercase tracking-widest border shrink-0 ml-2 ${
                  cabin.status === 'booked'
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                }`}>
                  {cabin.status === 'booked' ? '● Booked' : '● Free'}
                </span>
              </div>

              {cabin.description && <p className="text-sm text-gray-400 font-medium mb-3 leading-relaxed">{cabin.description}</p>}

              <div className="flex items-center gap-4 mb-3">
                <p className="font-black text-indigo-600">Rs. {cabin.price} <span className="text-xs font-bold text-indigo-300">/ session</span></p>
                {cabin.capacity && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 font-bold">
                    <Users className="w-3 h-3" />Up to {cabin.capacity}
                  </p>
                )}
              </div>

              {/* Booking info */}
              {cabin.status === 'booked' && (
                <div className="bg-indigo-50 rounded-2xl p-3.5 border border-indigo-100 mb-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-800">
                    <Users className="w-3 h-3 text-indigo-400" />{cabin.bookedBy}
                  </div>
                  {cabin.bookingPhone && (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                      <PhoneCall className="w-3 h-3 text-indigo-400" />{cabin.bookingPhone}
                    </div>
                  )}
                  {cabin.tableId && (
                    <div className="text-xs font-bold text-indigo-500">🪑 Linked: {cabin.tableId}</div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                {cabin.status === 'available' ? (
                  <button
                    onClick={() => setBookingModal(cabin)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2.5 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-indigo-200"
                  >
                    <Plus className="w-3.5 h-3.5" /> Book Now
                  </button>
                ) : (
                  <button
                    onClick={() => setBillModal(cabin)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2.5 rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-100"
                  >
                    <Receipt className="w-3.5 h-3.5" /> Checkout & Bill
                  </button>
                )}
                <button onClick={() => startEdit(cabin)} className="bg-gray-50 hover:bg-gray-100 text-gray-600 font-black py-2.5 px-3.5 rounded-2xl text-xs flex items-center justify-center transition-all active:scale-95 border border-gray-100">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => remove(cabin.id)} className="bg-red-50 hover:bg-red-100 text-red-500 font-black py-2.5 px-3.5 rounded-2xl text-xs flex items-center justify-center transition-all active:scale-95 border border-red-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

