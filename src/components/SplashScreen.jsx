import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ isVisible }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (isVisible) {
      document.documentElement.classList.add('no-scroll-nuclear');
      document.body.classList.add('no-scroll-nuclear');
    } else {
      document.documentElement.classList.remove('no-scroll-nuclear');
      document.body.classList.remove('no-scroll-nuclear');
    }
    return () => { 
      document.documentElement.classList.remove('no-scroll-nuclear');
      document.body.classList.remove('no-scroll-nuclear');
    };
  }, [isVisible]);

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
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-999999 flex items-center justify-center overflow-hidden touch-none"
          style={{ backgroundColor: '#fad400' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
                duration: 1, 
                ease: "easeOut",
                scale: { type: "spring", damping: 15, stiffness: 100 }
            }}
            className="relative"
          >
            {settings.logo && (
              <img 
                src={settings.logo} 
                alt="Logo" 
                className="w-32 h-32 md:w-48 md:h-48 object-contain" 
              />
            )}
            
            {/* Subtle glow effect behind logo */}
            <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full -z-10 scale-150" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
