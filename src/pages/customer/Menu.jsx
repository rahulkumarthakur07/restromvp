import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useOrder } from "../../context/OrderContext";
import {
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Sun,
  Moon,
  Hotel,
  UtensilsCrossed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDarkMode } from "../../hooks/useDarkMode";
import LoaderScreen from "../../components/LoaderScreen";
import { decryptTableId } from "../../utils/crypto";

export default function Menu() {
  const { tableId: urlTableId } = useParams();
  const tableId = decryptTableId(urlTableId);
  const navigate = useNavigate();
  const {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    activeOrders,
    liveOrderStatuses,
    products: globalProducts,
    settings: globalSettings,
    isDataLoaded,
  } = useOrder();

  const [products, setProducts] = useState(globalProducts);
  const [loading, setLoading] = useState(!isDataLoaded);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("default");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [settings, setSettings] = useState(globalSettings);
  const [showSplash, setShowSplash] = useState(!isDataLoaded);
  const { isDark, toggleDarkMode } = useDarkMode('dark');

  // For MVP without DB data, we use some mock products if DB is empty
  const mockProducts = [
    {
      id: "1",
      name: "Steamed Momo",
      price: 15,
      category: "Momo",
      image: "https://placehold.co/400x300?text=Momo",
    },
  ];
  useEffect(() => {
    if (isDataLoaded) {
      setProducts(globalProducts);
      setSettings(globalSettings);
      setLoading(false);
    }
  }, [isDataLoaded, globalProducts, globalSettings]);

  useEffect(() => {
    if (showSplash && !loading) {
      const timer = setTimeout(() => setShowSplash(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, showSplash]);

  useEffect(() => {
    if (showSplash) {
      document.documentElement.classList.add("no-scroll-nuclear");
      document.body.classList.add("no-scroll-nuclear");
    } else {
      document.documentElement.classList.remove("no-scroll-nuclear");
      document.body.classList.remove("no-scroll-nuclear");
    }
    return () => {
      document.documentElement.classList.remove("no-scroll-nuclear");
      document.body.classList.remove("no-scroll-nuclear");
    };
  }, [showSplash]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const currency = settings.currency || "Rs.";

  const categories = [
    "All",
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  const filteredProducts = products
    .filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === "low") return Number(a.price) - Number(b.price);
      if (sortOrder === "high") return Number(b.price) - Number(a.price);
      return 0;
    });

  if (loading) {
    return <LoaderScreen message="Preparing Menu..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-950 dark:text-white pb-24 relative transition-colors duration-300">
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 text-center"
            style={{ backgroundColor: '#fad400' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative"
            >
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-2xl" />
              ) : (
                <div className="text-8xl">🍽️</div>
              )}
              <div className="mt-8 bg-black/10 text-black px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest backdrop-blur-sm">
                Table {tableId}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-40 px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 w-10 h-10 flex items-center justify-center overflow-hidden">
              {settings.logo ? (
                <img src={settings.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Hotel className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gray-950 dark:text-white tracking-tight leading-none">{settings.name || 'Digital Menu'}</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Table {tableId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-transparent active:scale-95 shadow-sm"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
            </button>
            {activeOrders && activeOrders.length > 0 && (
              <button 
                onClick={() => navigate(`/table/${urlTableId}/status`)}
                className="relative bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 p-2.5 rounded-xl transition-all border border-gray-100 dark:border-gray-700 shadow-sm group"
                title="Your Orders"
              >
                <UtensilsCrossed className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white" />
                {Object.values(liveOrderStatuses).filter(o => o.status !== 'Served').length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#fad400] text-black text-[10px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-black/5 shadow-sm">
                    {Object.values(liveOrderStatuses).filter(o => o.status !== 'Served').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="relative mb-3 flex space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input 
              type="search" 
              placeholder="Search our menu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-800 dark:text-white"
            />
          </div>
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <option value="default">Sort</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex overflow-x-auto py-2 gap-2 hide-scrollbar -mx-4 px-4 scroll-smooth">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-6 py-2 rounded-2xl text-sm font-black transition-all active:scale-95 ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 pb-32">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-400 font-medium">No items found matching your criteria.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredProducts.map((product) => {
                const cartItem = cart.find(item => item.id === product.id);
                return (
                  <motion.div 
                    layout
                    key={product.id}
                    className="bg-white dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col hover:shadow-md transition-shadow h-full"
                  >
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                      <img 
                        src={product.image || `https://placehold.co/400x300?text=${encodeURIComponent(product.name)}`} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {product.outOfStock && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2 z-20">
                          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Out of Stock</span>
                        </div>
                      )}
                      {product.discountPrice && !product.outOfStock && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className="bg-[#fad400] text-black text-[10px] font-black px-2 py-1 rounded-lg border border-black/5 shadow-sm transform -rotate-12">
                            SAVE {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                          </div>
                        </div>
                      )}
                      {cartItem && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-md z-10">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-black text-gray-950 dark:text-white leading-tight mb-1">{product.name}</h3>
                        <div className="flex flex-col">
                          {product.discountPrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-green-600 truncate">{currency} {Number(product.discountPrice).toFixed(0)}</span>
                              <span className="text-xs text-gray-400 line-through truncate">{currency} {Number(product.price).toFixed(0)}</span>
                            </div>
                          ) : (
                            <span className="text-lg font-black text-gray-950 dark:text-white">
                              {currency} {Number(product.price).toFixed(0)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        {product.outOfStock ? (
                          <div className="w-full bg-gray-100 dark:bg-gray-800 text-gray-400 border border-gray-200 dark:border-gray-700 py-2 rounded-xl text-sm font-bold flex items-center justify-center cursor-not-allowed">
                            Unavailable
                          </div>
                        ) : cartItem ? (
                          <div className="flex items-center justify-between bg-gray-950 dark:bg-blue-600 rounded-xl p-1 shadow-sm">
                            <button 
                              onClick={() => updateQuantity(product.id, -1)}
                              className="w-9 h-9 flex items-center justify-center bg-gray-800 dark:bg-blue-700 text-white rounded-lg active:scale-95 transition-transform"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-black text-white px-2 text-sm">{cartItem.quantity}</span>
                            <button 
                              onClick={() => addToCart(product)}
                              className="w-9 h-9 flex items-center justify-center bg-gray-800 dark:bg-blue-700 text-white rounded-lg active:scale-95 transition-transform"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(product)}
                            className="w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-950 dark:text-white border border-gray-200 dark:border-gray-700 py-2.5 rounded-xl text-sm font-black flex items-center justify-center transition-colors shadow-sm"
                          >
                            <Plus className="w-4 h-4 mr-1" /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {cartTotalItems > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50"
        >
          <button 
            onClick={() => navigate(`/table/${urlTableId}/cart`)}
            className="w-full bg-gray-900 dark:bg-blue-600 text-white shadow-xl rounded-2xl py-4 px-6 flex items-center justify-between hover:bg-black dark:hover:bg-blue-700 transition-all active:scale-95"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-[#fad400] text-black text-xs font-black rounded-full w-5 h-5 flex items-center justify-center border border-black/5 shadow-sm">
                  {cartTotalItems}
                </span>
              </div>
              <span className="font-black tracking-tight">View Cart</span>
            </div>
            <span className="font-black text-lg">
              {currency} {cart.reduce((sum, item) => sum + (item.discountPrice || item.price) * item.quantity, 0).toFixed(0)}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
