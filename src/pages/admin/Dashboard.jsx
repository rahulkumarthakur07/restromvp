import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Clock, ChefHat, CheckCircle2, UtensilsCrossed, DollarSign, User, Printer, Download, Share2, Hotel } from 'lucide-react';
import { generatePDFReceipt } from '../../utils/pdfGenerator';
import LoaderScreen from '../../components/LoaderScreen';
import { useNotificationSound } from '../../hooks/useNotificationSound';
import { useRef } from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({});
  const [cabins, setCabins] = useState([]);
  const playNotification = useNotificationSound();
  const initialLoad = useRef(true);
  const [receiptModal, setReceiptModal] = useState(null);
  const { isDark } = useDarkMode();

  // Helper to display a friendly table label
  const formatTableLabel = (tableId) => {
    if (!tableId) return '—';
    if (String(tableId).startsWith('cabin-')) {
      const cabinId = String(tableId).replace('cabin-', '');
      const cabin = cabins.find(c => c.id === cabinId);
      return cabin ? cabin.name : 'Cabin';
    }
    if (tableId === 'Walk-in') return 'Walk-in';
    return `#${tableId}`;
  };

  const isCabin = (tableId) => String(tableId || '').startsWith('cabin-');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (e) {}
    };
    fetchSettings();

    // Live cabins listener
    const cabinUnsub = onSnapshot(collection(db, 'cabins'), snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => cabinUnsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!initialLoad.current) {
        const hasNew = snapshot.docChanges().some(change => change.type === 'added');
        if (hasNew) playNotification();
      } else {
        initialLoad.current = false;
      }
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateOrderField = async (orderId, field, value) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { [field]: value });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert("Failed to update.");
    }
  };

  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Bill #${order.tokenNumber}</title>
          <style>
            body { font-family: monospace; width: 300px; margin: 0 auto; padding: 20px; color: #000; }
            .center { text-align: center; }
            .flex { display: flex; justify-content: space-between; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            img { max-width: 100px; display: block; margin: 0 auto 10px; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="center">
            ${settings.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
            <div class="bold" style="font-size: 1.2em">${settings.name || 'Restaurant Name'}</div>
            ${settings.address ? `<div>${settings.address.replace(/\n/g, '<br/>')}</div>` : ''}
            ${settings.pan ? `<div>PAN: ${settings.pan}</div>` : ''}
            <div class="divider"></div>
            <div>RECEIPT</div>
            <div>Order #${order.tokenNumber} | Table ${order.tableId}</div>
            <div>Date: ${new Date().toLocaleString()}</div>
            ${order.customerName ? `<div>Customer: ${order.customerName}</div>` : ''}
            ${order.customerPhone ? `<div>Phone: ${order.customerPhone}</div>` : ''}
            <div class="divider"></div>
          </div>
          ${order.items.map(i => `
            <div class="flex" style="margin-bottom: 4px;">
              <span>${i.quantity}x ${i.name}</span>
              <span>${settings.currency || 'Rs.'} ${( (i.price) * i.quantity).toFixed(0)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="flex" style="margin-bottom: 4px;">
            <span>Subtotal</span>
            <span>${settings.currency || 'Rs.'} ${(order.subtotal || order.totalAmount).toFixed(0)}</span>
          </div>
          ${order.serviceChargeAmount ? `
            <div class="flex" style="margin-bottom: 4px;">
              <span>Service Charge (${settings.serviceChargeRate}%)</span>
              <span>${settings.currency || 'Rs.'} ${order.serviceChargeAmount.toFixed(0)}</span>
            </div>
          ` : ''}
          ${order.taxAmount ? `
            <div class="flex" style="margin-bottom: 4px;">
              <span>VAT (${settings.taxRate}%)</span>
              <span>${settings.currency || 'Rs.'} ${order.taxAmount.toFixed(0)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="flex bold" style="font-size: 1.2em; margin-top: 5px;">
            <span>TOTAL</span>
            <span>${settings.currency || 'Rs.'} ${order.totalAmount?.toFixed(0) || '0'}</span>
          </div>
          <div class="center" style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
            <div>Thank you for your visit!</div>
            <div>Powered by RestroMVP</div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleDownloadReceipt = async (order) => {
    await generatePDFReceipt(order, settings);
  };

  const handleShareReceipt = async (order) => {
    const text = `Receipt for Order #${order.tokenNumber}\nTotal: Rs. ${order.totalAmount.toFixed(2)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Restaurant Receipt',
          text: text,
        });
      } else {
        alert("Sharing not supported on this browser.");
      }
    } catch (e) {}
  };

  if (loading) {
    return <LoaderScreen message="Loading Dashboard..." type="minimal" />;
  }

  const COLUMNS = [
    { id: 'Pending', label: 'New Orders', icon: Clock, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    { id: 'InKitchen', label: 'Sent to Kitchen', icon: ChefHat, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    { id: 'Ready', label: 'Ready to Serve', icon: CheckCircle2, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    { id: 'Served', label: 'Served', icon: UtensilsCrossed, bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  ];

  const TABLE_COLORS = isDark ? [
    '#991B1B', '#1E40AF', '#065F46', '#92400E', '#5B21B6', 
    '#9D174D', '#155E75', '#9A3412', '#3730A3', '#0F766E'
  ] : [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
  ];
  const getTableColor = (id) => TABLE_COLORS[(id - 1) % TABLE_COLORS.length] || (isDark ? '#1f2937' : '#f3f4f6');

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Live Orders Dashboard</h1>
          <p className="text-gray-500 font-medium mt-0.5 text-sm">Manage kitchen workflow and payments</p>
        </div>
        <div className="flex space-x-3">
          <div className="text-center px-4 py-2 bg-blue-50 rounded-xl">
            <span className="block text-2xl font-bold text-blue-700">{orders.filter(o => o.status !== 'Served' && o.status !== 'Completed').length}</span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">Active</span>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 rounded-xl">
            <span className="block text-2xl font-bold text-green-700">{orders.filter(o => o.status === 'Served').length}</span>
            <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Served</span>
          </div>
          {orders.some(o => !['Pending', 'InKitchen', 'Ready', 'Served', 'Completed'].includes(o.status)) && (
            <div className="text-center px-4 py-2 bg-red-50 rounded-xl animate-pulse">
              <span className="block text-2xl font-bold text-red-700">{orders.filter(o => !['Pending', 'InKitchen', 'Ready', 'Served', 'Completed'].includes(o.status)).length}</span>
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide font-black">Trouble</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-x-auto pb-4 pt-2 gap-4 snap-x snap-mandatory lg:flex lg:flex-nowrap hide-scrollbar min-h-0">
        {(() => {
          const mainCols = COLUMNS.map(col => ({ 
            ...col, 
            orders: orders.filter(o => o.status === col.id) 
          }));
          const unsortedOrders = orders.filter(o => !['Pending', 'InKitchen', 'Ready', 'Served', 'Completed', 'Preparing'].includes(o.status));
          
          const finalCols = [...mainCols];
          if (unsortedOrders.length > 0) {
            finalCols.unshift({ 
              id: 'Unsorted', 
              label: 'Fix Status', 
              icon: Clock, 
              bg: 'bg-red-50', 
              border: 'border-red-200', 
              text: 'text-red-700',
              orders: unsortedOrders
            });
          }
          
          return finalCols.map(col => {
            const colOrders = col.orders;
            const ColIcon = col.icon;
            
            return (
              <div key={col.id} className="flex flex-col min-h-0 bg-gray-100/50 rounded-3xl p-4 border border-gray-200/60 w-[85vw] shrink-0 snap-center lg:w-80">
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1.5 rounded-lg ${col.bg} ${col.text}`}>
                      <ColIcon className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-gray-800">{col.label}</h2>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner ${col.bg} ${col.text} border ${col.border}`}>
                    {colOrders.length}
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto">
                  {colOrders.map(order => (
                    <div key={order.id} className={`bg-white rounded-2xl shadow-sm border ${col.border} overflow-hidden flex flex-col hover:shadow-md transition-shadow`}>
                      
                      <div className={`p-4 flex flex-col gap-3 border-b ${col.border} ${col.bg}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-sm text-white shrink-0 border border-white/10"
                              style={{ backgroundColor: isCabin(order.tableId) ? (isDark ? '#4338CA' : '#6366F1') : getTableColor(order.tableId) }}
                            >
                              {isCabin(order.tableId)
                                ? <><Hotel className="w-6 h-6 mb-0.5" /><span className="text-[10px] font-black uppercase leading-none">CABIN</span></>
                                : <><span className="text-[10px] font-black uppercase leading-none mb-0.5 opacity-90">{order.tableId === 'Walk-in' ? '🚶' : 'Table'}</span><span className="text-2xl font-black leading-none">{order.tableId === 'Walk-in' ? '' : order.tableId}</span></>}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex flex-col items-start justify-center">
                                {col.id !== 'Served' && col.id !== 'Completed' ? (
                                  <div className={`font-black text-4xl tracking-tighter ${col.text} drop-shadow-sm leading-none pt-1`}>
                                    #{orders.filter(o => o.status !== 'Served' && o.status !== 'Completed' && o.id !== order.id && o.timestamp && order.timestamp && o.timestamp.seconds < order.timestamp.seconds).length + 1}
                                  </div>
                                ) : (
                                  <div className={`font-black text-2xl tracking-tighter ${col.text} leading-none pt-1`}>
                                    #{order.tokenNumber}
                                  </div>
                                )}
                                {isCabin(order.tableId) && (
                                  <div className="text-sm font-black text-indigo-700 mt-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                    {formatTableLabel(order.tableId).replace('🏠 ', '')}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-bold text-gray-500 flex items-center mt-1">
                                <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {((order.customerName || order.customerPhone) || order.message) && (
                          <div className="flex flex-col gap-2 mt-2">
                            {(order.customerName || order.customerPhone) && (
                              <div className="flex items-center space-x-2 text-sm text-gray-700 bg-white/70 p-2.5 rounded-xl border border-white">
                                <User className="w-4 h-4 text-gray-500 shrink-0" />
                                <span className="font-bold truncate">
                                  {order.customerName || 'Guest'} {order.customerPhone && <span className="text-gray-500 font-medium ml-1">({order.customerPhone})</span>}
                                </span>
                              </div>
                            )}
                            {order.message && (
                              <div className="bg-yellow-100 text-yellow-800 p-3 rounded-xl border border-yellow-200 text-sm font-bold shadow-sm flex items-start">
                                <span className="mr-2 text-yellow-600">📝</span>
                                <span>{order.message}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 flex-1">
                        <ul className="space-y-2.5 mb-2">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex items-start text-sm">
                              <span className="font-bold text-gray-400 w-6 shrink-0">{item.quantity}x</span>
                              <span className="font-medium text-gray-800">{item.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {(order.taxAmount > 0 || order.serviceChargeAmount > 0) && (
                        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-100 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            <span>Subtotal</span>
                            <span>{settings.currency || 'Rs.'} {(order.subtotal || (order.totalAmount - (order.taxAmount || 0) - (order.serviceChargeAmount || 0))).toFixed(0)}</span>
                          </div>
                          {order.serviceChargeAmount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-amber-600 uppercase tracking-tighter">
                              <span>S. Charge</span>
                              <span>{settings.currency || 'Rs.'} {order.serviceChargeAmount.toFixed(0)}</span>
                            </div>
                          )}
                          {order.taxAmount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase tracking-tighter">
                              <span>VAT</span>
                              <span>{settings.currency || 'Rs.'} {order.taxAmount.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                            <span className="font-black text-gray-950 leading-none text-base">{settings.currency || 'Rs.'} {order.totalAmount?.toFixed(0)}</span>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => {
                                const msg = window.prompt("Enter message for table (blank to clear):", order.adminMessage || "");
                                if (msg !== null) updateOrderField(order.id, 'adminMessage', msg);
                              }}
                              className="p-1.5 rounded-full text-gray-500 hover:text-blue-600 hover:bg-white transition-colors border border-transparent shadow-sm hover:shadow"
                              title="Message Table"
                            >
                              <span className="text-sm leading-none block">💬</span>
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to completely delete this order?")) {
                                  try { await deleteDoc(doc(db, 'orders', order.id)); } catch (e) { alert("Failed to delete."); }
                                }
                              }}
                              className="p-1.5 rounded-full text-gray-500 hover:text-red-600 hover:bg-white transition-colors border border-transparent shadow-sm hover:shadow"
                              title="Delete Order"
                            >
                              <span className="text-sm leading-none block">🗑️</span>
                            </button>
                            <button 
                              onClick={() => handlePrint(order)}
                              className="p-1.5 rounded-full text-gray-500 hover:text-blue-600 hover:bg-white transition-colors border border-transparent shadow-sm hover:shadow"
                              title="Print Bill"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            
                            {col.id !== 'Served' && (
                              <button 
                                onClick={() => updateOrderField(order.id, 'paid', !order.paid)}
                                className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                                  order.paid 
                                    ? 'bg-green-100 text-green-700 border-green-200' 
                                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'
                                }`}
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>{order.paid ? 'PAID' : 'UNPAID'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className={`${col.id === 'Served' ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2'} pt-2 border-t border-gray-200`}>
                          {col.id === 'Pending' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'InKitchen')} className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-black transition-colors flex items-center justify-center space-x-2">
                              <ChefHat className="w-4 h-4" />
                              <span>Send to Kitchen</span>
                            </button>
                          )}
                          {col.id === 'Unsorted' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'Pending')} className="col-span-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-black transition-colors flex items-center justify-center space-x-2">
                              <span>Initialize as New Order</span>
                            </button>
                          )}
                          {col.id === 'InKitchen' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'Ready')} className="col-span-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-sm font-black transition-colors flex items-center justify-center space-x-2">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark as Ready to Serve</span>
                            </button>
                          )}
                          {col.id === 'Ready' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'Served')} className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-sm font-bold transition-colors">
                              Mark as Served
                            </button>
                          )}
                          {col.id === 'Served' && (
                            <>
                              <button 
                                onClick={() => setReceiptModal(order)}
                                className={`col-span-2 py-3 rounded-xl text-sm font-black transition-colors border-2 shadow-sm flex items-center justify-center space-x-2 ${
                                  order.paid 
                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                }`}
                              >
                                <DollarSign className="w-5 h-5" />
                                <span className="text-base tracking-wide">{order.paid ? 'PAYMENT RECEIVED' : 'MARK AS PAID'}</span>
                              </button>
                              <button onClick={() => updateOrderField(order.id, 'status', 'Ready')} className="col-span-2 text-gray-400 hover:text-gray-600 py-1 rounded-xl text-xs font-bold transition-colors">
                                Undo (Return to Ready)
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-medium text-sm">
                      No orders
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 text-center relative">
              <button onClick={() => setReceiptModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center pb-0.5">
                x
              </button>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-1">Payment Received</h2>
              <p className="text-gray-500 font-medium">Order #{receiptModal.tokenNumber} is now complete.</p>
            </div>

            <div className="p-6 space-y-3 bg-gray-50">
              <button 
                onClick={() => handlePrint(receiptModal)}
                className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 py-3 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm"
              >
                <Printer className="w-5 h-5 mr-3 text-gray-500" />
                Print Receipt
              </button>

              <button 
                onClick={() => handleDownloadReceipt(receiptModal)}
                className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 py-3 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm"
              >
                <Download className="w-5 h-5 mr-3 text-gray-500" />
                Download Receipt
              </button>

              <button 
                onClick={() => handleShareReceipt(receiptModal)}
                className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 py-3 rounded-xl font-bold flex items-center justify-center transition-colors shadow-sm"
              >
                <Share2 className="w-5 h-5 mr-3 text-gray-500" />
                Share Receipt
              </button>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <button 
                onClick={async () => {
                  try {
                    await updateOrderField(receiptModal.id, 'paid', true);
                    await updateOrderField(receiptModal.id, 'status', 'Completed');
                    setReceiptModal(null);
                  } catch (e) {
                    console.error("Error archiving order", e);
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl shadow-lg shadow-green-200 transition-colors"
              >
                Done & Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
