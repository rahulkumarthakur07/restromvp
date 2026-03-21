import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrder } from '../../context/OrderContext';
import { Loader2, CheckCircle2, Clock, ChefHat, ArrowLeft, UtensilsCrossed, ReceiptText, Download, X } from 'lucide-react';
import { generatePDFReceipt } from '../../utils/pdfGenerator';

export default function OrderStatus() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { activeOrders } = useOrder();
  
  const [liveOrders, setLiveOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [dismissedBills, setDismissedBills] = useState(() => JSON.parse(localStorage.getItem('resmvp_dismissed_bills') || '[]'));
  
  // For manually viewing a bill from the list
  const [viewBillOrder, setViewBillOrder] = useState(null);

  useEffect(() => {
    localStorage.setItem('resmvp_dismissed_bills', JSON.stringify(dismissedBills));
  }, [dismissedBills]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) setSettings(snap.data());
      } catch (e) {}
    };
    fetchSettings();

    if (!activeOrders || activeOrders.length === 0) {
      setLoading(false);
      return;
    }

    const unsubscribes = [];
    let loadedCount = 0;

    activeOrders.forEach(orderRef => {
      const unsub = onSnapshot(
        doc(db, 'orders', orderRef.id),
        (docSnap) => {
          if (docSnap.exists()) {
            setLiveOrders(prev => ({
              ...prev,
              [orderRef.id]: { id: docSnap.id, ...docSnap.data() }
            }));
          }
          loadedCount++;
          if (loadedCount >= activeOrders.length) setLoading(false);
        },
        (error) => {
          console.error("Error listening to order:", error);
          loadedCount++;
          if (loadedCount >= activeOrders.length) setLoading(false);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [activeOrders]);

  const handleDownloadReceipt = (order) => {
    generatePDFReceipt(order, settings);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading your orders...</p>
      </div>
    );
  }

  if (Object.keys(liveOrders).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">No Active Orders</h2>
        <p className="text-gray-500 mb-6">You haven't placed any orders yet.</p>
        <button 
          onClick={() => navigate(`/table/${tableId}`)}
          className="bg-blue-600 font-black text-white px-8 py-4 rounded-xl shadow-lg border-2 border-transparent hover:bg-blue-700 transition-colors"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  const statusConfig = {
    'Pending': { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Order Received' },
    'Preparing': { icon: ChefHat, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'In the Kitchen' },
    'Ready': { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', text: 'Ready to Serve' },
    'Served': { icon: UtensilsCrossed, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', text: 'Served - Enjoy!' },
    'Completed': { icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', text: 'Order Complete' },
  };

  const ordersList = Object.values(liveOrders)
    .filter(o => o.status !== 'Completed')
    .sort((a,b) => {
      const timeA = a.timestamp?.seconds || 0;
      const timeB = b.timestamp?.seconds || 0;
    return timeB - timeA;
  });

  const orderToPopup = ordersList.find(o => o.status === 'Served' && !dismissedBills.includes(o.id));
  const activeModalOrder = viewBillOrder || orderToPopup;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(`/table/${tableId}`)} className="p-2 -ml-2 hover:bg-gray-50 rounded-full text-gray-700">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Your Orders</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        {ordersList.map(order => {
          const currentStatus = statusConfig[order.status] || statusConfig['Pending'];
          const StatusIcon = currentStatus.icon;

          return (
            <div key={order.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col mb-6">
              <div className={`p-6 flex flex-col items-center justify-center text-center space-y-4 border-b ${currentStatus.bg} ${currentStatus.border}`}>
                <div className={`w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center ${currentStatus.color}`}>
                  <StatusIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${currentStatus.color}`}>{currentStatus.text}</h2>
                  <div className="bg-white/80 backdrop-blur inline-flex px-3 py-1 rounded-lg mt-2 font-mono font-bold text-sm border border-black/5 items-center justify-center shadow-sm">
                    Queue #{order.tokenNumber}
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                  <h3 className="font-bold text-gray-800">Items Ordered</h3>
                  <span className="text-xs font-bold text-gray-400">
                    {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                  </span>
                </div>
                <div className="space-y-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-gray-700 text-sm">
                      <div className="flex items-center space-x-3">
                        <span className="bg-gray-100 text-gray-600 font-bold w-6 h-6 rounded flex items-center justify-center shrink-0">
                          {item.quantity}
                        </span>
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-lg font-black text-gray-900 border-b pb-4 mb-4`}>
                  <span>Total</span>
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>

                {(order.status === 'Served' || order.status === 'Completed') && (
                  <button 
                    onClick={() => setViewBillOrder(order)}
                    className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold py-3 rounded-xl transition-colors border border-gray-200 flex items-center justify-center space-x-2"
                  >
                    <ReceiptText className="w-5 h-5 text-gray-500" />
                    <span>View Bill</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
        
        <button 
          onClick={() => navigate(`/table/${tableId}`)}
          className="w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-4 rounded-xl transition-colors shadow-sm mt-4"
        >
          + Add More Items (New Order)
        </button>
      </main>

      {/* Bill Modal */}
      {activeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-black text-gray-800 flex items-center">
                <ReceiptText className="w-5 h-5 mr-2 text-gray-500" /> Digital Bill
              </h2>
              <button 
                onClick={() => {
                  if (orderToPopup && orderToPopup.id === activeModalOrder.id) {
                    setDismissedBills(p => [...p, activeModalOrder.id]);
                  }
                  setViewBillOrder(null);
                }} 
                className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-white flex-1 relative print-area">
              <div className="text-center mb-6">
                {settings.logo && <img src={settings.logo} className="h-12 w-auto mx-auto mb-3 grayscale opacity-80" alt="Logo"/>}
                <h3 className="text-xl font-black text-gray-900">{settings.name || 'Restaurant'}</h3>
                {settings.pan && <p className="text-xs text-gray-500 font-semibold mt-1">PAN: {settings.pan}</p>}
              </div>

              <div className="flex justify-between text-sm font-bold text-gray-500 mb-4 pb-2 border-b-2 border-dashed border-gray-200">
                <span>Table {activeModalOrder.tableId}</span>
                <span>Queue #{activeModalOrder.tokenNumber}</span>
              </div>

              <div className="space-y-3 mb-6">
                {activeModalOrder.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-800">{i.quantity}x {i.name}</span>
                    <span className="font-bold text-gray-600">${(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-gray-200 text-lg">
                <span className="font-black text-gray-900">Total Due</span>
                <span className="font-black text-gray-900">${activeModalOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              <button 
                onClick={() => handleDownloadReceipt(activeModalOrder)}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                <Download className="w-5 h-5" />
                <span>Download Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
