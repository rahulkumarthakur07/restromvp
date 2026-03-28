import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';

export default function LoaderScreen({ message = "Loading...", type = "splash" }) {
  const [settings, setSettings] = useState({});
  const isSplash = type === "splash";

  useEffect(() => {
    if (isSplash) {
      document.documentElement.classList.add('no-scroll-nuclear');
      document.body.classList.add('no-scroll-nuclear');
    }
    return () => {
      if (isSplash) {
        document.documentElement.classList.remove('no-scroll-nuclear');
        document.body.classList.remove('no-scroll-nuclear');
      }
    };
  }, [isSplash]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) setSettings(snap.data());
      } catch(e){}
    };
    fetchSettings();
  }, []);

  if (!isSplash) {
    return (
      <div className="flex flex-col items-center justify-center p-12 w-full h-full min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-500 font-bold animate-pulse">{message}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-999999 flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: '#fad400' }}>
      <motion.div
        animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="relative"
      >
        {settings.logo ? (
          <img src={settings.logo} className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl" alt="Logo" />
        ) : (
          <div className="text-6xl filter drop-shadow-md">🍽️</div>
        )}
        
        {/* Subtle glow */}
        <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full -z-10 scale-150 animate-pulse" />
      </motion.div>
      
      {message && (
        <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-black/40 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
