import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrder } from '../../context/OrderContext';
import { ArrowLeft, Trash2, Plus, Minus, Loader2, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { decryptTableId } from '../../utils/crypto';

export default function Cart() {
  const { tableId: urlTableId } = useParams();
  const tableId = decryptTableId(urlTableId);
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart, addActiveOrder, settings } = useOrder();
  const [isOrdering, setIsOrdering] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [optionalMessage, setOptionalMessage] = useState('');

  const subtotal = cart.reduce((sum, item) => {
    const effectivePrice = item.discountPrice || item.price;
    return sum + (effectivePrice * item.quantity);
  }, 0);

  // Total Savings calculation
  const totalSavings = cart.reduce((sum, item) => {
    if (item.discountPrice) {
      return sum + (item.price - item.discountPrice) * item.quantity;
    }
    return sum;
  }, 0);

  const taxAmount = settings.taxEnabled ? (subtotal * (settings.taxRate / 100)) : 0;
  const serviceChargeAmount = settings.serviceChargeEnabled ? (subtotal * (settings.serviceChargeRate / 100)) : 0;
  const total = subtotal + taxAmount + serviceChargeAmount;

  const currency = settings.currency || 'Rs.';

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    
    try {
      // Get today's queue number
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      // Query for all orders today to find the max token number
      const q = query(collection(db, 'orders'), where('timestamp', '>=', startOfDay));
      const qSnapshot = await getDocs(q);
      
      let maxToken = 0;
      qSnapshot.forEach(docSnap => {
        const t = docSnap.data().tokenNumber || 0;
        if (t > maxToken) maxToken = t;
      });

      const tokenNumber = maxToken + 1;
      
      const orderData = {
        tableId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        message: optionalMessage.trim() || null,
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
        totalAmount: total,
        totalSavings,
        timestamp: serverTimestamp(),
        tokenNumber
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Save to context
      addActiveOrder({
        id: docRef.id,
        ...orderData,
        // Mock timestamp for immediate UI use
        timestamp: new Date().toISOString() 
      });

      clearCart();
      navigate(`/table/${urlTableId}/status`);
      
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added any items yet.</p>
          <button 
            onClick={() => navigate(`/table/${urlTableId}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white pb-32 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-900 px-4 py-4 flex items-center space-x-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-gray-950 dark:text-white">Your Order</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
          {cart.map((item) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <div className="flex flex-col">
                    {item.discountPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-bold">{currency} {Number(item.discountPrice).toFixed(2)}</span>
                        <span className="text-gray-400 text-xs line-through">{currency} {Number(item.price).toFixed(2)}</span>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm font-medium">{currency} {Number(item.price).toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto">
                <div className="flex items-center space-x-3 bg-gray-50 rounded-full px-2 py-1 border border-gray-100">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-800 w-6 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Subtotal</span>
                <span>{currency}{subtotal.toFixed(2)}</span>
              </div>
              
              {settings.serviceChargeEnabled && (
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Service Charge ({settings.serviceChargeRate}%)</span>
                  <span>{currency}{serviceChargeAmount.toFixed(2)}</span>
                </div>
              )}

              {settings.taxEnabled && (
                <div className="flex justify-between text-gray-500 text-sm">
                  <span>Tax ({settings.taxRate}%)</span>
                  <span>{currency}{taxAmount.toFixed(2)}</span>
                </div>
              )}

              {totalSavings > 0 && (
                <div className="flex justify-between text-green-600 text-sm font-bold">
                  <span>Your Savings</span>
                  <span>- {currency}{totalSavings.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-800 text-lg font-black pt-2">
                <span>Total</span>
                <span>{currency}{total.toFixed(2)}</span>
              </div>
            </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h3 className="font-bold text-gray-800">Your Details (Optional)</h3>
          <div className="space-y-3">
            <div>
              <input 
                type="text"
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <input 
                type="tel"
                placeholder="Mobile Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <textarea 
                placeholder="Special Instructons (e.g. less spicy, extra napkins)"
                value={optionalMessage}
                onChange={(e) => setOptionalMessage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all h-20 resize-none"
              />
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 transition-colors duration-300">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={handlePlaceOrder}
            disabled={isOrdering}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-2 shadow-lg shadow-blue-200 dark:shadow-none"
          >
            {isOrdering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <span>Place Order • {currency}{total.toFixed(0)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
