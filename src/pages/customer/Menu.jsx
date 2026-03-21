import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrder } from '../../context/OrderContext';
import { ShoppingCart, Plus, Minus, Loader, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Menu() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, updateQuantity, activeOrders } = useOrder();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [settings, setSettings] = useState({});
  const [showSplash, setShowSplash] = useState(true);

  // For MVP without DB data, we use some mock products if DB is empty
  const mockProducts = [
    { id: '1', name: 'Steamed Momo', price: 15, category: 'Momo', image: 'https://placehold.co/400x300?text=Momo' },
    { id: '2', name: 'Fried Rice', price: 12, category: 'Main', image: 'https://placehold.co/400x300?text=Fried+Rice' },
    { id: '3', name: 'Coke', price: 3, category: 'Drinks', image: 'https://placehold.co/400x300?text=Coke' },
    { id: '4', name: 'French Fries', price: 5, category: 'Snacks', image: 'https://placehold.co/400x300?text=Fries' },
  ];

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'general'));
        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data());
        }

        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (productsList.length > 0) {
          setProducts(productsList);
        } else {
          setProducts(mockProducts); // Fallback mock
        }
      } catch (error) {
        console.warn("Firebase fetch error, using mock data:", error);
        setProducts(mockProducts);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowSplash(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 relative">
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center shadow-2xl"
          >
            {settings.logo ? (
              <motion.img 
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                src={settings.logo} alt="Logo" className="w-32 h-32 object-contain mb-8 drop-shadow-xl" 
              />
            ) : (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-32 h-32 bg-blue-50 rounded-3xl mb-8 flex items-center justify-center"
              >
                <ShoppingCart className="w-12 h-12 text-blue-500" />
              </motion.div>
            )}
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-black text-gray-900 tracking-tight"
            >
              {settings.name || 'Digital Menu'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-gray-500 font-bold uppercase tracking-widest mt-4 bg-gray-100 px-4 py-1.5 rounded-full text-sm"
            >
              Table {tableId}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex justify-between items-center bg-white mb-4">
          <div className="flex items-center space-x-3">
            {settings.logo && <img src={settings.logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg border border-gray-100 shadow-sm" />}
            <div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight">{settings.name || 'Digital Menu'}</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Table {tableId}</p>
            </div>
          </div>
          
          {activeOrders && activeOrders.length > 0 && (
            <button 
              onClick={() => navigate(`/table/${tableId}/status`)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm border border-blue-100 flex items-center transition-colors"
            >
              Your Orders ({activeOrders.length})
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search our menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="overflow-x-auto flex space-x-2 hide-scrollbar pb-2 -mx-4 px-4 scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${
                selectedCategory === cat 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-200'
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
                    key={product.id} 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-4/3 bg-gray-50 w-full relative group">
                      <img src={product.image || `https://placehold.co/400x300?text=${product.name}`} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      {cartItem && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-md">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 leading-tight mb-1">{product.name}</h3>
                        <p className="text-blue-600 font-black mb-3">${Number(product.price).toFixed(2)}</p>
                      </div>
                      
                      <div className="mt-auto">
                        {cartItem ? (
                          <div className="flex items-center justify-between bg-gray-900 rounded-xl p-1 shadow-sm">
                            <button 
                              onClick={() => updateQuantity(product.id, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-lg active:scale-95 transition-transform"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-white px-2 text-sm">{cartItem.quantity}</span>
                            <button 
                              onClick={() => addToCart(product)}
                              className="w-8 h-8 flex items-center justify-center bg-gray-800 text-white rounded-lg active:scale-95 transition-transform"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(product)}
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200 py-2 sm:py-2.5 rounded-xl text-sm font-bold flex items-center justify-center transition-colors shadow-sm"
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

      {/* Floating Cart Button */}
      {cartTotalItems > 0 && (
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm"
        >
          <button 
            onClick={() => navigate(`/table/${tableId}/cart`)}
            className="w-full bg-gray-900 text-white shadow-xl rounded-2xl py-4 px-6 flex items-center justify-between hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartTotalItems}
                </span>
              </div>
              <span className="font-semibold">View Cart</span>
            </div>
            <span className="font-bold">
              ${cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
            </span>
          </button>
        </motion.div>
      )}
    </div>
  );
}
