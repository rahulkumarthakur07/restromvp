import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShoppingCart, Search, Plus, Minus, Trash2, User, X, Check, ArrowLeft, Hotel, MonitorSmartphone } from 'lucide-react';
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
  const [isPaid, setIsPaid] = useState(false);

  const [loading, setLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

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
    return () => cabinUnsub();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const subtotal = cart.reduce((sum, i) => {
    const effectivePrice = i.discountPrice || i.price;
    return sum + (effectivePrice * i.quantity);
  }, 0);

  const taxAmount = settings.taxEnabled ? (subtotal * (settings.taxRate / 100)) : 0;
  const serviceChargeAmount = settings.serviceChargeEnabled ? (subtotal * (settings.serviceChargeRate / 100)) : 0;
  const totalAmount = subtotal + taxAmount + serviceChargeAmount;

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

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const tokenNumber = await generateTokenNumber();
      await addDoc(collection(db, 'orders'), {
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
        taxAmount,
        serviceChargeAmount,
        totalAmount,
        status: 'Pending',
        timestamp: serverTimestamp(),
        customerName: customerName || 'Guest',
        message: message || '',
        paid: isPaid,
        tokenNumber,
        source: 'admin_pos',
      });
      setOrderSuccess(tokenNumber);
      setCart([]);
      setCustomerName('');
      setMessage('');
      setIsPaid(false);
      setCartOpen(false);
      setTimeout(() => setOrderSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      alert('Failed to place order.');
    }
    setLoading(false);
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

  // ── MENU SCREEN ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto relative pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Success Toast */}
      {orderSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 font-bold animate-bounce border border-green-500 shadow-green-600/30">
          <div className="bg-white/20 p-1.5 rounded-full"><Check className="w-5 h-5" /></div>
          <span className="text-lg">Order placed! Queue #{orderSuccess}</span>
        </div>
      )}

      {/* POS Active Header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 md:p-6 mb-6 sticky top-4 z-40">
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

          <div className="flex items-center gap-3">
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Guest name (optional)..."
              className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all w-full md:w-56"
            />
            {totalItems > 0 && (
              <button onClick={() => setCartOpen(true)} className="hidden md:flex bg-linear-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-sm items-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                <ShoppingCart className="w-5 h-5" />
                <span>{totalItems} items</span>
                <span className="text-blue-200 bg-black/10 px-2 py-0.5 rounded-lg">{currency}{totalAmount.toFixed(0)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Categories Row */}
        <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto thin-scrollbar pb-2 md:pb-0 items-center">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm font-black transition-all border ${
                  selectedCategory === cat ? 'bg-gray-950 text-white border-gray-950 shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200 hover:text-gray-900'
                }`}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
      {totalItems > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed bottom-6 left-6 right-6 z-40 bg-linear-to-r from-gray-900 to-gray-800 text-white px-6 py-4 rounded-3xl shadow-2xl shadow-gray-900/40 flex items-center justify-between font-bold transition-all active:scale-95 border border-gray-700"
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

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-950/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full sm:max-w-md rounded-t-4xl sm:rounded-4xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom-8 duration-300">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="font-black text-gray-950 text-2xl tracking-tight leading-none mb-1">Order Details</h2>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                  {tableNo === 'Walk-in' ? 'Walk-in' : `Table ${tableNo}`}
                </p>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-10 h-10 bg-white hover:bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-start gap-4 bg-white rounded-3xl p-3 border border-gray-100 shadow-sm">
                  {item.image || item.imageUrl ? (
                    <img src={item.image || item.imageUrl} alt={item.name} className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-sm border border-gray-50" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 text-2xl">🍽️</div>
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
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white text-gray-600 hover:text-red-500 rounded-lg transition-colors border border-gray-100 shadow-sm">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-black text-sm text-gray-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white text-gray-600 hover:text-blue-500 rounded-lg transition-colors border border-gray-100 shadow-sm">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeRow(item.id)} className="p-2 text-gray-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors shrink-0 mt-0.5">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Checkout Footer */}
            <div className="p-6 border-t border-gray-100 bg-white space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-400 focus:bg-white transition-colors"
                />
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Kitchen note..."
                  className="bg-amber-50/50 border border-amber-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:border-amber-400 focus:bg-amber-50 text-amber-900 placeholder-amber-400 transition-colors"
                />
              </div>
              
              <button
                onClick={() => setIsPaid(!isPaid)}
                className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-sm font-black transition-all border shadow-sm ${
                  isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                }`}
              >
                <span>Billing Status</span>
                <span className={`px-3 py-1 rounded-xl text-[10px] uppercase tracking-widest ${isPaid ? 'bg-green-200 text-green-800' : 'bg-white border border-gray-200 text-gray-600'}`}>
                  {isPaid ? '✓ Paid' : 'Unpaid'}
                </span>
              </button>

              <div className="p-5 rounded-3xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex justify-between text-xs text-gray-500 font-bold tracking-wide">
                  <span>Subtotal</span>
                  <span>{currency}{subtotal.toFixed(0)}</span>
                </div>
                {settings.serviceChargeEnabled && (
                  <div className="flex justify-between text-xs text-amber-600 font-bold tracking-wide">
                    <span>S. Charge ({settings.serviceChargeRate}%)</span>
                    <span>{currency}{serviceChargeAmount.toFixed(0)}</span>
                  </div>
                )}
                {settings.taxEnabled && (
                  <div className="flex justify-between text-xs text-blue-600 font-bold tracking-wide">
                    <span>Tax ({settings.taxRate}%)</span>
                    <span>{currency}{taxAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-3 mt-2 border-t border-gray-200">
                  <span className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-2xl font-black text-blue-600 leading-none">{currency}{totalAmount.toFixed(0)}</span>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={placeOrder}
                className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 text-base transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 opacity-80" />
                    Confirm & Send to Kitchen
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
