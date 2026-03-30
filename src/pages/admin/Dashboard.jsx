import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Clock, ChefHat, CheckCircle2, UtensilsCrossed, DollarSign, User, Printer, Download, Share2, Hotel, Zap, LayoutDashboard, MessageSquare, Trash2, FileText, Footprints, Wallet, X, Search } from 'lucide-react';
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
  const { isDark } = useDarkMode('light');

  // Payment & Udhar State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUdharModal, setShowUdharModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [paymentCustomerName, setPaymentCustomerName] = useState('');
  const [paymentCustomerPhone, setPaymentCustomerPhone] = useState('');
  const [udharSearch, setUdharSearch] = useState('');
  const [newUdharName, setNewUdharName] = useState('');
  const [newUdharPhone, setNewUdharPhone] = useState('');
  const [selectedUdharForConfirm, setSelectedUdharForConfirm] = useState(null);

  const formatTableLabel = (tableId) => {
    if (!tableId) return 'â€”';
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

    const cabinUnsub = onSnapshot(collection(db, 'cabins'), snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const personaUnsub = onSnapshot(collection(db, 'personas'), snap => {
      setPersonas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      cabinUnsub();
      personaUnsub();
    };
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

  const finalizePaidOrder = async (method) => {
    if (!pendingOrderData) return;
    try {
      const orderRef = doc(db, 'orders', pendingOrderData.id);
      const updatedOrder = {
        ...pendingOrderData,
        paid: true,
        paymentMethod: method,
        status: 'Completed',
        customerName: paymentCustomerName || pendingOrderData.customerName || 'Guest',
        customerPhone: paymentCustomerPhone || pendingOrderData.customerPhone || '',
        finalizedAt: serverTimestamp()
      };

      await updateDoc(orderRef, {
        paid: true,
        paymentMethod: method,
        status: 'Completed',
        customerName: updatedOrder.customerName,
        customerPhone: updatedOrder.customerPhone,
        finalizedAt: serverTimestamp()
      });

      handlePrint(updatedOrder);
      setShowPaymentModal(false);
      setPendingOrderData(null);
      setPaymentCustomerName('');
      setPaymentCustomerPhone('');
    } catch (error) {
      console.error("Error finalizing paid order:", error);
      alert("Failed to finalize payment.");
    }
  };

  const finalizeUdharOrder = async (personaId, personaName) => {
    if (!pendingOrderData) return;
    try {
      const orderRef = doc(db, 'orders', pendingOrderData.id);
      const updatedOrder = {
        ...pendingOrderData,
        paid: false,
        paymentMethod: 'udhar',
        status: 'Completed',
        customerName: personaName,
        customerPhone: pendingOrderData.customerPhone || '',
        finalizedAt: serverTimestamp()
      };

      // 1. Archive Order
      await updateDoc(orderRef, {
        paid: false,
        paymentMethod: 'udhar',
        status: 'Completed',
        customerName: personaName,
        finalizedAt: serverTimestamp()
      });

      // 2. Update Persona Balance
      const personaRef = doc(db, 'personas', personaId);
      const currentPersona = personas.find(p => p.id === personaId);
      const newBalance = (currentPersona?.balance || 0) + pendingOrderData.totalAmount;
      await updateDoc(personaRef, { balance: newBalance });

      // 3. Record Transaction
      await addDoc(collection(db, 'personas', personaId, 'transactions'), {
        amount: pendingOrderData.totalAmount,
        type: 'order',
        orderId: pendingOrderData.id,
        date: serverTimestamp(),
        description: `Order #${pendingOrderData.tokenNumber} (Archived from Dashboard)`
      });

      handlePrint(updatedOrder);
      setShowUdharModal(false);
      setPendingOrderData(null);
      setSelectedUdharForConfirm(null);
    } catch (error) {
      console.error("Error finalizing udhar order:", error);
      alert("Failed to assign udhar.");
    }
  };

  const handleCreateNewUdhar = async () => {
    if (!newUdharName) return;
    try {
      const docRef = await addDoc(collection(db, 'personas'), {
        name: newUdharName,
        phone: newUdharPhone,
        balance: 0,
        createdAt: serverTimestamp()
      });
      await finalizeUdharOrder(docRef.id, newUdharName);
      setNewUdharName('');
      setNewUdharPhone('');
    } catch (e) {
      alert("Failed to create contact.");
    }
  };

  if (loading) {
    return <LoaderScreen message="Loading Dashboard..." type="minimal" />;
  }

  const COLUMNS = [
    { id: 'Pending', label: 'New Orders', icon: Clock, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
    { id: 'InKitchen', label: 'In Kitchen', icon: ChefHat, color: 'from-orange-400 to-red-500', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-400' },
    { id: 'Ready', label: 'Ready to Serve', icon: CheckCircle2, color: 'from-emerald-400 to-green-600', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-400' },
    { id: 'Served', label: 'Served', icon: UtensilsCrossed, color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
  ];

  const TABLE_COLORS = isDark ? [
    '#991B1B', '#1E40AF', '#065F46', '#92400E', '#5B21B6', 
    '#9D174D', '#155E75', '#9A3412', '#3730A3', '#0F766E'
  ] : [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
  ];
  const getTableColor = (id) => TABLE_COLORS[(id - 1) % TABLE_COLORS.length] || (isDark ? '#1f2937' : '#f3f4f6');

  const activeOrders = orders.filter(o => o.status !== 'Served' && o.status !== 'Completed').length;
  const servedOrders = orders.filter(o => o.status === 'Served').length;
  const troubleOrders = orders.filter(o => !['Pending', 'InKitchen', 'Ready', 'Served', 'Completed'].includes(o.status)).length;

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-100/50 p-5 md:p-6">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap gap-4 justify-between items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest mb-3">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Live Operations</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-gray-950 tracking-tight leading-none">Orders Dashboard</h1>
            <p className="text-gray-400 font-medium mt-1 text-sm">Real-time kitchen workflow & payments</p>
          </div>
          <div className="flex space-x-3">
            <div className="text-center px-5 py-3 bg-white border border-blue-100 rounded-2xl shadow-sm">
              <span className="block text-2xl font-black text-blue-600">{activeOrders}</span>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Active</span>
            </div>
            <div className="text-center px-5 py-3 bg-white border border-emerald-100 rounded-2xl shadow-sm">
              <span className="block text-2xl font-black text-emerald-600">{servedOrders}</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Served</span>
            </div>
            {troubleOrders > 0 && (
              <div className="text-center px-5 py-3 bg-red-50 border border-red-100 rounded-2xl shadow-sm animate-pulse">
                <span className="block text-2xl font-black text-red-600">{troubleOrders}</span>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Trouble</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex overflow-x-auto pb-4 pt-1 gap-4 snap-x snap-mandatory lg:flex lg:flex-nowrap hide-scrollbar min-h-0">
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
              color: 'from-red-500 to-rose-600',
              bg: 'bg-red-50', 
              border: 'border-red-200', 
              text: 'text-red-700',
              dot: 'bg-red-400',
              orders: unsortedOrders
            });
          }
          
          return finalCols.map(col => {
            const colOrders = col.orders;
            const ColIcon = col.icon;
            
            return (
              <div key={col.id} className="flex flex-col min-h-0 bg-gray-100/60 rounded-3xl p-3.5 border border-gray-200/50 w-[85vw] shrink-0 snap-center lg:w-80">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-2xl bg-linear-to-br ${col.color} flex items-center justify-center shadow-lg`}>
                      <ColIcon className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="font-black text-gray-800 text-sm">{col.label}</h2>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${col.bg} ${col.text} ${col.border}`}>
                    {colOrders.length}
                  </div>
                </div>

                <div className="flex-1 space-y-3.5 overflow-y-auto">
                  {colOrders.map(order => (
                    <div key={order.id} className={`bg-white rounded-2xl border ${col.border} overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300`}>
                      
                      {/* Order Header */}
                      <div className={`p-4 flex flex-col gap-2.5 border-b ${col.border} ${col.bg}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-13 h-13 rounded-2xl flex flex-col items-center justify-center shadow-sm text-white shrink-0 border border-white/20"
                              style={{ 
                                width: 52, height: 52,
                                backgroundColor: isCabin(order.tableId) ? (isDark ? '#4338CA' : '#6366F1') : getTableColor(order.tableId) 
                              }}
                            >
                              {isCabin(order.tableId)
                                ? <><Hotel className="w-5 h-5 mb-0.5" /><span className="text-[9px] font-black uppercase leading-none">CABIN</span></>
                                : order.tableId === 'Walk-in'
                                ? <><Footprints className="w-5 h-5 mb-0.5" /><span className="text-[9px] font-black uppercase leading-none">Walk-in</span></>
                                : <><span className="text-[9px] font-black uppercase leading-none mb-0.5 opacity-90">Table</span><span className="text-xl font-black leading-none">{order.tableId}</span></>}
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
                                  <div className="text-xs font-black text-indigo-700 mt-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                                    {formatTableLabel(order.tableId)}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-bold text-gray-400 flex items-center mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {((order.customerName || order.customerPhone) || order.message) && (
                          <div className="flex flex-col gap-1.5 mt-1">
                            {(order.customerName || order.customerPhone) && (
                              <div className="flex items-center space-x-2 text-sm text-gray-700 bg-white/70 p-2 rounded-xl border border-white">
                                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-bold truncate text-xs">
                                  {order.customerName || 'Guest'} {order.customerPhone && <span className="text-gray-400 font-medium">({order.customerPhone})</span>}
                                </span>
                              </div>
                            )}
                            {order.message && (
                              <div className="bg-yellow-50 text-yellow-800 p-2.5 rounded-xl border border-yellow-200 text-xs font-bold flex items-start">
                                <FileText className="w-4 h-4 mr-1.5 text-yellow-500 shrink-0" />
                                <span>{order.message}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Items */}
                      <div className="p-4 flex-1">
                        <ul className="space-y-2 mb-1">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex items-start text-sm">
                              <span className="font-black text-gray-300 w-6 shrink-0 text-xs">{item.quantity}x</span>
                              <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Tax Breakdown */}
                      {(order.taxAmount > 0 || order.serviceChargeAmount > 0) && (
                        <div className="px-4 py-2 bg-gray-50/70 border-t border-gray-100 space-y-1">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            <span>Subtotal</span>
                            <span>{settings.currency || 'Rs.'} {(order.subtotal || (order.totalAmount - (order.taxAmount || 0) - (order.serviceChargeAmount || 0))).toFixed(0)}</span>
                          </div>
                          {order.serviceChargeAmount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                              <span>S. Charge</span>
                              <span>{settings.currency || 'Rs.'} {order.serviceChargeAmount.toFixed(0)}</span>
                            </div>
                          )}
                          {order.taxAmount > 0 && (
                            <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                              <span>VAT</span>
                              <span>{settings.currency || 'Rs.'} {order.taxAmount.toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                            <span className="font-black text-gray-950 leading-none text-base">{settings.currency || 'Rs.'} {order.totalAmount?.toFixed(0)}</span>
                          </div>
                          <div className="flex space-x-1.5">
                            <button 
                              onClick={() => {
                                const msg = window.prompt("Enter message for table (blank to clear):", order.adminMessage || "");
                                if (msg !== null) updateOrderField(order.id, 'adminMessage', msg);
                              }}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Message Table"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm("Delete this order?")) {
                                  try { await deleteDoc(doc(db, 'orders', order.id)); } catch (e) { alert("Failed to delete."); }
                                }
                              }}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handlePrint(order)}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Print Bill"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            
                            {col.id !== 'Served' && (
                              <button 
                                onClick={() => updateOrderField(order.id, 'paid', !order.paid)}
                                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-black transition-all border ${
                                  order.paid 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>{order.paid ? 'PAID' : 'UNPAID'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className={`${col.id === 'Served' ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2'} pt-2 border-t border-gray-100/80`}>
                          {col.id === 'Pending' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'InKitchen')} className="col-span-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-orange-100">
                              <ChefHat className="w-4 h-4" />
                              <span>Send to Kitchen</span>
                            </button>
                          )}
                          {col.id === 'Unsorted' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'Pending')} className="col-span-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-red-100">
                              <span>Initialize as New Order</span>
                            </button>
                          )}
                          {col.id === 'InKitchen' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'Ready')} className="col-span-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center space-x-2 shadow-lg shadow-emerald-100">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Mark as Ready</span>
                            </button>
                          )}
                          {col.id === 'Ready' && (
                            <button onClick={() => updateOrderField(order.id, 'status', 'Served')} className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-purple-100">
                              Mark as Served
                            </button>
                          )}
                          {col.id === 'Served' && (
                            <>
                              <button 
                                onClick={() => {
                                  setPendingOrderData(order);
                                  setPaymentCustomerName(order.customerName || '');
                                  setPaymentCustomerPhone(order.customerPhone || '');
                                  setShowPaymentModal(true);
                                }}
                                className="col-span-2 py-3 rounded-2xl text-sm font-black transition-all active:scale-95 border-2 shadow-sm flex items-center justify-center space-x-2 bg-gray-950 text-white border-gray-950 hover:bg-black"
                              >
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                <span>PAY & ARCHIVE</span>
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
                    <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-300 font-bold text-sm gap-2">
                      <ColIcon className="w-6 h-6 opacity-30" />
                      <span className="text-xs font-black uppercase tracking-widest">No orders</span>
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 text-center relative space-y-4">
              <button onClick={() => setReceiptModal(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center transition-colors">
                âœ•
              </button>
              <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-950 mb-1">Payment Received</h2>
                <p className="text-gray-400 font-medium text-sm">Order #{receiptModal.tokenNumber} is complete.</p>
              </div>
            </div>

            <div className="p-6 space-y-3 bg-gray-50/50">
              <button 
                onClick={() => handlePrint(receiptModal)}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Printer className="w-4 h-4 mr-2 text-gray-500" />
                Print Receipt
              </button>

              <button 
                onClick={() => handleDownloadReceipt(receiptModal)}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2 text-gray-500" />
                Download Receipt
              </button>

              <button 
                onClick={() => handleShareReceipt(receiptModal)}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Share2 className="w-4 h-4 mr-2 text-gray-500" />
                Share Receipt
              </button>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white">
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
                className="w-full bg-gray-950 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                Done & Archive Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POS-style Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 text-center relative space-y-2 bg-emerald-50/30">
              <button onClick={() => setShowPaymentModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 bg-white border border-gray-100 hover:bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center transition-colors shadow-sm">
                ✕
              </button>
              <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Select Payment</h2>
              <p className="text-gray-500 font-medium text-sm">How is the customer paying {settings.currency || 'Rs.'} {pendingOrderData?.totalAmount}?</p>
            </div>

            <div className="p-6 space-y-4 bg-white">
              <div className="space-y-3 pb-4 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  value={paymentCustomerName}
                  onChange={e => setPaymentCustomerName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                />
                <input
                  type="text"
                  placeholder="Phone Number (Optional)"
                  value={paymentCustomerPhone}
                  onChange={e => setPaymentCustomerPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2.5">
                <button 
                  onClick={() => finalizePaidOrder('cash')}
                  className="w-full group hover:bg-emerald-50 border-2 border-gray-100 hover:border-emerald-200 py-4 rounded-2xl transition-all active:scale-95 flex items-center px-5 shrink-0"
                >
                  <div className="w-10 h-10 bg-gray-50 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center text-xl transition-colors">💵</div>
                  <div className="ml-4 text-left">
                    <div className="font-black text-gray-900 group-hover:text-emerald-700 text-[13px] leading-tight mb-0.5">Pay with Cash</div>
                    <div className="text-[10px] font-bold text-gray-400">Physical currency</div>
                  </div>
                </button>

                <button 
                  onClick={() => finalizePaidOrder('card')}
                  className="w-full group hover:bg-blue-50 border-2 border-gray-100 hover:border-blue-200 py-4 rounded-2xl transition-all active:scale-95 flex items-center px-5 shrink-0"
                >
                  <div className="w-10 h-10 bg-gray-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-xl transition-colors">💳</div>
                  <div className="ml-4 text-left">
                    <div className="font-black text-gray-900 group-hover:text-blue-700 text-[13px] leading-tight mb-0.5">Pay with Card / Online</div>
                    <div className="text-[10px] font-bold text-gray-400">UPI/QR/Card</div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowUdharModal(true);
                  }}
                  className="w-full group hover:bg-red-50 border-2 border-gray-100 hover:border-red-200 py-4 rounded-2xl transition-all active:scale-95 flex items-center px-5 shrink-0"
                >
                  <div className="w-10 h-10 bg-gray-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center text-xl transition-colors">📒</div>
                  <div className="ml-4 text-left">
                    <div className="font-black text-gray-900 group-hover:text-red-700 text-[13px] leading-tight mb-0.5">Charge to Udhar</div>
                    <div className="text-[10px] font-bold text-gray-400">Add to customer ledger</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Udhar Modal */}
      {showUdharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[650px] animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-950">Add to Ledger</h2>
                  <p className="text-sm font-bold text-gray-400">Assign {settings.currency || 'Rs.'} {pendingOrderData?.totalAmount} to a customer's Udhar</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUdharModal(false); setSelectedUdharForConfirm(null); }} 
                className="w-12 h-12 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors"
                title="Cancel"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              <div className="w-full md:w-1/2 flex flex-col bg-white border-r border-gray-100 shrink-0">
                <div className="p-5 border-b border-gray-50 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search existing persons..."
                      value={udharSearch}
                      onChange={e => setUdharSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-red-400 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {personas.filter(p => p.name.toLowerCase().includes(udharSearch.toLowerCase())).map(p => {
                    const isSelected = selectedUdharForConfirm?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedUdharForConfirm(p)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${isSelected ? 'bg-red-50 border-red-300 shadow-sm' : 'bg-white border-gray-100 hover:border-red-200 hover:bg-red-50/30'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl font-black flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 group-hover:bg-red-400 group-hover:text-white'}`}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[15px] font-black text-gray-900 leading-tight">{p.name}</p>
                            {p.phone && <p className="text-xs text-gray-400 font-bold">{p.phone}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${p.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Rs. {Math.abs(p.balance || 0).toFixed(0)}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{p.balance > 0 ? 'Owes You' : 'You Owe'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full md:w-1/2 flex flex-col bg-gray-50/50 p-6 sm:p-8 overflow-y-auto">
                {selectedUdharForConfirm ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 max-w-[320px] mx-auto w-full">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white">
                      <span className="text-4xl font-black text-red-500">{selectedUdharForConfirm.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="space-y-2 mb-8">
                      <h3 className="text-2xl font-black text-gray-950 leading-tight">Assign to <br/>{selectedUdharForConfirm.name}?</h3>
                      <p className="text-gray-500 font-bold text-sm bg-white border border-gray-200 py-2 px-4 rounded-xl mt-2">
                        Add <span className="text-red-600 font-black">Rs. {pendingOrderData?.totalAmount}</span> to their ledger
                      </p>
                    </div>
                    
                    <div className="w-full space-y-3">
                      <button 
                        onClick={() => finalizeUdharOrder(selectedUdharForConfirm.id, selectedUdharForConfirm.name)} 
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Confirm Assignment
                      </button>
                      <button 
                        onClick={() => setSelectedUdharForConfirm(null)} 
                        className="w-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-600 py-4 rounded-2xl font-black transition-all active:scale-95 text-xs uppercase tracking-widest"
                      >
                        Cancel & Go Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center max-w-[320px] mx-auto w-full animate-in fade-in duration-300">
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-black text-gray-950 mb-1">Create New Ledger</h3>
                      <p className="text-sm text-gray-500 font-bold">Add a new person to your Udhar contacts, or select an existing one.</p>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Full Name *"
                        value={newUdharName}
                        onChange={e => setNewUdharName(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-red-400 focus:shadow-md transition-all shadow-sm"
                      />
                      <input
                        type="text"
                        placeholder="Phone Number (Optional)"
                        value={newUdharPhone}
                        onChange={e => setNewUdharPhone(e.target.value)}
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-red-400 focus:shadow-md transition-all shadow-sm"
                      />
                      <button
                        onClick={handleCreateNewUdhar}
                        disabled={!newUdharName}
                        className="w-full bg-gray-950 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 mt-2"
                      >
                        Create & Assign to {newUdharName || 'New'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


