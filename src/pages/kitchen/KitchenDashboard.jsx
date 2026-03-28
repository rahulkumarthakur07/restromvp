import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ChefHat, Flame, CheckCircle2, Clock } from 'lucide-react';
import { useNotificationSound } from '../../hooks/useNotificationSound';

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(true);
  const playNotification = useNotificationSound();
  const initialLoad = useRef(true);

  const formatTableLabel = (tableId) => {
    if (!tableId) return '';
    if (String(tableId).startsWith('cabin-')) {
      const cabinId = String(tableId).replace('cabin-', '');
      const cabin = cabins.find(c => c.id === cabinId);
      return cabin ? cabin.name : 'Cabin';
    }
    if (tableId === 'Walk-in') return 'Walk-in';
    return `T- ${tableId}`;
  };

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'asc')); // Oldest first for kitchen!
    const unsub = onSnapshot(q, (snapshot) => {
      if (!initialLoad.current) {
         const hasNew = snapshot.docChanges().some(change => change.type === 'added');
         if (hasNew) playNotification();
      } else {
         initialLoad.current = false;
      }

      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Show only orders that have been sent to kitchen or are being cooked/ready
      const activeKitchen = data.filter(o => o.status === 'InKitchen' || o.status === 'Preparing' || o.status === 'Ready');
      setOrders(activeKitchen);
      setLoading(false);
    });

    const cabinUnsub = onSnapshot(collection(db, 'cabins'), snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); cabinUnsub(); };
  }, [playNotification]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
    }
  };

  const COLUMNS = [
    { id: 'InKitchen', label: 'New Tickets', icon: Clock, bg: 'bg-amber-100', text: 'text-amber-800' },
    { id: 'Preparing', label: 'Cooking Now', icon: Flame, bg: 'bg-orange-100', text: 'text-orange-800' },
    { id: 'Ready', label: 'Ready (Awaiting Pickup)', icon: CheckCircle2, bg: 'bg-green-100', text: 'text-green-800' }
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-2 border-orange-600 rounded-full border-b-transparent"></div></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center"><ChefHat className="w-8 h-8 mr-2 text-orange-600"/> Kitchen Display System</h1>
          <p className="text-gray-500 font-bold tracking-tight">Focus on cooking and clearing tickets.</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-x-auto pb-6 pt-2 gap-6 snap-x snap-mandatory lg:grid lg:grid-cols-3 hide-scrollbar">
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.status === col.id);
          const ColIcon = col.icon;
          
          return (
            <div key={col.id} className="flex flex-col h-full bg-gray-100/50 rounded-3xl p-4 border border-gray-200/60 w-[85vw] shrink-0 snap-center lg:w-auto">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${col.bg} ${col.text}`}>
                    <ColIcon className="w-6 h-6" />
                  </div>
                  <h2 className="font-black text-gray-900 text-lg uppercase tracking-tight">{col.label}</h2>
                </div>
                <div className={`px-3 py-1 rounded-xl text-sm font-black shadow-sm ${colOrders.length > 0 ? col.bg + ' ' + col.text : 'bg-white text-gray-400'}`}>
                  {colOrders.length}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-12">
                {colOrders.map(order => (
                  <div key={order.id} className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group border-2 ${col.id === 'Preparing' ? 'border-orange-400 shadow-orange-100' : 'border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-lg text-sm font-black shadow-sm order-id-pill">
                          #{order.tokenNumber}
                        </div>
                        <div className="text-right">
                          <span className={`${String(order.tableId).startsWith('cabin-') ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 text-sm' : 'text-gray-900 text-xl'} font-black`}>
                            {formatTableLabel(order.tableId)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4 mt-3">
                        {order.items.map((item, i) => (
                           <div key={i} className="flex justify-between text-base font-bold text-gray-800 border-b border-gray-50 pb-2">
                             <div className="flex items-start space-x-3">
                               <span className="text-orange-600 w-6">{item.quantity}x</span>
                               <span>{item.name}</span>
                             </div>
                           </div>
                        ))}
                      </div>
                      
                      {order.message && (
                        <div className="bg-amber-50 text-amber-900 p-3 text-sm font-black rounded-xl mb-4 border border-amber-200 shadow-sm flex items-start space-x-2">
                           <span>📝</span>
                           <span>{order.message}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Kitchen Actions */}
                    <div className="pt-3">
                      {col.id === 'InKitchen' && (
                        <button onClick={() => updateStatus(order.id, 'Preparing')} className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 font-black py-4 rounded-xl transition-colors text-base tracking-widest uppercase">
                          Start Cooking
                        </button>
                      )}
                      {col.id === 'Preparing' && (
                        <button onClick={() => updateStatus(order.id, 'Ready')} className="w-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 font-black py-4 rounded-xl transition-all active:scale-95 text-base tracking-widest uppercase flex justify-center items-center space-x-2">
                          <CheckCircle2 className="w-6 h-6"/>
                          <span>Food is Ready!</span>
                        </button>
                      )}
                      {col.id === 'Ready' && (
                        <div className="text-center text-xs font-bold text-green-600 uppercase tracking-widest py-2 bg-green-50 rounded-xl border border-green-100">
                          Waiting for Waiter...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 py-8">
                    <ColIcon className="w-12 h-12 text-gray-400 mb-3" />
                    <span className="text-gray-500 font-bold uppercase tracking-widest text-sm">Clear</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
