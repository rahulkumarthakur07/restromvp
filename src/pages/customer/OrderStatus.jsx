import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, getDoc, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrder } from '../../context/OrderContext';
import { Loader2, CheckCircle2, Clock, ChefHat, ArrowLeft, UtensilsCrossed, ReceiptText, Download, X, Sun, Moon } from 'lucide-react';
import { generatePDFReceipt } from '../../utils/pdfGenerator';
import { useDarkMode } from '../../hooks/useDarkMode';
import LoaderScreen from '../../components/LoaderScreen';
import { decryptTableId } from '../../utils/crypto';
import { useRef } from 'react';
import { useNotificationSound } from '../../hooks/useNotificationSound';

export default function OrderStatus() {
  const { tableId: urlTableId } = useParams();
  const tableId = decryptTableId(urlTableId);
  const navigate = useNavigate();
  const { activeOrders } = useOrder();
  
  const [liveOrders, setLiveOrders] = useState({});
  const [ordersAheadMap, setOrdersAheadMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [dismissedBills, setDismissedBills] = useState(() => JSON.parse(localStorage.getItem('resmvp_dismissed_bills') || '[]'));
  const { isDark, toggleDarkMode } = useDarkMode();
  
  // For manually viewing a bill from the list
  const [viewBillOrder, setViewBillOrder] = useState(null);
  const playNotification = useNotificationSound();
  const prevStatuses = useRef({});

  useEffect(() => {
    localStorage.setItem('resmvp_dismissed_bills', JSON.stringify(dismissedBills));
  }, [dismissedBills]);

  // Handle eSewa Payment Callback
  useEffect(() => {
    const checkEsewaCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const dataParam = searchParams.get('data');
      if (dataParam) {
        try {
          // Decode URL-safe base64
          const decodedStr = atob(dataParam.replace(/-/g, '+').replace(/_/g, '/'));
          const decoded = JSON.parse(decodedStr);
          if (decoded.status === 'COMPLETE') {
            const orderId = decoded.transaction_uuid.split('-')[0];
            await updateDoc(doc(db, 'orders', orderId), { paid: true });
            
            // Remove URL params to prevent re-triggering
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({path: newUrl}, '', newUrl);
            alert("Payment Successful! Thank you.");
          }
        } catch (err) {
          console.error("Error decoding eSewa callback", err);
        }
      }
    };
    checkEsewaCallback();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) setSettings(snap.data());
      } catch (e) {}
    };
    fetchSettings();

    // Live query: ALL non-Completed orders for this table (covers waiter-placed orders too)
    const tableQuery = query(
      collection(db, 'orders'),
      where('tableId', '==', tableId),
      where('status', 'in', ['Pending', 'InKitchen', 'Preparing', 'Ready', 'Served'])
    );

    const unsub = onSnapshot(tableQuery, (snapshot) => {
      const newOrders = {};
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        // Play notification if status changed
        if (prevStatuses.current[id] && prevStatuses.current[id] !== data.status) {
          playNotification();
        }
        prevStatuses.current[id] = data.status;
        newOrders[id] = { id, ...data };
      });
      setLiveOrders(newOrders);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Track dynamic queue of orders ahead
  useEffect(() => {
    if (Object.keys(liveOrders).length === 0) return;

    const q = query(collection(db, 'orders'), where('status', 'in', ['Pending', 'Preparing', 'Ready']));
    const unsub = onSnapshot(q, (snapshot) => {
      const activeAll = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      
      const newMap = {};
      Object.keys(liveOrders).forEach(myOrderId => {
        const myOrder = liveOrders[myOrderId];
        if (myOrder.status === 'Served' || myOrder.status === 'Completed') {
          newMap[myOrderId] = 0;
        } else {
          const countAhead = activeAll.filter(o => 
            o.id !== myOrderId && 
            o.timestamp && myOrder.timestamp && 
            o.timestamp.seconds < myOrder.timestamp.seconds
          ).length;
          newMap[myOrderId] = countAhead;
        }
      });
      setOrdersAheadMap(newMap);
    });

    return () => unsub();
  }, [liveOrders]);

  const handleDownloadReceipt = async (order) => {
    await generatePDFReceipt(order, settings);
  };

  const handleEsewaPayment = async (order) => {
    try {
      // Force clean 2-decimal maximum string and parse back to drop trailing zeros mapping floating point errors.
      const cleanAmountStr = Number(order.totalAmount.toFixed(2)).toString();
      
      if (Number(cleanAmountStr) <= 0) {
        alert("Amount must be greater than 0 to pay with eSewa.");
        return;
      }

      const transactionUuid = `${order.id}-${Date.now()}`;
      const totalAmount = cleanAmountStr;
      const productCode = 'EPAYTEST';
      const secret = '8gBm/:&EnhH.1/q';
      // HMAC SHA256 of: total_amount,transaction_uuid,product_code
      const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
      
      const encoder = new TextEncoder();
      const keyInfo = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign('HMAC', keyInfo, encoder.encode(message));
      const signature = btoa(String.fromCharCode.apply(null, new Uint8Array(signatureBuffer)));

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

      const fields = {
        amount: totalAmount,
        tax_amount: '0',
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: window.location.href.split('?')[0],
        failure_url: window.location.href.split('?')[0],
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature: signature
      };

      Object.keys(fields).forEach(key => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("eSewa payment initiation failed:", err);
      alert("Failed to initiate payment. Please try again.");
    }
  };

  if (loading) {
    return <LoaderScreen message="Loading your orders..." />;
  }

  if (Object.keys(liveOrders).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-950 dark:text-white flex flex-col items-center justify-center p-4 text-center transition-colors duration-300">
        <h2 className="text-2xl font-black text-gray-950 dark:text-white mb-2">No Active Orders</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">You haven't placed any orders yet.</p>
        <button 
          onClick={() => navigate(`/table/${urlTableId}`)}
          className="bg-blue-600 font-black text-white px-8 py-4 rounded-2xl shadow-lg border-2 border-transparent hover:bg-blue-700 transition-all active:scale-95"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-950 dark:text-white pb-24 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(`/table/${urlTableId}`)} className="p-2 -ml-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black text-gray-950 dark:text-white">Your Orders</h1>
        </div>
        <button onClick={toggleDarkMode} className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2.5 rounded-xl transition-all shadow-sm bg-gray-50 dark:bg-gray-800">
          {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 mt-4">
        {ordersList.map(order => {
          const currentStatus = statusConfig[order.status] || statusConfig['Pending'];
          const StatusIcon = currentStatus.icon;

          return (
            <div key={order.id} className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col mb-6">
              
              {/* Admin Message */}
              {order.adminMessage && (
                <div className="bg-blue-50 text-blue-800 p-3 px-6 text-sm font-bold border-b border-blue-100 flex items-center space-x-2">
                  <span className="text-lg">💬</span>
                  <span>Admin: {order.adminMessage}</span>
                </div>
              )}

              <div className={`p-6 flex flex-col items-center justify-center text-center space-y-4 border-b ${currentStatus.bg} ${currentStatus.border}`}>
                <div className={`w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center ${currentStatus.color}`}>
                  <StatusIcon className="w-8 h-8" />
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${currentStatus.color}`}>{currentStatus.text}</h2>
                  
                  {ordersAheadMap[order.id] !== undefined && !['Served', 'Completed'].includes(order.status) ? (
                    <div className="mt-4 flex flex-col items-center">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Your Place in Line</span>
                      <div className="bg-gray-900 text-white dark:bg-white dark:text-gray-900 inline-flex px-6 py-2 rounded-2xl font-black text-5xl tracking-tighter shadow-lg transform transition-transform scale-105">
                        #{ordersAheadMap[order.id] + 1}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-col items-center">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Order Number</span>
                      <div className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 inline-flex px-5 py-2 rounded-xl font-black text-2xl tracking-tighter shadow-sm">
                        #{order.tokenNumber}
                      </div>
                    </div>
                  )}
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
                      <span className="font-bold shrink-0">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                    <span>Subtotal</span>
                    <span>Rs. {(order.subtotal || (order.totalAmount - (order.taxAmount || 0) - (order.serviceChargeAmount || 0))).toFixed(0)}</span>
                  </div>
                  {order.serviceChargeAmount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-amber-600 uppercase">
                      <span>Service Charge</span>
                      <span>Rs. {order.serviceChargeAmount.toFixed(0)}</span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-blue-600 uppercase">
                      <span>VAT</span>
                      <span>Rs. {order.taxAmount.toFixed(0)}</span>
                    </div>
                  )}
                </div>

                <div className={`mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-lg font-black text-gray-950 dark:text-white border-b pb-4 mb-4`}>
                  <div className="flex items-center space-x-2">
                    <span>Total</span>
                    <span className={`text-[10px] ml-2 px-2 py-0.5 rounded-lg text-white font-black border ${order.paid ? 'bg-green-500 border-green-600' : 'bg-amber-500 border-amber-600'}`}>
                      {order.paid ? 'PAID' : 'UNPAID'}
                    </span>
                  </div>
                  <span>Rs. {order.totalAmount.toFixed(0)}</span>
                </div>

                {!order.paid && (
                  <button 
                    onClick={() => handleEsewaPayment(order)}
                    className="w-full bg-[#60bb46] hover:bg-[#52a33b] text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2 mb-3"
                  >
                    <span>Pay with eSewa</span>
                  </button>
                )}

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
          onClick={() => navigate(`/table/${urlTableId}`)}
          className="w-full bg-white dark:bg-gray-900 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800 font-black py-4 rounded-2xl transition-all shadow-sm mt-4 active:scale-95"
        >
          + Add More Items
        </button>
      </main>

      {/* Bill Modal */}
      {activeModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-950 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200 dark:border-gray-800">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h2 className="text-xl font-black text-gray-950 dark:text-white flex items-center">
                <ReceiptText className="w-5 h-5 mr-2 text-blue-600" /> Digital Bill
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
                {settings.logo && <img src={settings.logo} className="h-12 w-auto mx-auto mb-3 grayscale opacity-80 dark:invert" alt="Logo"/>}
                <h3 className="text-xl font-black text-gray-950 dark:text-white">{settings.name || 'Restaurant'}</h3>
                {settings.pan && <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1 uppercase tracking-tight">PAN: {settings.pan}</p>}
              </div>

              <div className="flex justify-between text-xs font-black text-gray-400 dark:text-gray-500 mb-4 pb-2 border-b-2 border-dashed border-gray-100 dark:border-gray-800 uppercase tracking-widest">
                <span>Table {activeModalOrder.tableId}</span>
                <span>Queue #{activeModalOrder.tokenNumber}</span>
              </div>

              <div className="space-y-4 mb-6">
                {activeModalOrder.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm items-center">
                    <span className="font-bold text-gray-800 dark:text-gray-200">{i.quantity}x {i.name}</span>
                    <span className="font-black text-gray-950 dark:text-white">Rs. {(i.price * i.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex justify-between text-sm font-bold text-gray-400 uppercase">
                  <span>Subtotal</span>
                  <span>Rs. {(activeModalOrder.subtotal || (activeModalOrder.totalAmount - (activeModalOrder.taxAmount || 0) - (activeModalOrder.serviceChargeAmount || 0))).toFixed(0)}</span>
                </div>
                {activeModalOrder.serviceChargeAmount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-amber-600 uppercase">
                    <span>Service Charge</span>
                    <span>Rs. {activeModalOrder.serviceChargeAmount.toFixed(0)}</span>
                  </div>
                )}
                {activeModalOrder.taxAmount > 0 && (
                  <div className="flex justify-between text-sm font-bold text-blue-600 uppercase">
                    <span>VAT</span>
                    <span>Rs. {activeModalOrder.taxAmount.toFixed(0)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-5 border-t-2 border-dashed border-gray-100 dark:border-gray-800">
                <span className="font-black text-gray-950 dark:text-white text-lg">Total Due</span>
                <span className="font-black text-blue-600 dark:text-blue-400 text-2xl">Rs. {activeModalOrder.totalAmount.toFixed(0)}</span>
              </div>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
              {!activeModalOrder.paid && (
                <button 
                  onClick={() => handleEsewaPayment(activeModalOrder)}
                  className="w-full bg-[#60bb46] hover:bg-[#52a33b] text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Pay with eSewa</span>
                </button>
              )}
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
