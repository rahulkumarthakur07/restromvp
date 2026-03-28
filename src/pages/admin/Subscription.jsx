import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  HelpCircle, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Crown,
  X,
  Mail
} from 'lucide-react';

export default function Subscription() {
  const [subData, setSubData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socialProof, setSocialProof] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const WHATSAPP_NUMBER = "9779805713657";
  const CONTACT_EMAIL = "rahulbarahi.connect@gmail.com";

  useEffect(() => {
    // 1. Subscription Status
    const unsubSub = onSnapshot(doc(db, 'subscriptions', 'status'), (docSnap) => {
      if (docSnap.exists()) {
        setSubData(docSnap.data());
      } else {
        const defaultSub = {
          plan: 'Starter (Free)',
          status: 'active',
          expiryDate: null,
          boughtDate: new Date()
        };
        setSubData(defaultSub);
        setDoc(doc(db, 'subscriptions', 'status'), defaultSub).catch(e => console.error("Status init failed:", e));
      }
    });

    // 2. Marketing Config (Flash Sale & Recent Locations)
    const unsubConfig = onSnapshot(doc(db, 'subscriptions', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      } else {
        const fallback = {
          flashSaleExpiry: null,
          recentLocations: ['Kathmandu', 'Pokhara', 'Lalitpur', 'Butwal']
        };
        setConfig(fallback);
        
        const initConfig = async () => {
          try {
            const sevenDaysFuture = new Date();
            sevenDaysFuture.setDate(sevenDaysFuture.getDate() + 7);
            await setDoc(doc(db, 'subscriptions', 'config'), {
              flashSaleExpiry: sevenDaysFuture,
              recentLocations: ['Kathmandu', 'Pokhara', 'Lalitpur', 'Bharatpur', 'Biratnagar', 'Butwal', 'Dharan', 'Itahari']
            });
          } catch (err) { console.error("Auto-init failed:", err); }
        };
        initConfig();
      }
      setLoading(false);
    });

    return () => {
      unsubSub();
      unsubConfig();
    };
  }, []);

  useEffect(() => {
    if (!config) return;
    const timer = setInterval(() => {
      if (config?.flashSaleExpiry) {
        const expiry = config.flashSaleExpiry.toDate ? config.flashSaleExpiry.toDate() : new Date(config.flashSaleExpiry);
        const diff = Math.max(0, Math.floor((expiry - new Date()) / 1000));
        setTimeLeft(diff);
      }
    }, 1000);

    const interval = setInterval(() => {
      if (config?.recentLocations?.length > 0) {
        const city = config.recentLocations[Math.floor(Math.random() * config.recentLocations.length)];
        setSocialProof(`📍 A restaurant in ${city} just upgraded to Pro Yearly!`);
        setTimeout(() => setSocialProof(null), 5000);
      }
    }, 18000);

    return () => {
      clearInterval(timer);
      clearInterval(interval);
    };
  }, [config]);

  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const openContactModal = (plan) => {
    setSelectedPlan(plan);
    setShowContactModal(true);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Hi RestroMVP Support! I want to upgrade to the ${selectedPlan.name} (${selectedPlan.period}) plan. Please guide me on payment.`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Subscription Upgrade: ${selectedPlan.name}`);
    const body = encodeURIComponent(`Hi,\n\nI am interested in upgrading to the ${selectedPlan.name} (${selectedPlan.period}) plan. My restaurant is currently on the ${subData?.plan} plan. Please let me know the payment details.`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return "∞";
    const now = new Date();
    const expiry = expiryDate.toDate ? expiryDate.toDate() : new Date(expiryDate);
    const diff = expiry - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const plans = [
    {
      name: 'Pro Monthly',
      originalPrice: 'NPR 1,999',
      price: 'NPR 1,499',
      saving: '25% OFF',
      period: '1 Month',
      months: 1,
      icon: Zap,
      color: 'from-blue-400 to-blue-600',
      label: 'Early Adopter Offer',
      scarcity: 'Price rises soon!',
      features: ['Unlimited Tables', 'Advanced Business Analytics', 'Staff Management', 'Kitchen Display System', 'Priority WhatsApp Support']
    },
    {
      name: 'Pro Quarterly',
      originalPrice: 'NPR 5,999',
      price: 'NPR 3,999',
      saving: 'SAVE NPR 2,000',
      period: '3 Months',
      months: 3,
      icon: Crown,
      color: 'from-purple-500 to-indigo-600',
      recommended: true,
      label: 'BEST SELLER',
      scarcity: 'Only 3 slots left at this price!',
      features: ['Everything in Monthly', 'Detailed History Reports', 'Multi-device Sync', 'Priority Support', 'Save NPR 500']
    },
    {
      name: 'Pro Yearly',
      originalPrice: 'NPR 17,999',
      price: 'NPR 12,999',
      saving: 'SAVE NPR 5,000',
      period: '1 Year',
      months: 12,
      icon: Sparkles,
      color: 'from-amber-400 to-orange-600',
      label: 'Golden Deal',
      scarcity: 'Limited Lifetime Offer',
      features: ['Everything in Quarterly', 'Custom Branding', 'Exclusive Features', '2 Months Free Included', 'Priority One-on-One Help']
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full" />
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const daysLeft = subData ? getDaysRemaining(subData.expiryDate) : 0;
  const isExpired = daysLeft === 0 && subData?.expiryDate;

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      
      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="relative p-8 md:p-10 space-y-8">
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-4 text-center">
                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center bg-linear-to-br ${selectedPlan.color} text-white shadow-xl`}>
                  {selectedPlan.recommended ? <Crown className="w-10 h-10" /> : selectedPlan.name.includes('Yearly') ? <Sparkles className="w-10 h-10" /> : <Zap className="w-10 h-10" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black text-gray-950">Unlock {selectedPlan.name}</h3>
                  <p className="text-gray-500 font-medium">Contact us to finalize your upgrade</p>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-emerald-100/50 group"
                >
                  <MessageCircle className="w-6 h-6 fill-white/20 group-hover:scale-110 transition-transform" />
                  <span className="font-black text-sm uppercase tracking-widest">Chat on WhatsApp</span>
                </button>

                <button 
                  onClick={handleEmail}
                  className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-gray-200/50 group"
                >
                  <Mail className="w-6 h-6 fill-white/20 group-hover:scale-110 transition-transform" />
                  <span className="font-black text-sm uppercase tracking-widest">Email Us</span>
                </button>
              </div>

              <div className="text-center pt-4 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Direct Details</p>
                <p className="text-gray-950 font-bold text-sm select-all">{CONTACT_EMAIL}</p>
                <p className="text-gray-600 font-medium text-xs mt-1">Number: +{WHATSAPP_NUMBER}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Proof Notification */}
      {socialProof && (
        <div className="fixed bottom-6 left-6 z-50 animate-in slide-in-from-left-full duration-500 max-w-[calc(100vw-3rem)]">
          <div className="bg-gray-900 border border-white/10 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 backdrop-blur-xl">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
            <span className="text-xs md:text-sm font-bold truncate">{socialProof}</span>
          </div>
        </div>
      )}

      {/* Flash Sale Banner */}
      <div className="bg-linear-to-r from-red-600 via-orange-600 to-red-600 py-3 rounded-2xl text-white text-center shadow-lg shadow-red-100 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 group">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-black uppercase tracking-[0.2em] italic">Flash Sale Ending Soon</span>
        </div>
        <div className="bg-white/20 px-4 py-1 rounded-full font-black text-lg font-mono min-w-[120px]">
          {formatTime(timeLeft)}
        </div>
        <span className="text-xs font-bold opacity-90 hidden md:block tracking-widest uppercase italic">Price Increase Imminent!</span>
      </div>

      {/* Premium Hero Status Section */}
      <div className="relative group overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-12">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl transition-transform group-hover:scale-125 duration-1000" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-100/30 rounded-full blur-3xl transition-transform group-hover:scale-125 duration-1000" />
        
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 text-center md:text-left flex-1">
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Subscription Center</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-black text-gray-950 leading-[1.1]">
                {subData?.plan ? `Active Plan: ${subData.plan}` : 'Experience Premium Tools'}
              </h1>
              <p className="text-gray-500 max-w-lg text-base md:text-lg font-medium">
                Unlock full features, premium support, and scaling tools designed for modern restaurants.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto">
            {subData?.expiryDate || subData?.plan?.includes('Starter') ? (
              <div className={`p-8 md:p-10 rounded-4xl border-2 transition-all relative overflow-hidden flex flex-col items-center justify-center min-w-[280px] ${isExpired ? 'bg-red-50 border-red-100' : 'bg-white border-blue-50 shadow-2xl shadow-blue-200/30'}`}>
                {/* Decorative pulse for active plan */}
                {!isExpired && (
                  <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-4xl pointer-events-none" />
                )}
                
                <div className="relative flex flex-col items-center space-y-5">
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transform group-hover:rotate-12 transition-transform ${isExpired ? 'bg-red-100 text-red-600' : 'bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-200'}`}>
                    {subData?.expiryDate ? <Clock className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                  </div>
                  <div className="text-center">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isExpired ? 'text-red-400' : 'text-blue-400'}`}>Remaining Days</p>
                    <h2 className={`text-6xl md:text-7xl font-black tracking-tighter ${isExpired ? 'text-red-600' : 'text-gray-950'}`}>{daysLeft}</h2>
                  </div>
                  {isExpired && (
                    <div className="bg-red-600 text-white px-8 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase animate-pulse shadow-lg">
                      Subscription Expired
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-linear-to-br from-indigo-950 via-indigo-900 to-purple-950 p-8 md:p-10 rounded-4xl text-white shadow-2xl shadow-indigo-900/40 text-center space-y-6 transform hover:scale-[1.02] transition-all relative overflow-hidden group/card">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                <Crown className="w-12 h-12 mx-auto text-amber-400 animate-bounce group-hover/card:scale-125 duration-1000" />
                <div className="space-y-1">
                  <h3 className="text-2xl md:text-3xl font-black text-white">Go Premium</h3>
                  <p className="text-indigo-200/70 text-sm font-medium">Power up your restaurant flow</p>
                </div>
                <button className="w-full bg-white text-indigo-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all hover:bg-amber-400 hover:text-white">
                  Buy Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="space-y-8 py-10">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <p className="text-red-600 font-black text-xs uppercase tracking-widest">🔥 8 Restaurants are looking at this right now</p>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tighter">Limited Time Pricing</h2>
          <p className="text-gray-500 font-medium max-w-md mx-auto italic">Lock in these early-adopter prices before they expire next month.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative bg-white p-8 md:p-10 rounded-4xl border transition-all duration-500 group/plan flex flex-col ${
                plan.recommended 
                  ? 'border-blue-500 ring-12 ring-blue-50/50 shadow-2xl scale-[1.02] z-10' 
                  : 'border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-2xl'
              }`}
            >
              <div className="absolute top-8 right-8 text-right space-y-1">
                <span className="block text-[10px] text-gray-400 line-through font-bold opacity-70">{plan.originalPrice}</span>
                <span className="block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{plan.saving}</span>
              </div>

              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center space-x-2">
                  <Crown className="w-3 h-3 fill-white" />
                  <span>Best Seller - Selling Fast</span>
                </div>
              )}
              
              <div className="mb-10 text-center md:text-left">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 bg-linear-to-br ${plan.color} text-white shadow-xl shadow-gray-200 transition-transform group-hover/plan:rotate-12 duration-500`}>
                  <plan.icon className="w-8 h-8" />
                </div>
                <p className="text-xs font-black tracking-[0.2em] text-blue-600 uppercase mb-2">{plan.label}</p>
                <h3 className="text-2xl font-black text-gray-950 mb-2">{plan.name}</h3>
                <div className="flex flex-col">
                  <span className="text-4xl font-black text-gray-950 tracking-tight">{plan.price}</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-70">{plan.period}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="text-red-500 text-[10px] font-black uppercase animate-pulse">{plan.scarcity}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  Premium Access Included
                </p>
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-start space-x-4 text-sm group/feat">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover/plan:bg-blue-600 transition-colors duration-500">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 group-hover/plan:text-white transition-colors duration-500" />
                    </div>
                    <span className="text-gray-600 font-medium leading-tight pt-0.5">{feat}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => openContactModal(plan)}
                className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg ${
                  plan.recommended 
                    ? 'bg-linear-to-r from-blue-600 to-indigo-700 text-white shadow-blue-200 hover:hue-rotate-15' 
                    : 'bg-gray-950 text-white hover:bg-black shadow-gray-200'
                }`}
              >
                {`Claim ${plan.period} Offer Now`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Responsive Support Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <a 
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I need help with my RestroMVP subscription.`}
          target="_blank" rel="noopener noreferrer"
          className="group bg-white p-6 md:p-8 rounded-4xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-emerald-100 transition-all flex items-center justify-between"
        >
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-50 text-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 group-hover:rotate-6 shadow-sm">
              <MessageCircle className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
              <h3 className="text-lg md:text-2xl font-black text-gray-950 tracking-tight">VIP WhatsApp Support</h3>
              <p className="text-gray-400 text-sm font-medium italic">Instant response for our partners</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
            <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </a>

        <div className="group bg-white p-6 md:p-8 rounded-4xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all flex items-center justify-between cursor-pointer">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 text-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 group-hover:-rotate-6 shadow-sm">
              <HelpCircle className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
              <h3 className="text-lg md:text-2xl font-black text-gray-950 tracking-tight">Need Help?</h3>
              <p className="text-gray-400 text-sm font-medium">Browse our user guide</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
            <ArrowRight className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
