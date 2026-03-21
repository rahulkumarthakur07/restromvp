import React, { createContext, useContext, useState, useEffect } from 'react';

const OrderContext = createContext();

export const useOrder = () => useContext(OrderContext);

export const OrderProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  
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
      removeActiveOrder
    }}>
      {children}
    </OrderContext.Provider>
  );
};
