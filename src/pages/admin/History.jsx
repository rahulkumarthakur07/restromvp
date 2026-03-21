import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { History as HistoryIcon, Clock, User, DollarSign, Trash2, ChevronDown, ChevronUp, Printer, Download } from 'lucide-react';
import { generatePDFReceipt } from '../../utils/pdfGenerator';

export default function History() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [settings, setSettings] = useState({});

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
            <div class="flex">
              <span>${i.quantity}x ${i.name}</span>
              <span>Rs. ${(i.price * i.quantity).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="flex bold">
            <span>TOTAL</span>
            <span>Rs. ${order.totalAmount?.toFixed(2) || '0.00'}</span>
          </div>
          <div class="center" style="margin-top: 20px;">
            <div>Thank you for your visit!</div>
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-12 flex flex-col justify-center items-center text-gray-400">
            <HistoryIcon className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-medium">No order history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {orders.map(order => (
                  <React.Fragment key={order.id}>
                  <tr 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 flex items-center">
                          {expandedOrderId === order.id ? <ChevronUp className="w-4 h-4 mr-1 text-gray-400" /> : <ChevronDown className="w-4 h-4 mr-1 text-gray-400" />}
                          #{order.tokenNumber || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500 ml-5">Table {order.tableId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-800 font-medium">{order.customerName || 'Guest'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'Served' ? 'bg-purple-100 text-purple-800' : 
                        order.status === 'Ready' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{order.timestamp?.toDate ? new Date(order.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-gray-900">Rs. {order.totalAmount?.toFixed(2)}</span>
                        <span className={`text-xs font-bold ${order.paid ? 'text-green-600' : 'text-red-500'}`}>
                          {order.paid ? 'PAID' : 'UNPAID'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedOrderId === order.id && (
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <td colSpan="5" className="px-6 py-6">
                        <div className="max-w-3xl flex justify-between items-start">
                          <div className="flex-1 pr-8">
                            <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-widest opacity-80">Order Contents</h4>
                            <ul className="space-y-2">
                              {order.items?.map((item, idx) => (
                                 <li key={idx} className="flex justify-between items-center text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-lg border border-gray-100">
                                   <span>{item.quantity}x {item.name}</span>
                                   <span>Rs. {(item.price * item.quantity).toFixed(2)}</span>
                                 </li>
                              ))}
                            </ul>
                            
                            {order.message && (
                              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-widest block mb-1">Customer Note</span>
                                <p className="text-sm font-medium text-amber-900">{order.message}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="w-56 flex flex-col items-end shrink-0 space-y-3 pt-4 border-l border-gray-200 pl-6">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handlePrint(order); }} 
                              className="text-gray-700 w-full justify-center bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center transition-colors shadow-sm"
                            >
                              <Printer className="w-4 h-4 mr-2"/> Print Receipt
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); generatePDFReceipt(order, settings); }} 
                              className="text-blue-600 w-full justify-center bg-blue-50 border border-blue-200 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center transition-colors shadow-sm"
                            >
                              <Download className="w-4 h-4 mr-2"/> Download PDF
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }} 
                              className="text-red-600 w-full justify-center bg-red-white border border-red-200 hover:bg-red-50 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center transition-colors shadow-sm mt-4"
                            >
                              <Trash2 className="w-4 h-4 mr-2"/> Delete Order
                            </button>
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
    </div>
  );
}
