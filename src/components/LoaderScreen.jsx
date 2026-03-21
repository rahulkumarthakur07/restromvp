import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';

export default function LoaderScreen({ message = "Loading..." }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) setSettings(snap.data());
      } catch(e){}
    };
    fetchSettings();
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-50/90 backdrop-blur-sm z-100 flex flex-col items-center justify-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100"
      >
        {settings.logo ? (
          <img src={settings.logo} className="w-24 h-24 object-contain" alt="Logo" />
        ) : (
          <div className="text-5xl">🍽️</div>
        )}
      </motion.div>
      <motion.h2 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-2xl font-black text-gray-800 tracking-tight"
      >
        {settings.name || "Restaurant"}
      </motion.h2>
      <p className="text-sm font-bold text-gray-400 mt-2 tracking-widest uppercase animate-pulse">
        {message}
      </p>
    </div>
  );
}
