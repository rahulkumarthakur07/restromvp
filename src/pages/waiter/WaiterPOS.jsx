import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShoppingCart, Search, Plus, Minus, Trash2, User, X, Check, ArrowLeft, Hotel } from 'lucide-react';
import { useWaiterPOS } from '../../context/WaiterPOSContext';
import { useOrder } from '../../context/OrderContext';

export default function WaiterPOS() {
  const [products, setProducts] = useState([]);
  const [tables, setTables] = useState([]);
  const { activeOrders, addActiveOrder, settings } = useOrder();
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
  const { setNavSlot } = useWaiterPOS();

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

  // Inject search + categories into mobile navbar when in ordering mode
  useEffect(() => {
    if (!tableNo) {
      setNavSlot(null);
      return;
    }
    const label = tableNo.startsWith('cabin-')
      ? `🏠 ${cabins.find(c => c.id === tableNo.replace('cabin-', ''))?.name || 'Cabin'}`
      : tableNo === 'Walk-in' ? '🚶 Walk-in' : `🪑 Table ${tableNo}`;

    setNavSlot(
      <div>
        {/* Title row inside navbar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTableNo(''); setCart([]); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-black text-gray-800 text-base truncate">{label}</span>
          </div>
          {totalItems > 0 && (
            <button
              onClick={() => setCartOpen(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-xl font-black text-sm flex items-center gap-1.5 shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{totalItems}</span>
              <span className="text-blue-200">· {currency}{totalAmount.toFixed(0)}</span>
            </button>
          )}
        </div>
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search our menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        {/* Category pills */}
        <div className="overflow-x-auto flex space-x-2 hide-scrollbar pb-1 -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    );
    return () => setNavSlot(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNo, categories, selectedCategory, searchQuery, totalItems, totalAmount, cart, cabins]);

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
        source: 'waiter_pos',
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Select Table</h1>
          <p className="text-gray-500 font-medium mt-0.5">Choose a table or Walk-in to start an order.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <button
            onClick={() => setTableNo('Walk-in')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-3xl shadow-sm hover:shadow-lg transition-all flex flex-col items-center justify-center space-y-3 group active:scale-95 min-h-[130px]"
          >
            <User className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-base text-center leading-tight">Walk-in / Fast Order</h3>
          </button>
          {tables.map(t => (
            <button
              key={t.id}
              onClick={() => setTableNo(t.number.toString())}
              className="bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-800 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center space-y-2 group active:scale-95 min-h-[130px]"
            >
              <div className="w-14 h-14 bg-gray-100 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
                <span className="text-2xl font-black text-gray-700 group-hover:text-blue-700">{t.number}</span>
              </div>
              <div className="text-center">
                <p className="font-black text-gray-800">Table {t.number}</p>
                {t.capacity && <p className="text-xs text-gray-400 font-medium">{t.capacity} seats</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Cabin Tables */}
        {cabins.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Hotel className="w-4 h-4 text-indigo-500" /> Cabin Tables
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {cabins.map(cabin => (
                <button
                  key={cabin.id}
                  onClick={() => setTableNo(`cabin-${cabin.id}`)}
                  className={`bg-white border hover:border-indigo-400 hover:bg-indigo-50 text-gray-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center space-y-2 group active:scale-95 min-h-[120px] ${
                    cabin.status === 'booked' ? 'border-indigo-200' : 'border-gray-200'
                  }`}
                >
                  {cabin.image ? (
                    <img src={cabin.image} alt={cabin.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center transition-colors">
                      <Hotel className="w-6 h-6 text-indigo-500" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="font-black text-gray-800 text-sm leading-tight">{cabin.name}</p>
                    {cabin.status === 'booked' && <p className="text-xs text-indigo-500 font-bold">Booked</p>}
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
    <div className="relative">
      {/* Success Toast */}
      {orderSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold animate-bounce">
          <Check className="w-5 h-5" />
          Order placed! Queue #{orderSuccess}
        </div>
      )}

      {/* Desktop-only header strip (md+) — mobile header is in WaiterLayout navbar */}
      <div className="hidden md:flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTableNo(''); setCart([]); }}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800">
              {tableNo.startsWith('cabin-')
                ? `🏠 ${cabins.find(c => c.id === tableNo.replace('cabin-', ''))?.name || 'Cabin'}`
                : tableNo === 'Walk-in' ? '🚶 Walk-in Order' : `🪑 Table ${tableNo}`}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Guest name..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 w-40"
          />
          {totalItems > 0 && (
            <button onClick={() => setCartOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 shadow-sm">
              <ShoppingCart className="w-4 h-4" /><span>{totalItems} items · {currency}{totalAmount.toFixed(0)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop search + categories (md+) */}
      <div className="hidden md:block mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search our menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${
                selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Product Grid — 2 cols on mobile, more on bigger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-28">
        {filteredProducts.length === 0 && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-16 text-gray-400">
            <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No items found</p>
          </div>
        )}
        {filteredProducts.map(p => {
          const cartItem = cart.find(i => i.id === p.id);
          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl overflow-hidden shadow-sm border flex flex-col transition-all ${
                p.outOfStock
                  ? 'border-gray-100 opacity-60'
                  : 'border-gray-100 hover:shadow-md hover:border-blue-200 cursor-pointer'
              }`}
            >
              {/* Image */}
              <div
                onClick={() => !p.outOfStock && addToCart(p)}
                className="aspect-video bg-gray-100 relative overflow-hidden group"
              >
                {p.image || p.imageUrl ? (
                  <img
                    src={p.image || p.imageUrl}
                    alt={p.name}
                    className={`w-full h-full object-cover transition-transform duration-300 ${!p.outOfStock ? 'group-hover:scale-110' : 'grayscale'}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🍽️</div>
                )}
                {p.outOfStock ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow">Out of Stock</span>
                  </div>
                ) : cartItem && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white shadow">
                    {cartItem.quantity}
                  </div>
                )}
              </div>

              {/* Info + Controls */}
              <div className="p-2 flex-1 flex flex-col justify-between">
                <div className="mb-1.5">
                  <h3 className="font-bold text-gray-800 text-xs leading-tight line-clamp-2">{p.name}</h3>
                </div>
                <div className="flex items-center justify-between gap-1">
                  {p.discountPrice ? (
                    <div className="flex flex-col">
                      <span className="font-black text-xs text-green-600">{currency}{Number(p.discountPrice).toFixed(0)}</span>
                      <span className="text-[10px] text-gray-400 line-through">{currency}{Number(p.price).toFixed(0)}</span>
                    </div>
                  ) : (
                    <span className={`font-black text-xs ${p.outOfStock ? 'text-gray-400' : 'text-blue-600'}`}>
                      {currency}{Number(p.price).toFixed(0)}
                    </span>
                  )}
                  {!p.outOfStock && (
                    cartItem ? (
                      <div className="flex items-center gap-0.5 bg-gray-900 rounded-lg px-0.5 py-0.5">
                        <button onClick={() => updateQuantity(p.id, -1)} className="w-6 h-6 flex items-center justify-center text-white rounded-md active:scale-95">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-4 text-center font-bold text-white text-xs">{cartItem.quantity}</span>
                        <button onClick={() => addToCart(p)} className="w-6 h-6 flex items-center justify-center text-white rounded-md active:scale-95">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(p)} className="w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center active:scale-95 transition-all shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Cart Button — only shows if no mini badge already visible (hidden at sm+) */}
      {totalItems > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:bottom-6 z-30 bg-gray-900 hover:bg-gray-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between sm:justify-center sm:gap-4 font-bold transition-all active:scale-95"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{totalItems}</span>
            </div>
            <span className="text-sm">{totalItems} item{totalItems > 1 ? 's' : ''}</span>
          </div>
          <span className="font-black text-blue-300">{currency}{totalAmount.toFixed(0)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-800 text-xl">Your Order</h2>
                <p className="text-sm text-gray-500 font-medium mt-0.5">
                  {tableNo === 'Walk-in' ? 'Walk-in' : `Table ${tableNo}`}
                </p>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                  {item.image || item.imageUrl ? (
                    <img src={item.image || item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-xl">🍽️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                    {item.discountPrice ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-green-600">{currency}{item.discountPrice.toFixed(0)}</span>
                        <span className="text-[10px] text-gray-400 line-through">{currency}{item.price.toFixed(0)}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">{currency}{item.price.toFixed(0)} each</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-0.5 shrink-0">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-500 rounded-lg transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-500 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => removeRow(item.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Order Details */}
            <div className="p-5 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Kitchen note..."
                  className="border border-amber-200 bg-amber-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400 text-amber-900 placeholder-amber-400"
                />
              </div>
              <button
                onClick={() => setIsPaid(!isPaid)}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors border ${
                  isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
              >
                {isPaid ? '✓ Mark as PAID' : 'Mark as UNPAID'}
              </button>
              <div className="p-4 space-y-2 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between text-xs text-gray-500 font-bold">
                  <span>Subtotal</span>
                  <span>{currency}{subtotal.toFixed(0)}</span>
                </div>
                {settings.serviceChargeEnabled && (
                  <div className="flex justify-between text-xs text-amber-600 font-bold">
                    <span>S. Charge ({settings.serviceChargeRate}%)</span>
                    <span>{currency}{serviceChargeAmount.toFixed(0)}</span>
                  </div>
                )}
                {settings.taxEnabled && (
                  <div className="flex justify-between text-xs text-blue-600 font-bold">
                    <span>Tax ({settings.taxRate}%)</span>
                    <span>{currency}{taxAmount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-200">
                  <span className="font-black text-gray-900">Total</span>
                  <span className="text-xl font-black text-blue-600">{currency}{totalAmount.toFixed(0)}</span>
                </div>
              </div>
              <button
                disabled={loading}
                onClick={placeOrder}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 text-base transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Place Order
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
