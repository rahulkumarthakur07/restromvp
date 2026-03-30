import React, { useState, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import SubscriptionRestricted from "./SubscriptionRestricted";
import LoaderScreen from "./LoaderScreen";

export default function SubscriptionGuard({ children }) {
  const [subData, setSubData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Whitelisted routes that should ALWAYS be accessible
  const WHITELIST = [
    "/admin/subscription",
    "/admin/login",
    "/login",
    "/waiter/login"
  ];

  const isWhitelisted = WHITELIST.includes(location.pathname);

  useEffect(() => {
    // 1. Fetch Subscription Status
    const unsubSub = onSnapshot(
      doc(db, "subscriptions", "status"),
      (docSnap) => {
        if (docSnap.exists()) {
          setSubData(docSnap.data());
        }
        // Even if not exists, we'll handle defaults in Restricted UI
      },
      (error) => {
        console.error("Subscription listener error:", error);
      }
    );

    // 2. Fetch General Settings (for Restaurant Name)
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "general"));
        if (snap.exists()) setSettings(snap.data());
      } catch (e) {}
      setLoading(false);
    };

    fetchSettings();

    return () => unsubSub();
  }, []);

  if (loading) {
    return <LoaderScreen message="Verifying Subscription..." type="minimal" />;
  }

  // Calculate Expiry
  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 999; // Assume unlimited if no expiry set (starter)
    const now = new Date();
    const expiry = expiryDate.toDate
      ? expiryDate.toDate()
      : new Date(expiryDate);
    const diff = expiry - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = getDaysRemaining(subData?.expiryDate);
  const isExpired = subData?.expiryDate && daysLeft <= 0;

  // If expired and not on a whitelisted page, show restrictions
  if (isExpired && !isWhitelisted) {
    return (
      <SubscriptionRestricted 
        subData={subData} 
        restaurantName={settings?.name} 
      />
    );
  }

  return children;
}
