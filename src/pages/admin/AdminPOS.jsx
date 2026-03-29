import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShoppingCart, Search, Plus, Minus, Trash2, User, X, Check, ArrowLeft, Hotel, MonitorSmartphone, Receipt, CheckCircle2, Printer, Download, Share2, Wallet } from 'lucide-react';
import { useOrder } from '../../context/OrderContext';

export default function AdminPOS() {
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const { settings } = useOrder();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState([]);
  const [tableNo, setTableNo] = useState('');
  const [cabins, setCabins] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);

  const [applyTax, setApplyTax] = useState(true);
  const [applyServiceCharge, setApplyServiceCharge] = useState(true);
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('none');

  const [personas, setPersonas] = useState([]);
  const [showUdharModal, setShowUdharModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [selectedUdharForConfirm, setSelectedUdharForConfirm] = useState(null);
  
  const [paymentCustomerName, setPaymentCustomerName] = useState('');
  const [paymentCustomerPhone, setPaymentCustomerPhone] = useState('');

  const [newUdharName, setNewUdharName] = useState('');
  const [newUdharPhone, setNewUdharPhone] = useState('');
  const [udharSearch, setUdharSearch] = useState('');

  useEffect(() => {
    const fetchEverything = async () => {
      try {
        const prodSnap = await getDocs(collection(db, 'products'));
        const data = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setProducts(data);
        const cats = new Set(data.map(p => p.category));
        setCategories(['All', ...Array.from(cats).filter(Boolean)]);

        const tabsSnap = await getDocs(query(collection(db, 'tables'), orderBy('number')));
        setTables(tabsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
    };
    fetchEverything();

    const cabinUnsub = onSnapshot(query(collection(db, 'cabins'), orderBy('name')), snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const personaUnsub = onSnapshot(query(collection(db, 'personas'), orderBy('updatedAt', 'desc')), snap => {
      setPersonas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    if (settings) {
      setApplyTax(!!settings.taxEnabled);
      setApplyServiceCharge(!!settings.serviceChargeEnabled);
    }

    return () => { cabinUnsub(); personaUnsub(); }
  }, [settings]);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const subtotal = cart.reduce((sum, i) => {
    const effectivePrice = i.discountPrice || i.price;
    return sum + (effectivePrice * i.quantity);
  }, 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = subtotal * ((parseFloat(discountValue) || 0) / 100);
  } else if (discountType === 'amount') {
    discountAmount = parseFloat(discountValue) || 0;
  }
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);

  const taxAmount = applyTax && settings.taxEnabled ? (discountedSubtotal * (settings.taxRate / 100)) : 0;
  const serviceChargeAmount = applyServiceCharge && settings.serviceChargeEnabled ? (discountedSubtotal * (settings.serviceChargeRate / 100)) : 0;
  const totalAmount = discountedSubtotal + taxAmount + serviceChargeAmount;

  const currency = settings.currency || 'Rs.';
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (product) => {
    if (product.outOfStock) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQ = i.quantity + delta;
        return newQ > 0 ? { ...i, quantity: newQ } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeRow = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const generateTokenNumber = async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const snap = await getDocs(collection(db, 'orders'));
      let maxToken = 0, todayCount = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.timestamp?.toMillis() > today.getTime()) {
          todayCount++;
          if (data.tokenNumber > maxToken) maxToken = data.tokenNumber;
        }
      });
      return maxToken > 0 ? maxToken + 1 : todayCount + 1;
    } catch { return Math.floor(Math.random() * 1000); }
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
          </div>
          <div class="divider"></div>
          ${order.items.map(i => `
            <div class="flex" style="margin-bottom: 4px;">
              <span>${i.quantity}x ${i.name}</span>
              <span>${settings.currency || 'Rs.'} ${(i.price * i.quantity).toFixed(0)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="flex" style="margin-bottom: 4px;">
            <span>Subtotal</span>
            <span>${settings.currency || 'Rs.'} ${(order.subtotal).toFixed(0)}</span>
          </div>
          ${order.discountAmount > 0 ? `
            <div class="flex" style="margin-bottom: 4px;">
              <span>Discount</span>
              <span>- ${settings.currency || 'Rs.'} ${order.discountAmount.toFixed(0)}</span>
            </div>
          ` : ''}
          ${order.serviceChargeAmount ? `
            <div class="flex" style="margin-bottom: 4px;">
              <span>S. Charge</span>
              <span>${settings.currency || 'Rs.'} ${order.serviceChargeAmount.toFixed(0)}</span>
            </div>
          ` : ''}
          ${order.taxAmount ? `
            <div class="flex" style="margin-bottom: 4px;">
              <span>VAT</span>
              <span>${settings.currency || 'Rs.'} ${order.taxAmount.toFixed(0)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="flex" style="font-size: 0.9em; margin-bottom: 4px;">
            <span>Payment Method</span>
            <span style="text-transform: capitalize; font-weight: bold;">${order.paymentMethod === 'udhar' ? 'Credit (Udhar)' : (order.paymentMethod || 'Unpaid')}</span>
          </div>
          <div class="divider"></div>
          <div class="flex bold" style="font-size: 1.2em; margin-top: 5px;">
            <span>TOTAL</span>
            <span>${settings.currency || 'Rs.'} ${order.totalAmount?.toFixed(0) || '0'}</span>
          </div>
          <div class="center" style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
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

  const placeOrder = async (isDirectBill = false) => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const tokenNumber = await generateTokenNumber();
      const orderData = {
        tableId: tableNo,
        items: cart.map(i => ({ 
          id: i.id, 
          name: i.name, 
          price: i.discountPrice || i.price, 
          originalPrice: i.price,
          isDiscounted: !!i.discountPrice,
          quantity: i.quantity 
        })),
        subtotal,
        discountAmount,
        taxAmount,
        serviceChargeAmount,
        totalAmount,
        status: isDirectBill ? 'Served' : 'Pending',
        timestamp: serverTimestamp(),
        customerName: customerName || 'Guest',
        message: message || '',
        paid: false, // Default unpaid until payment method selected in modal
        tokenNumber,
        source: 'admin_pos',
      };

      // Always show Payment Modal for Direct Bills
      if (isDirectBill) {
        setPendingOrderData(orderData);
        setPaymentCustomerName(customerName);
        setPaymentCustomerPhone('');
        setShowPaymentModal(true);
        setLoading(false);
        return;
      }

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      orderData.id = docRef.id;
      
      if (isDirectBill) {
        setReceiptModal(orderData);
      } else {
        setOrderSuccess(tokenNumber);
        setTimeout(() => setOrderSuccess(null), 3000);
      }

      // Reset fields
      setCart([]);
      setCustomerName('');
      setMessage('');
      setIsPaid(false);
      setApplyTax(!!settings.taxEnabled);
      setApplyServiceCharge(!!settings.serviceChargeEnabled);
      setDiscountType('none');
      setDiscountValue('');
      setCartOpen(false);
    } catch (e) {
      console.error(e);
      alert('Failed to place order.');
    }
    setLoading(false);
  };

  const finalizePaidOrder = async (method) => {
    if (!pendingOrderData) return;
    setLoading(true);
    try {
      const finalOrderData = { 
        ...pendingOrderData, 
        paid: true,
        paymentMethod: method,
        customerName: paymentCustomerName || 'Guest',
        customerPhone: paymentCustomerPhone || ''
      };
      const docRef = await addDoc(collection(db, 'orders'), finalOrderData);
      finalOrderData.id = docRef.id;
      
      setShowPaymentModal(false);
      setPendingOrderData(null);
      setReceiptModal(finalOrderData);

      // Reset fields
      setCart([]);
      setCustomerName('');
      setMessage('');
      setApplyTax(!!settings?.taxEnabled);
      setApplyServiceCharge(!!settings?.serviceChargeEnabled);
      setDiscountType('none');
      setDiscountValue('');
      setCartOpen(false);
    } catch (e) {
      console.error(e);
      alert('Failed to process payment.');
    }
    setLoading(false);
  };

  const finalizeUdharOrder = async (personaId, personaName) => {
    if (!pendingOrderData) return;
    setLoading(true);
    try {
      const personaDoc = personas.find(p => p.id === personaId);
      const oldBalance = personaDoc?.balance || 0;
      const isFullyCovered = oldBalance <= -pendingOrderData.totalAmount;

      const finalOrderData = {
        ...pendingOrderData,
        paid: isFullyCovered, // Mark paid only if their positive balance (negative debt) covers the whole bill
        paymentMethod: 'udhar',
        udharPersonaId: personaId,
        customerName: personaName,
      };

      // 1. Create order
      const orderRef = await addDoc(collection(db, 'orders'), finalOrderData);
      finalOrderData.id = orderRef.id;

      // 2. Add transaction to persona
      await addDoc(collection(db, `personas/${personaId}/transactions`), {
        type: 'gave',
        amount: finalOrderData.totalAmount,
        note: `Order #${finalOrderData.tokenNumber}`,
        timestamp: serverTimestamp(),
        orderId: finalOrderData.id
      });

      // 3. Update persona balance
      const newBalance = oldBalance + finalOrderData.totalAmount;
      await updateDoc(doc(db, 'personas', personaId), {
        balance: newBalance,
        updatedAt: serverTimestamp()
      });

      setShowUdharModal(false);
      setPendingOrderData(null);
      setSelectedUdharForConfirm(null);
      setUdharSearch('');
      setNewUdharName('');
      setNewUdharPhone('');
      
      setReceiptModal(finalOrderData);

      // Reset fields
      setCart([]);
      setCustomerName('');
      setMessage('');
      setIsPaid(false);
      setApplyTax(!!settings.taxEnabled);
      setApplyServiceCharge(!!settings.serviceChargeEnabled);
      setDiscountType('none');
      setDiscountValue('');
      setCartOpen(false);

    } catch (e) {
      console.error(e);
      alert('Failed to process Udhar order.');
    }
    setLoading(false);
  };

  const handleCreateNewUdhar = async () => {
    if (!newUdharName) return alert("Name is required");
    setLoading(true);
    try {
      const pRef = await addDoc(collection(db, 'personas'), {
        name: newUdharName,
        phone: newUdharPhone,
        balance: 0,
        updatedAt: serverTimestamp()
      });
      await finalizeUdharOrder(pRef.id, newUdharName);
    } catch (e) {
      console.error(e);
      alert('Failed to create persona.');
      setLoading(false);
    }
  };

  // ── TABLE SELECTION SCREEN ──────────────────────────────────────────────────
  if (!tableNo) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50/60 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />
          <div className="relative">
            <div className="inline-flex items-center space-x-2 bg-rose-50 text-rose-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <MonitorSmartphone className="w-4 h-4" />
              <span>Point of Sale</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">
              Select Table
            </h1>
            <p className="text-gray-400 font-medium max-w-lg">
              Start a new order by selecting a table or choosing Walk-in.
            </p>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          <button
            onClick={() => setTableNo('Walk-in')}
            className="bg-linear-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-6 rounded-4xl shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all flex flex-col items-center justify-center space-y-4 group active:scale-95 min-h-[160px] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150" />
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform shadow-inner">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-black text-lg text-center leading-tight">Walk-in<br/><span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Fast Order</span></h3>
          </button>

          {tables.map(t => (
            <button
              key={t.id}
              onClick={() => setTableNo(t.number.toString())}
              className="bg-white border border-gray-100 hover:border-blue-400 text-gray-800 p-6 rounded-4xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all flex flex-col items-center justify-center space-y-3 group active:scale-95 min-h-[160px] relative"
            >
              <div className="w-16 h-16 bg-gray-50 group-hover:bg-blue-50 rounded-2xl flex items-center justify-center transition-colors border border-gray-100 group-hover:border-blue-100 shadow-sm">
                <span className="text-2xl font-black text-gray-900 group-hover:text-blue-600">{t.number}</span>
              </div>
              <div className="text-center">
                <p className="font-black text-lg text-gray-900 group-hover:text-gray-950">Table {t.number}</p>
                {t.capacity && <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">{t.capacity} seats</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Cabins Grid */}
        {cabins.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <Hotel className="w-4 h-4 text-indigo-400" /> VIP Cabins
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {cabins.map(cabin => (
                <button
                  key={cabin.id}
                  onClick={() => setTableNo(`cabin-${cabin.id}`)}
                  className={`bg-white border text-gray-800 p-6 rounded-4xl shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex flex-col items-center justify-center space-y-3 group active:scale-95 min-h-[160px] relative overflow-hidden ${
                    cabin.status === 'booked' ? 'border-indigo-200 hover:border-indigo-400' : 'border-gray-100 hover:border-indigo-300'
                  }`}
                >
                  {cabin.image ? (
                    <img src={cabin.image} alt={cabin.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-16 h-16 bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-100 rounded-2xl flex items-center justify-center transition-colors shadow-sm">
                      <Hotel className="w-7 h-7 text-indigo-500" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-black text-gray-900 text-base leading-tight">{cabin.name}</p>
                    {cabin.status === 'booked' && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full">
                        Booked
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const renderCartContent = () => (
    <div className="flex flex-col h-full bg-white relative w-full border-l border-gray-100 overflow-hidden shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Cart Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div>
          <h2 className="font-black text-gray-950 text-2xl tracking-tight leading-none mb-1">Order Details</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {tableNo === 'Walk-in' ? 'Walk-in' : `Table ${tableNo}`}
          </p>
        </div>
        <button onClick={() => { setCartOpen(false); }} className="lg:hidden w-10 h-10 bg-white hover:bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors shadow-sm">
          <X className="w-5 h-5" />
        </button>
        <button onClick={() => { setTableNo(''); setCart([]); }} className="hidden lg:flex w-10 h-10 bg-white hover:bg-red-50 hover:text-red-500 border border-gray-200 rounded-full items-center justify-center text-gray-400 transition-colors shadow-sm" title="Clear Order">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-4 bg-white/50">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-3">
            <ShoppingCart className="w-12 h-12 opacity-20" />
            <span className="font-bold text-sm">Cart is empty</span>
          </div>
        ) : cart.map(item => (
          <div key={item.id} className="flex items-start gap-4 bg-white rounded-3xl p-3 border border-gray-100 shadow-sm">
            {item.image || item.imageUrl ? (
              <img src={item.image || item.imageUrl} alt={item.name} className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow-sm border border-gray-50" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-xl">🍽️</div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="font-bold text-gray-900 text-sm truncate leading-tight mb-1">{item.name}</h4>
              {item.discountPrice ? (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm font-black text-green-600">{currency}{item.discountPrice.toFixed(0)}</span>
                  <span className="text-[10px] text-gray-400 line-through font-bold">{currency}{item.price.toFixed(0)}</span>
                </div>
              ) : (
                <p className="text-sm font-black text-blue-600 mb-2">{currency}{item.price.toFixed(0)}</p>
              )}
              
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-0.5 shadow-sm w-fit">
                <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white text-gray-600 hover:text-red-500 rounded-lg transition-colors border border-gray-100 shadow-sm">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center font-black text-xs text-gray-900">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white text-gray-600 hover:text-blue-500 rounded-lg transition-colors border border-gray-100 shadow-sm">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <button onClick={() => removeRow(item.id)} className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Order Checkout Footer */}
      <div className="p-5 border-t border-gray-100 bg-white space-y-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-blue-400 focus:bg-white transition-colors"
          />
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Kitchen note..."
            className="bg-amber-50/50 border border-amber-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-amber-400 focus:bg-amber-50 text-amber-900 placeholder-amber-400 transition-colors"
          />
        </div>

        <div className="space-y-3">
          {/* Discount Section */}
          <div className="flex gap-2 items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2">
            <span className="text-xs font-bold text-gray-500 whitespace-nowrap">Discount:</span>
            <select
              value={discountType}
              onChange={e => setDiscountType(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-700 outline-none border-none py-1 flex-1"
            >
              <option value="none">None</option>
              <option value="percentage">Percentage (%)</option>
              <option value="amount">Amount ({currency})</option>
            </select>
            {discountType !== 'none' && (
              <input
                type="number"
                min="0"
                value={discountValue}
                onChange={e => setDiscountValue(e.target.value)}
                placeholder="0"
                className="w-20 bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-xs font-bold outline-none focus:border-blue-400 text-right"
              />
            )}
          </div>

          <div className="p-4 rounded-3xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 font-bold tracking-wide">
              <span>Subtotal</span>
              <span>{currency}{subtotal.toFixed(0)}</span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-600 font-bold tracking-wide">
                <span>Discount</span>
                <span>-{currency}{discountAmount.toFixed(0)}</span>
              </div>
            )}

            {settings.serviceChargeEnabled && (
              <div className="flex justify-between items-center text-xs text-amber-600 font-bold tracking-wide">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={applyServiceCharge} onChange={e => setApplyServiceCharge(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500 rounded-sm" />
                  <span>S. Charge ({settings.serviceChargeRate}%)</span>
                </label>
                <span>{currency}{serviceChargeAmount.toFixed(0)}</span>
              </div>
            )}
            
            {settings.taxEnabled && (
              <div className="flex justify-between items-center text-xs text-blue-600 font-bold tracking-wide">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={applyTax} onChange={e => setApplyTax(e.target.checked)} className="w-3.5 h-3.5 accent-blue-500 rounded-sm" />
                  <span>Tax ({settings.taxRate}%)</span>
                </label>
                <span>{currency}{taxAmount.toFixed(0)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-end pt-2 mt-2 border-t border-gray-200 border-dashed">
              <span className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Total Amount</span>
              <span className="text-xl font-black text-blue-600 leading-none">{currency}{totalAmount.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            disabled={loading || cart.length === 0}
            onClick={() => placeOrder(false)}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 opacity-80" />
                <span>Confirm & Send to Kitchen</span>
              </>
            )}
          </button>
          
          <button
            disabled={loading || cart.length === 0}
            onClick={() => placeOrder(true)}
            className="w-full bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Receipt className="w-4 h-4 opacity-80" />
                <span>Save & Generate Bill</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ── MENU SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full mx-auto relative pb-32 lg:pb-0 flex items-start animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
      {/* Success Toast */}
      {orderSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 font-bold animate-bounce border border-green-500 shadow-green-600/30">
          <div className="bg-white/20 p-1.5 rounded-full"><Check className="w-5 h-5" /></div>
          <span className="text-lg">Order placed! Queue #{orderSuccess}</span>
        </div>
      )}

      {/* LEFT COLUMN: Products */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 lg:pr-[380px] xl:pr-[430px] w-full pb-8">

      {/* Search & Categories (Fixed at Very Top) */}
      <div className="sticky top-0 z-50 bg-white border border-gray-100 shadow-sm p-3 md:p-4 rounded-3xl flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="search"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-400"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto overflow-y-hidden items-center pb-2 thin-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap shrink-0 px-6 py-3 rounded-2xl text-sm font-black transition-all border ${
                selectedCategory === cat ? 'bg-gray-950 text-white border-gray-950 shadow-md transform scale-[1.02]' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200 hover:text-gray-900'
              }`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* POS Active Header (Non-Sticky now) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setTableNo(''); setCart([]); }}
              className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-all active:scale-95 border border-gray-200"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-950 tracking-tight leading-none">
                {tableNo.startsWith('cabin-')
                  ? `🏠 ${cabins.find(c => c.id === tableNo.replace('cabin-', ''))?.name || 'Cabin'}`
                  : tableNo === 'Walk-in' ? '🚶 Walk-in Order' : `🪑 Table ${tableNo}`}
              </h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Active Session</p>
            </div>
          </div>

          <div className="flex lg:hidden items-center gap-3">
            {totalItems > 0 && (
              <button onClick={() => setCartOpen(true)} className="flex bg-linear-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-2xl font-black text-xs items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                <ShoppingCart className="w-4 h-4" />
                <span>{totalItems} items</span>
                <span className="text-blue-200 bg-black/10 px-2 py-0.5 rounded-lg">{currency}{totalAmount.toFixed(0)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4">
        {filteredProducts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-300">
            <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-black text-gray-400">No items found</p>
          </div>
        )}
        {filteredProducts.map(p => {
          const cartItem = cart.find(i => i.id === p.id);
          return (
            <div
              key={p.id}
              className={`bg-white rounded-3xl overflow-hidden shadow-sm border flex flex-col transition-all active:scale-[0.98] ${
                p.outOfStock
                  ? 'border-gray-100 opacity-60'
                  : 'border-gray-100 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-200 cursor-pointer group'
              }`}
            >
              {/* Image */}
              <div
                onClick={() => !p.outOfStock && addToCart(p)}
                className="aspect-square bg-gray-50 relative overflow-hidden"
              >
                {p.image || p.imageUrl ? (
                  <img
                    src={p.image || p.imageUrl}
                    alt={p.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${!p.outOfStock ? 'group-hover:scale-110' : 'grayscale'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200 text-4xl">🍽️</div>
                )}
                {p.outOfStock ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Sold Out</span>
                  </div>
                ) : cartItem && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-sm font-black w-8 h-8 rounded-xl flex items-center justify-center border-2 border-white shadow-lg shadow-blue-500/30 animate-in zoom-in duration-200">
                    {cartItem.quantity}
                  </div>
                )}
              </div>

              {/* Info + Controls */}
              <div className="p-3 flex-1 flex flex-col justify-between border-t border-gray-50 bg-white z-10">
                <div className="mb-2">
                  <h3 className="font-bold text-gray-900 text-xs sm:text-sm leading-tight line-clamp-2">{p.name}</h3>
                </div>
                <div className="flex items-center justify-between gap-1 mt-auto">
                  {p.discountPrice ? (
                    <div className="flex flex-col">
                      <span className="font-black text-sm text-green-600 leading-none">{currency}{Number(p.discountPrice).toFixed(0)}</span>
                      <span className="text-[10px] text-gray-400 line-through font-bold">{currency}{Number(p.price).toFixed(0)}</span>
                    </div>
                  ) : (
                    <span className={`font-black text-sm ${p.outOfStock ? 'text-gray-400' : 'text-blue-600'}`}>
                      {currency}{Number(p.price).toFixed(0)}
                    </span>
                  )}
                  {!p.outOfStock && (
                    cartItem ? (
                      <div className="flex items-center gap-1 bg-gray-900 rounded-xl p-1 shadow-md">
                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, -1); }} className="w-7 h-7 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-lg active:scale-95 transition-all">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-4 text-center font-black text-white text-xs">{cartItem.quantity}</span>
                        <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="w-7 h-7 flex items-center justify-center text-white bg-blue-500 hover:bg-blue-400 rounded-lg active:scale-95 transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="w-9 h-9 bg-gray-50 hover:bg-blue-600 group-hover:bg-blue-600 text-gray-400 hover:text-white group-hover:text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shrink-0">
                        <Plus className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button (Mobile) */}
      {totalItems > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="lg:hidden fixed bottom-6 left-6 right-6 z-40 bg-linear-to-r from-gray-900 to-gray-800 text-white px-6 py-4 rounded-3xl shadow-2xl shadow-gray-900/40 flex items-center justify-between font-bold transition-all active:scale-[0.98] border border-gray-700"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center relative">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-sm">{totalItems}</span>
            </div>
            <span className="text-sm font-black tracking-wide">View Cart</span>
          </div>
          <span className="font-black text-lg text-white">{currency}{totalAmount.toFixed(0)}</span>
        </button>
      )}

      {/* Cart Drawer (Mobile) */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-gray-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full rounded-t-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in slide-in-from-bottom-8 duration-300">
            {renderCartContent()}
          </div>
        </div>
      )}

      </div> {/* End LEFT COLUMN */}

      {/* RIGHT COLUMN: Desktop Fixed Cart */}
      <div className="hidden lg:flex flex-col w-[350px] xl:w-[400px] fixed top-0 right-0 h-screen z-40 bg-white border-l border-gray-100 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
        {renderCartContent()}
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 text-center relative space-y-4">
              <button onClick={() => setReceiptModal(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-9 h-9 flex items-center justify-center transition-colors">
                ✕
              </button>
              <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-950 mb-1">Order Saved!</h2>
                <p className="text-gray-400 font-medium text-sm">Order #{receiptModal.tokenNumber} has been logged.</p>
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
                onClick={async () => {
                  const { generatePDFReceipt } = await import('../../utils/pdfGenerator');
                  generatePDFReceipt(receiptModal, settings);
                }}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Download className="w-4 h-4 mr-2 text-gray-500" />
                Download Receipt
              </button>

              <button 
                onClick={async () => {
                  const text = `Receipt for Order #${receiptModal.tokenNumber}\nTotal: Rs. ${receiptModal.totalAmount.toFixed(2)}`;
                  try {
                    if (navigator.share) await navigator.share({ title: 'Restaurant Receipt', text });
                    else alert("Sharing not supported on this browser.");
                  } catch (e) {}
                }}
                className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all active:scale-95 shadow-sm"
              >
                <Share2 className="w-4 h-4 mr-2 text-gray-500" />
                Share Receipt
              </button>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white">
              <button 
                onClick={() => {
                   setReceiptModal(null);
                }}
                className="w-full bg-gray-950 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-50 text-center relative space-y-2 bg-emerald-50/30">
              <button onClick={() => { setShowPaymentModal(false); setPendingOrderData(null); }} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 bg-white border border-gray-100 hover:bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center transition-colors shadow-sm">
                ✕
              </button>
              <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h2 className="text-2xl font-black text-gray-950 mb-1">Select Payment</h2>
              <p className="text-gray-500 font-medium text-sm">How is the customer paying Rs. {pendingOrderData?.totalAmount}?</p>
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
                    <div className="text-[10px] font-bold text-gray-400">POS terminal or UPI/QR</div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    const udharOrder = { 
                      ...pendingOrderData, 
                      customerName: paymentCustomerName || 'Guest',
                      customerPhone: paymentCustomerPhone || ''
                    };
                    setPendingOrderData(udharOrder);
                    setShowPaymentModal(false);
                    setShowUdharModal(true);
                  }}
                  className="w-full group hover:bg-red-50 border-2 border-gray-100 hover:border-red-200 py-4 rounded-2xl transition-all active:scale-95 flex items-center px-5 shrink-0"
                >
                  <div className="w-10 h-10 bg-gray-50 group-hover:bg-red-100 rounded-xl flex items-center justify-center text-xl transition-colors">📒</div>
                  <div className="ml-4 text-left">
                    <div className="font-black text-gray-900 group-hover:text-red-700 text-[13px] leading-tight mb-0.5">Charge to Udhar</div>
                    <div className="text-[10px] font-bold text-gray-400">Add to customer ledger (Unpaid)</div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">Credit</span>
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
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-950">Add to Ledger</h2>
                  <p className="text-sm font-bold text-gray-400">Assign Rs. {pendingOrderData?.totalAmount} to a customer's Udhar</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowUdharModal(false); setPendingOrderData(null); setSelectedUdharForConfirm(null); }} 
                className="w-12 h-12 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors"
                title="Cancel"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              
              {/* LEFT SIDE: Personas List */}
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
                <div className="flex-1 overflow-y-auto p-3 space-y-2 thin-scrollbar">
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
                  {personas.filter(p => p.name.toLowerCase().includes(udharSearch.toLowerCase())).length === 0 && (
                    <div className="text-center text-gray-400 py-10">
                      <User className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                      <div className="text-sm font-bold">No persons found.</div>
                      <div className="text-xs font-medium">Create a new ledger on the right.</div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: Action Area */}
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
                        disabled={loading || !newUdharName}
                        className="w-full bg-gray-950 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50 mt-2"
                      >
                        {loading ? 'Processing...' : `Create & Assign to ${newUdharName || 'New'}`}
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
