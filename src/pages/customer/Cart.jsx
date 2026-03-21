import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useOrder } from '../../context/OrderContext';
import { ArrowLeft, Trash2, Plus, Minus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Cart() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { cart, removeFromCart, updateQuantity, clearCart, addActiveOrder } = useOrder();
  const [isOrdering, setIsOrdering] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [optionalMessage, setOptionalMessage] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // 10% tax example
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsOrdering(true);
    
    try {
      // Generate a random 4-digit token
      const tokenNumber = Math.floor(1000 + Math.random() * 9000);
      
      const orderData = {
        tableId,
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        message: optionalMessage.trim() || null,
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        status: 'Pending',
        tokenNumber,
        timestamp: serverTimestamp(),
        totalAmount: total
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
      navigate(`/table/${tableId}/status`);
      
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added any items yet.</p>
          <button 
            onClick={() => navigate(`/table/${tableId}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white px-4 py-4 flex items-center space-x-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-50 rounded-full">
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Your Order</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
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
                  <p className="text-gray-500 text-sm font-medium">${Number(item.price).toFixed(2)}</p>
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
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="pt-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-2xl mt-2">
            <span className="font-bold text-gray-800 text-lg">Total</span>
            <span className="font-bold text-gray-800 text-xl">${total.toFixed(2)}</span>
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

      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={handlePlaceOrder}
            disabled={isOrdering}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-blue-200"
          >
            {isOrdering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <span>Place Order - ${total.toFixed(2)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
