import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ChefHat, CheckCircle2, UtensilsCrossed, Clock } from 'lucide-react';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useRef } from 'react';
import { useNotificationSound } from '../../hooks/useNotificationSound';

export default function WaiterDashboard() {
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
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!initialLoad.current) {
        const hasNew = snapshot.docChanges().some(change => change.type === 'added');
        if (hasNew) playNotification();
      } else {
        initialLoad.current = false;
      }
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // We keep a history of today's served/completed but mostly focus on active
      const activeOrRecent = data.filter(o => 
        o.status !== 'Completed' || (o.timestamp && (Date.now() - o.timestamp.seconds * 1000 < 86400000))
      );
      setOrders(activeOrRecent);
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
    { id: 'Pending', label: 'New Orders', icon: Clock, bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
    { id: 'InKitchen', label: 'Sent to Kitchen', icon: ChefHat, bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    { id: 'Ready', label: 'Ready to Serve', icon: CheckCircle2, bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    { id: 'Served', label: 'Served', icon: UtensilsCrossed, bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' }
  ];

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-2 border-blue-600 rounded-full border-b-transparent"></div></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Waiter Dashboard</h1>
        <p className="text-gray-500 font-medium tracking-tight">Monitor kitchen progress and serve ready orders.</p>
      </div>

      <div className="flex-1 min-h-0 flex overflow-x-auto pb-6 pt-2 gap-6 snap-x snap-mandatory lg:grid lg:grid-cols-4 hide-scrollbar">
        {COLUMNS.map(col => {
          const colOrders = orders.filter(o => o.status === col.id);
          const ColIcon = col.icon;
          
          return (
            <div key={col.id} className="flex flex-col h-full bg-gray-100/50 rounded-3xl p-4 border border-gray-200/60 w-[85vw] shrink-0 snap-center lg:w-auto">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${col.bg} ${col.text}`}>
                    <ColIcon className="w-5 h-5" />
                  </div>
                  <h2 className="font-bold text-gray-800">{col.label}</h2>
                </div>
                <div className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                  {colOrders.length}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-12">
                {colOrders.map(order => (
                  <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-black shadow-sm order-id-pill">
                          #{order.tokenNumber}
                        </div>
                        <div className="text-right">
                          <span className={`block font-black ${String(order.tableId).startsWith('cabin-') ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 text-[13px] leading-tight max-w-[100px] text-right truncate' : 'text-gray-800 text-lg'}`}>
                            {formatTableLabel(order.tableId)}
                          </span>
                          <span className={`block text-[10px] font-bold uppercase tracking-widest mt-0.5 ${order.paid ? 'text-green-600' : 'text-red-500'}`}>
                            {order.paid ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 mb-4">
                        {order.items.map((item, i) => (
                           <div key={i} className="flex justify-between text-sm font-medium text-gray-700">
                             <div className="flex space-x-2">
                               <span className="font-bold text-gray-400">{item.quantity}x</span>
                               <span>{item.name}</span>
                             </div>
                           </div>
                        ))}
                      </div>
                      {order.message && (
                        <div className="bg-amber-50 text-amber-800 p-2 text-xs font-bold rounded-lg mb-3 border border-amber-100">
                          {order.message}
                        </div>
                      )}
                    </div>
                    
                    {/* Waiter Actions */}
                    <div className="pt-3 border-t border-gray-100">
                      {col.id === 'Pending' && (
                        <button onClick={() => updateStatus(order.id, 'InKitchen')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center space-x-2">
                          <ChefHat className="w-4 h-4" />
                          <span>Send to Kitchen</span>
                        </button>
                      )}
                      {col.id === 'InKitchen' && (
                        <div className="text-center text-xs font-bold text-orange-600 uppercase tracking-widest py-2 bg-orange-50 rounded-xl border border-orange-100">
                          Kitchen is cooking...
                        </div>
                      )}
                      {col.id === 'Ready' && (
                        <button onClick={() => updateStatus(order.id, 'Served')} className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200 font-black py-3 rounded-xl transition-all active:scale-95 text-sm uppercase tracking-wider">
                          Mark as Served
                        </button>
                      )}
                      {col.id === 'Served' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateStatus(order.id, 'Completed')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-xl transition-colors text-sm">
                            Complete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 py-8">
                    <ColIcon className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-gray-500 font-medium text-sm">No orders here</span>
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
