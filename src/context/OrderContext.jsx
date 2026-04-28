import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const OrderContext = createContext();

export const useOrder = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [liveOrderStatuses, setLiveOrderStatuses] = useState({});
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Load from local storage on mount (optional for MVP but good for UX)
  useEffect(() => {
    const savedCart = localStorage.getItem('resmvp_cart');
    const savedOrders = localStorage.getItem('resmvp_orders');
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedOrders) setActiveOrders(JSON.parse(savedOrders));
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('resmvp_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (activeOrders.length > 0) {
      localStorage.setItem('resmvp_orders', JSON.stringify(activeOrders));
    } else {
      localStorage.removeItem('resmvp_orders');
    }
  }, [activeOrders]);

  // Real-time Settings Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data());
      }
    });
    return unsub;
  }, []);

  // Global fetch for products
  const fetchGlobalData = useCallback(async () => {
    if (isDataLoaded) return;
    try {
      const productsSnap = await getDocs(collection(db, 'products'));
      const pList = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Fallback to mock if empty
      if (pList.length === 0) {
        setProducts([
          { id: '1', name: 'Steamed Momo', price: 15, category: 'Momo', image: 'https://placehold.co/400x300?text=Momo' },
          { id: '2', name: 'Fried Rice', price: 12, category: 'Main', image: 'https://placehold.co/400x300?text=Fried+Rice' },
          { id: '3', name: 'Coke', price: 3, category: 'Drinks', image: 'https://placehold.co/400x300?text=Coke' },
        ]);
      } else {
        setProducts(pList);
      }
      setIsDataLoaded(true);
    } catch (e) {
      console.error("Global fetch error:", e);
    }
  }, [isDataLoaded]);

  useEffect(() => {
    fetchGlobalData();
  }, [fetchGlobalData]);

  // Global listener to auto-remove orders that are marked as Completed (Archived)
  // and keep a synchronized map of their details.
  useEffect(() => {
    if (activeOrders.length === 0) return;
    
    const unsubscribes = activeOrders.map(order => 
      onSnapshot(doc(db, 'orders', order.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.status === 'Completed') {
            setActiveOrders(prev => prev.filter(o => o.id !== order.id));
            setLiveOrderStatuses(prev => {
              const newDict = { ...prev };
              delete newDict[order.id];
              return newDict;
            });
          } else {
            setLiveOrderStatuses(prev => ({ ...prev, [order.id]: data }));
          }
        }
      })
    );
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [activeOrders]);

  const addActiveOrder = (order) => {
    setActiveOrders(prev => [...prev, order]);
  };

  const removeActiveOrder = (orderId) => {
    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };
  
  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  return (
    <OrderContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      activeOrders,
      setActiveOrders,
      addActiveOrder,
      removeActiveOrder,
      liveOrderStatuses,
      products,
      settings,
      isDataLoaded
    }}>
      {children}
    </OrderContext.Provider>
  );
};
