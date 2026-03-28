import React, { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, doc, updateDoc,
  serverTimestamp, orderBy, query, getDocs, where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Hotel, Check, X, Receipt, Users, PhoneCall, Plus } from 'lucide-react';

function CombinedBillModal({ cabin, onClose, onCheckout }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const printRef = useRef();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        if (!cabin.tableId) { setLoadingOrders(false); return; }
        const q = query(collection(db, 'orders'), where('tableId', '==', String(cabin.tableId)));
        const snap = await getDocs(q);
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(o => o.status !== 'Served' && o.status !== 'Completed'));
      } catch (e) { console.error(e); }
      setLoadingOrders(false);
    };
    fetchOrders();
  }, [cabin]);

  const foodTotal = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const cabinTotal = cabin.price || 0;
  const grandTotal = foodTotal + cabinTotal;

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Bill</title><style>
      body{font-family:monospace;padding:20px;max-width:320px;margin:auto}
      .title{text-align:center;font-size:18px;font-weight:bold;margin-bottom:10px}
      .divider{border-top:1px dashed #333;margin:8px 0}
      .row{display:flex;justify-content:space-between;font-size:13px;margin:3px 0}
      .total{font-size:16px;font-weight:bold}
    </style></head><body>${printRef.current?.innerHTML || ''}</body></html>`);
    win.document.close(); win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h2 className="font-black text-gray-800 text-lg">Combined Bill</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" ref={printRef}>
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">🏠 Cabin / VIP</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-black text-gray-800">{cabin.name}</p>
                {cabin.bookedBy && <p className="text-xs text-gray-500">Guest: {cabin.bookedBy}</p>}
                {cabin.tableId && <p className="text-xs text-gray-500">Table: {cabin.tableId}</p>}
              </div>
              <p className="font-black text-indigo-600 text-lg">Rs. {cabinTotal.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">🍽️ Food Orders</p>
            {loadingOrders ? (
              <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">No active food orders for this table</div>
            ) : orders.map(order => (
              <div key={order.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-gray-500">Order #{order.tokenNumber || order.id.slice(0, 6)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.paid ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                    {order.paid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity}× {item.name}</span>
                    <span className="font-medium text-gray-600">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sm mt-1 pt-1 border-t border-gray-200">
                  <span>Subtotal</span><span>Rs. {(order.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-gray-200 pt-4 space-y-1">
            <div className="flex justify-between text-sm text-gray-500 font-medium">
              <span>Food Total</span><span>Rs. {foodTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-indigo-600 font-medium">
              <span>Cabin Fee</span><span>Rs. {cabinTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-black text-gray-900 mt-2">
              <span>Grand Total</span><span>Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex gap-2 border-t border-gray-100">
          <button onClick={handlePrint} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl text-sm transition-colors">
            🖨️ Print
          </button>
          <button onClick={() => onCheckout(cabin.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-black text-gray-800">Book {cabin.name}</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="font-bold text-indigo-700 text-lg">Rs. {cabin.price} / session</p>
          <input type="text" placeholder="Guest name *" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
          <input type="tel" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400" />
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5">Link to Table (for combined bill)</label>
            <select value={tableId} onChange={e => setTableId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 bg-white">
              {tableOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <button onClick={handleBook} disabled={saving || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg disabled:opacity-50">
            {saving ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WaiterCabins() {
  const [cabins, setCabins] = useState([]);
  const [bookingModal, setBookingModal] = useState(null);
  const [billModal, setBillModal] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'cabins'), orderBy('name'));
    const unsub = onSnapshot(q, snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const bookCabin = async (id, { name, phone, tableId }) => {
    await updateDoc(doc(db, 'cabins', id), {
      status: 'booked',
      bookedBy: name,
      bookingPhone: phone || '',
      tableId: tableId || '',
      bookedAt: serverTimestamp(),
      bookedByRole: 'waiter',
    });
  };

  const checkout = async (id) => {
    await updateDoc(doc(db, 'cabins', id), {
      status: 'available', bookedBy: null, bookingPhone: null,
      tableId: null, bookedAt: null, bookedByRole: null,
    });
    setBillModal(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {bookingModal && <BookingModal cabin={bookingModal} onClose={() => setBookingModal(null)} onBook={bookCabin} />}
      {billModal && <CombinedBillModal cabin={billModal} onClose={() => setBillModal(null)} onCheckout={checkout} />}

      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2"><Hotel className="w-7 h-7 text-indigo-600" />Cabin Bookings</h1>
        <p className="text-gray-500 font-medium text-sm mt-0.5">Book cabins and checkout with combined bills.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cabins.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 font-medium bg-white rounded-2xl border border-dashed border-gray-200">
            No cabins available. Ask admin to add cabins first.
          </div>
        )}
        {cabins.map(cabin => (
          <div key={cabin.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${cabin.status === 'booked' ? 'border-indigo-200' : 'border-gray-100'}`}>
            {cabin.image ? (
              <img src={cabin.image} alt={cabin.name} className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-indigo-50 flex items-center justify-center">
                <Hotel className="w-10 h-10 text-indigo-200" />
              </div>
            )}
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-black text-gray-800">{cabin.name}</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cabin.status === 'booked' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                  {cabin.status === 'booked' ? '● Booked' : '● Available'}
                </span>
              </div>
              {cabin.description && <p className="text-sm text-gray-500 mb-2">{cabin.description}</p>}
              <p className="text-sm font-bold text-indigo-700">Rs. {cabin.price} / session</p>
              {cabin.capacity && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" />Up to {cabin.capacity} persons</p>}
              {cabin.status === 'booked' && (
                <div className="mt-2 bg-indigo-50 rounded-xl p-2.5 text-xs font-bold text-indigo-800 space-y-0.5">
                  <div className="flex items-center gap-1"><Users className="w-3 h-3" />{cabin.bookedBy}</div>
                  {cabin.bookingPhone && <div className="flex items-center gap-1"><PhoneCall className="w-3 h-3" />{cabin.bookingPhone}</div>}
                  {cabin.tableId && <div>🪑 Table {cabin.tableId}</div>}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100">
                {cabin.status === 'available' ? (
                  <button onClick={() => setBookingModal(cabin)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Book Cabin
                  </button>
                ) : (
                  <button onClick={() => setBillModal(cabin)} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Receipt className="w-4 h-4" /> Checkout & Combined Bill
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
