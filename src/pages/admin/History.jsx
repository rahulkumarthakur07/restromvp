import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { History as HistoryIcon, Clock, User, DollarSign, Trash2, ChevronDown, ChevronUp, Printer, Download } from 'lucide-react';
import { generatePDFReceipt } from '../../utils/pdfGenerator';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [settings, setSettings] = useState({});
  const [cabins, setCabins] = useState([]);

  const formatTableLabel = (tableId) => {
    if (!tableId) return '—';
    if (String(tableId).startsWith('cabin-')) {
      const cabin = cabins.find(c => c.id === tableId.replace('cabin-', ''));
      return `🏠 ${cabin ? cabin.name : 'Cabin'}`;
    }
    if (tableId === 'Walk-in') return '🚶 Walk-in';
    return `Table ${tableId}`;
  };

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

    // Fetch cabins for label resolution
    getDocs(collection(db, 'cabins')).then(snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});

    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        const sn = await getDocs(q);
        const data = sn.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // In a real app we'd paginate or filter. For MVP, just show all.
        setOrders(data);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

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

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Order History</h1>
          <p className="text-gray-500 font-medium">Log of all orders placed in the system</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 font-bold text-gray-700">
          {orders.length} Total Orders
        </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-24 flex flex-col justify-center items-center text-gray-400">
            <HistoryIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold text-lg">No order history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {orders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr 
                      className={`hover:bg-blue-50/30 transition-all cursor-pointer ${expandedOrderId === order.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 flex items-center">
                            #{order.tokenNumber || 'N/A'}
                            <span className="ml-2 text-[10px] text-gray-400 font-bold uppercase">{formatTableLabel(order.tableId).replace('🏠 ', '').replace('Table ', '#')}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-800 font-black">{order.customerName || 'Guest'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg border ${
                          order.status === 'Served' || order.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-100' : 
                          order.status === 'Ready' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {order.status === 'Completed' ? 'Finished' : order.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-500">
                         {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-gray-900">{settings.currency || 'Rs.'} {order.totalAmount?.toFixed(0)}</span>
                          <span className={`text-[9px] font-black uppercase tracking-tighter ${order.paid ? 'text-green-600' : 'text-red-500'}`}>
                            {order.paid ? 'Digitally Paid' : 'Pending Payment'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    {expandedOrderId === order.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="5" className="px-8 py-8 animate-in slide-in-from-top-2 duration-300">
                          <div className="max-w-4xl flex gap-12">
                            <div className="flex-1">
                              <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Itemized Breakdown</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {order.items?.map((item, idx) => (
                                   <div key={idx} className="flex justify-between items-center text-sm font-bold text-gray-700 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
                                     <span>{item.quantity}x {item.name}</span>
                                     <span>{settings.currency || 'Rs.'} {(item.price * item.quantity).toFixed(0)}</span>
                                   </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="w-64 space-y-3">
                              <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-4">Actions</h4>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handlePrint(order); }} 
                                className="w-full bg-white border border-gray-200 hover:border-blue-400 text-gray-800 px-4 py-3 rounded-2xl font-black text-xs flex items-center justify-center transition-all shadow-sm active:scale-[0.98]"
                              >
                                <Printer className="w-4 h-4 mr-2 text-blue-600"/> Print Receipt
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); generatePDFReceipt(order, settings); }} 
                                className="w-full bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-xs flex items-center justify-center transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
                              >
                                <Download className="w-4 h-4 mr-2"/> Download PDF
                              </button>
                              <div className="pt-4 border-t border-gray-200 mt-4">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} 
                                  className="w-full text-red-500 hover:text-red-700 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5"/> Delete Permanently
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="py-24 flex flex-col justify-center items-center text-gray-400">
            <HistoryIcon className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold">No orders yet.</p>
          </div>
        ) : (
          orders.map(order => (
            <div 
              key={order.id} 
              className={`bg-white rounded-3xl border transition-all overflow-hidden ${expandedOrderId === order.id ? 'border-blue-200 shadow-lg' : 'border-gray-100 shadow-sm'}`}
              onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
            >
              <div className="p-5 flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">SN</span>
                    <span className="text-lg font-black text-gray-800 leading-none">#{order.tokenNumber}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 leading-tight mb-1">{order.customerName || 'Guest'}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tighter">
                        {formatTableLabel(order.tableId).replace('🏠 ', '').replace('Table ', '#')}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400">
                        {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-gray-950 text-lg leading-none mb-1">{settings.currency || 'Rs.'}{order.totalAmount?.toFixed(0)}</div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${order.paid ? 'text-green-600' : 'text-red-500'}`}>
                    {order.paid ? 'Paid' : 'Unpaid'}
                  </div>
                </div>
              </div>

              {expandedOrderId === order.id && (
                <div className="px-5 pb-5 pt-2 border-t border-gray-50 flex flex-col gap-4 animate-in slide-in-from-top-1">
                  <div className="space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="text-gray-950">{settings.currency || 'Rs.'}{(item.price * item.quantity).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePrint(order); }}
                      className="flex-1 bg-white border border-gray-200 py-3 rounded-2xl font-black text-xs flex items-center justify-center shadow-sm"
                    >
                      <Printer className="w-4 h-4 mr-2" /> Print
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); generatePDFReceipt(order, settings); }}
                      className="flex-1 bg-gray-900 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4 mr-2" /> PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
