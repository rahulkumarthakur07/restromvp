import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { History as HistoryIcon, Trash2, ChevronDown, ChevronUp, Printer, Download } from 'lucide-react';
import { generatePDFReceipt } from '../../utils/pdfGenerator';

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
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
        if (docSnap.exists()) setSettings(docSnap.data());
      } catch (e) {}
    };
    fetchSettings();
    getDocs(collection(db, 'cabins')).then(snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }).catch(() => {});
    const fetchHistory = async () => {
      try {
        const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        const sn = await getDocs(q);
        setOrders(sn.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    const html = `<html><head><title>Bill #${order.tokenNumber}</title>
      <style>body{font-family:monospace;width:300px;margin:0 auto;padding:20px;color:#000}.center{text-align:center}.flex{display:flex;justify-content:space-between}.divider{border-bottom:1px dashed #000;margin:10px 0}img{max-width:100px;display:block;margin:0 auto 10px}.bold{font-weight:bold}</style>
      </head><body>
      <div class="center">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo" />` : ''}
        <div class="bold" style="font-size:1.2em">${settings.name || 'Restaurant Name'}</div>
        ${settings.address ? `<div>${settings.address.replace(/\n/g, '<br/>')}</div>` : ''}
        ${settings.pan ? `<div>PAN: ${settings.pan}</div>` : ''}
        <div class="divider"></div>
        <div>RECEIPT</div>
        <div>Order #${order.tokenNumber} | ${formatTableLabel(order.tableId)}</div>
        <div>Date: ${new Date().toLocaleString()}</div>
        ${order.customerName ? `<div>Customer: ${order.customerName}</div>` : ''}
        <div class="divider"></div>
      </div>
      ${order.items?.map(i => `<div class="flex" style="margin-bottom:4px"><span>${i.quantity}x ${i.name}</span><span>${settings.currency || 'Rs.'} ${(i.price * i.quantity).toFixed(0)}</span></div>`).join('')}
      <div class="divider"></div>
      <div class="flex bold" style="font-size:1.2em;margin-top:5px"><span>TOTAL</span><span>${settings.currency || 'Rs.'} ${order.totalAmount?.toFixed(0) || '0'}</span></div>
      <div class="center" style="margin-top:30px;font-size:0.9em;opacity:0.8"><div>Thank you!</div><div>Powered by RestroMVP</div></div>
      </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Permanently delete this order?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-600/20 rounded-full" />
          <div className="absolute top-0 left-0 w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const statusConfig = {
    Served:    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Served' },
    Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Finished' },
    Ready:     { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-100',    label: 'Ready' },
    InKitchen: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-100',  label: 'In Kitchen' },
    Pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-100',   label: 'Pending' },
  };
  const getStatus = (s) => statusConfig[s] || { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-100', label: s };

  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const paginated = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const PaginationBar = () => totalPages > 1 ? (
    <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-gray-50 gap-3">
      <p className="text-xs font-bold text-gray-400">
        Showing <span className="font-black text-gray-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, orders.length)}</span> of <span className="font-black text-gray-700">{orders.length}</span> orders
      </p>
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-2xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-all active:scale-95">← Prev</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .reduce((acc, p, idx, arr) => { if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...'); acc.push(p); return acc; }, [])
          .map((p, idx) => p === '...'
            ? <span key={`d${idx}`} className="px-2 text-gray-300 font-black">…</span>
            : <button key={p} onClick={() => setCurrentPage(p)} className={`w-9 h-9 rounded-2xl text-xs font-black transition-all active:scale-95 ${currentPage === p ? 'bg-gray-950 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>{p}</button>
          )}
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-2xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-all active:scale-95">Next →</button>
      </div>
    </div>
  ) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-cyan-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-cyan-50 text-cyan-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <HistoryIcon className="w-4 h-4" />
              <span>Order History</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">All Orders Log</h1>
            <p className="text-gray-400 font-medium">Complete record of every order placed in the system.</p>
          </div>
          <div className="flex flex-col items-center justify-center bg-white border border-gray-100 rounded-3xl px-8 py-5 shadow-sm shrink-0">
            <span className="text-4xl font-black text-gray-950 leading-none">{orders.length}</span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Orders</span>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-24 flex flex-col justify-center items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-6">
              <HistoryIcon className="w-10 h-10 text-gray-200" />
            </div>
            <p className="font-black text-gray-300 text-xl mb-2">No orders yet</p>
            <p className="text-gray-300 font-medium text-sm">Orders will appear here once placed.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Table</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(order => {
                    const st = getStatus(order.status);
                    const isExpanded = expandedOrderId === order.id;
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50/60 ${isExpanded ? 'bg-blue-50/30' : ''}`}
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
                                <span className="text-[8px] font-black text-gray-300 uppercase leading-none">SN</span>
                                <span className="text-sm font-black text-gray-800 leading-none">#{order.tokenNumber}</span>
                              </div>
                              <div className="w-5 h-5 text-gray-300">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-black text-gray-950 text-sm">{order.customerName || 'Guest'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-black px-3 py-1.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">{formatTableLabel(order.tableId)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <span className="font-black text-gray-950">{settings.currency || 'Rs.'} {order.totalAmount?.toFixed(0)}</span>
                              <span className={`block text-[10px] font-black uppercase mt-0.5 ${order.paid ? 'text-emerald-600' : 'text-red-400'}`}>{order.paid ? 'Paid' : 'Unpaid'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-2xl border uppercase tracking-tight ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">
                            {order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handlePrint(order)} className="p-2.5 rounded-2xl hover:bg-blue-50 text-gray-300 hover:text-blue-600 transition-all active:scale-95 border border-gray-100"><Printer className="w-4 h-4" /></button>
                            <button onClick={() => generatePDFReceipt(order, settings)} className="p-2.5 rounded-2xl hover:bg-gray-100 text-gray-300 hover:text-gray-700 transition-all active:scale-95 border border-gray-100"><Download className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteOrder(order.id)} className="p-2.5 rounded-2xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all active:scale-95 border border-gray-100"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50/20 border-b border-blue-100/50">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="space-y-2">
                                {order.items?.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-xs font-bold text-gray-700 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                                    <span>{item.quantity}× {item.name}</span>
                                    <span className="text-gray-950">{settings.currency || 'Rs.'} {(item.price * item.quantity).toFixed(0)}</span>
                                  </div>
                                ))}
                                {(order.taxAmount > 0 || order.serviceChargeAmount > 0) && (
                                  <div className="mt-2 pt-2 border-t border-blue-100 space-y-1 px-1">
                                    {order.serviceChargeAmount > 0 && (
                                      <div className="flex justify-between text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                        <span>Service Charge</span><span>{settings.currency || 'Rs.'} {order.serviceChargeAmount.toFixed(0)}</span>
                                      </div>
                                    )}
                                    {order.taxAmount > 0 && (
                                      <div className="flex justify-between text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                        <span>VAT</span><span>{settings.currency || 'Rs.'} {order.taxAmount.toFixed(0)}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                  className="w-full text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2 hover:bg-red-50 py-2.5 rounded-2xl border border-dashed border-red-100 mt-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar />
          </>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="py-20 flex flex-col justify-center items-center bg-white rounded-4xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-6">
              <HistoryIcon className="w-10 h-10 text-gray-200" />
            </div>
            <p className="font-black text-gray-300 text-xl">No orders yet</p>
          </div>
        ) : (
          <>
            {paginated.map(order => {
              const st = getStatus(order.status);
              const isExpanded = expandedOrderId === order.id;
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border transition-all overflow-hidden ${isExpanded ? 'border-blue-200 shadow-xl shadow-blue-50' : 'border-gray-100 shadow-sm'}`}
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  <div className="p-5 flex justify-between items-start">
                    <div className="flex gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-gray-300 uppercase leading-none">SN</span>
                        <span className="text-lg font-black text-gray-800 leading-none">#{order.tokenNumber}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-gray-950 leading-tight mb-1.5">{order.customerName || 'Guest'}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-tight ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{formatTableLabel(order.tableId)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-black text-gray-950 text-base leading-none mb-1">{settings.currency || 'Rs.'}{order.totalAmount?.toFixed(0)}</div>
                      <div className={`text-[9px] font-black uppercase tracking-widest ${order.paid ? 'text-emerald-600' : 'text-red-400'}`}>{order.paid ? 'Paid' : 'Unpaid'}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-50 animate-in slide-in-from-top-1 duration-300 pt-4 space-y-3">
                      <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-bold text-gray-700 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="text-gray-950">{settings.currency || 'Rs.'}{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                        {(order.taxAmount > 0 || order.serviceChargeAmount > 0) && (
                          <div className="mt-2 pt-2 border-t border-gray-50 space-y-1 px-1">
                            {order.serviceChargeAmount > 0 && (
                              <div className="flex justify-between text-[10px] font-bold text-amber-600 uppercase"><span>S. Charge</span><span>{settings.currency || 'Rs.'} {order.serviceChargeAmount.toFixed(0)}</span></div>
                            )}
                            {order.taxAmount > 0 && (
                              <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase"><span>VAT</span><span>{settings.currency || 'Rs.'} {order.taxAmount.toFixed(0)}</span></div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2.5 pt-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handlePrint(order)} className="flex-1 bg-white border border-gray-200 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all">
                          <Printer className="w-3.5 h-3.5 text-blue-500" /> Print
                        </button>
                        <button onClick={() => generatePDFReceipt(order, settings)} className="flex-1 bg-gray-950 text-white py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center justify-between bg-white rounded-3xl border border-gray-100 shadow-sm p-4 gap-3">
                <p className="text-xs font-bold text-gray-400">
                  Showing <span className="font-black text-gray-700">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, orders.length)}</span> of <span className="font-black text-gray-700">{orders.length}</span>
                </p>
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-2xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-all active:scale-95">← Prev</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => { if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...'); acc.push(p); return acc; }, [])
                    .map((p, idx) => p === '...'
                      ? <span key={`d${idx}`} className="px-2 text-gray-300 font-black">…</span>
                      : <button key={p} onClick={() => setCurrentPage(p)} className={`w-9 h-9 rounded-2xl text-xs font-black transition-all active:scale-95 ${currentPage === p ? 'bg-gray-950 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>{p}</button>
                    )}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-2xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-all active:scale-95">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
