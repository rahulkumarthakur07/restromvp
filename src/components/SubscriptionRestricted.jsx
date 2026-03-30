import React, { useState } from "react";
import { 
  Lock, 
  MessageCircle, 
  CreditCard, 
  Zap, 
  ArrowRight, 
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Mail,
  Sparkles,
  Crown
} from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function SubscriptionRestricted({ subData, restaurantName }) {
  const [loading, setLoading] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [modalMode, setModalMode] = useState(null); // 'trial', 'extend', 'upgrade'
  const [selectedPlan, setSelectedPlan] = useState(null);

  const WHATSAPP_NUMBER = "9779805713657";
  const CONTACT_EMAIL = "rahulbarahi.connect@gmail.com";

  const plans = [
    {
      name: "Pro Monthly",
      price: "NPR 1,499",
      period: "1 Month",
      icon: Zap,
      color: "from-blue-400 to-blue-600",
      recommended: false,
    },
    {
      name: "Pro Quarterly",
      price: "NPR 3,999",
      period: "3 Months",
      icon: Crown,
      color: "from-purple-500 to-indigo-600",
      recommended: true,
    },
    {
      name: "Pro Yearly",
      price: "NPR 12,999",
      period: "1 Year",
      icon: Sparkles,
      color: "from-amber-400 to-orange-600",
      recommended: false,
    },
  ];

  const handleWhatsApp = () => {
    let message = "";
    if (modalMode === 'extend') {
      message = `Hi RestroMVP Support! My restaurant (${restaurantName || 'Guest'}) has reached its limit. I need a 3-day emergency extension.`;
    } else if (modalMode === 'upgrade') {
      message = `Hi RestroMVP Support! I want to upgrade my restaurant (${restaurantName || 'Guest'}) to the ${selectedPlan.name} plan.`;
    }
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleEmail = () => {
    let subject = "";
    let body = "";
    if (modalMode === 'extend') {
      subject = "Support: Extension Request";
      body = `Hi,\n\nI need a 3-day emergency extension for my restaurant: ${restaurantName || 'Guest'}.`;
    } else if (modalMode === 'upgrade') {
      subject = `Subscription Upgrade: ${selectedPlan.name}`;
      body = `Hi,\n\nI want to upgrade to the ${selectedPlan.name} plan for ${restaurantName || 'Guest'}.`;
    }
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const activateTrial = async () => {
    setLoading(true);
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      await updateDoc(doc(db, "subscriptions", "status"), {
        expiryDate: sevenDaysFromNow,
        status: "active",
        plan: "Pro (7-Day Trial)",
        trialUsed: true,
        updatedAt: serverTimestamp()
      });
      setShowContactModal(false);
    } catch (e) {
      alert("Failed to activate trial. Please contact support.");
    }
    setLoading(false);
  };

  const openModal = (mode, plan = null) => {
    setModalMode(mode);
    setSelectedPlan(plan);
    setShowContactModal(true);
  };

  return (
    <div className="fixed inset-0 z-9999 bg-gray-950 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      {/* Contact Modal Layer */}
      {showContactModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="relative p-8 md:p-10 space-y-6">
              <button
                onClick={() => setShowContactModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center space-y-4">
                <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center bg-linear-to-br ${modalMode === 'extend' ? 'from-amber-400 to-orange-500' : modalMode === 'trial' ? 'from-blue-400 to-indigo-600' : selectedPlan?.color || 'from-blue-600 to-indigo-700'} text-white shadow-xl`}>
                  {modalMode === 'extend' ? <Clock className="w-10 h-10" /> : modalMode === 'trial' ? <Zap className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-gray-950 leading-tight">
                    {modalMode === 'extend' ? "Request Extension" : modalMode === 'trial' ? "Start Free Trial" : `Get ${selectedPlan?.name}`}
                  </h3>
                  <p className="text-gray-500 font-medium text-sm">
                    {modalMode === 'extend' ? "Get 3 extra days to settle your account." : modalMode === 'trial' ? "Explore all Pro features for 7 days." : "Finalize your subscription with our team."}
                  </p>
                </div>
              </div>

              {modalMode === 'trial' ? (
                <button
                  onClick={activateTrial}
                  disabled={loading}
                  className="w-full bg-linear-to-r from-blue-600 to-indigo-700 hover:scale-[1.02] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-200"
                >
                  {loading ? "Activating..." : "Confirm & Activate Trial"}
                </button>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleWhatsApp}
                    className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                  >
                    <MessageCircle className="w-6 h-6 fill-white/20" />
                    <span className="font-black text-xs uppercase tracking-widest">Connect on WhatsApp</span>
                  </button>
                  {modalMode === 'upgrade' && (
                    <button
                      onClick={handleEmail}
                      className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-95"
                    >
                      <Mail className="w-6 h-6 fill-white/20" />
                      <span className="font-black text-xs uppercase tracking-widest">Send an Email</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Abstract Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-5xl bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-700">
        
        {/* Left Side: Dynamic Status */}
        <div className="w-full md:w-5/12 bg-linear-to-br from-indigo-700 via-indigo-800 to-blue-900 p-8 md:p-12 text-white flex flex-col justify-between overflow-hidden relative">
          <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/30 pointer-events-none" />
          <div className="relative space-y-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl">
              <Lock className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">Access Restricted</h1>
              <p className="text-blue-100/70 font-medium text-lg max-w-xs">Your restaurant dashboard is currently locked. Restore service to continue managing orders.</p>
            </div>
          </div>

          <div className="relative space-y-6">
             <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center gap-5 shadow-inner">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                  <Clock className="w-7 h-7 text-blue-300" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300/60 mb-1">Last Plan</p>
                  <p className="font-black text-xl leading-none">{subData?.plan || 'Enterprise'}</p>
                </div>
             </div>
             <div className="flex items-center gap-3 px-2">
               <div className="flex -space-x-2">
                 {[1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-indigo-900 bg-indigo-700" />)}
               </div>
               <span className="text-[10px] font-bold text-blue-200/50 uppercase tracking-widest">Trusted by 200+ Restaurants</span>
             </div>
          </div>
        </div>

        {/* Right Side: Options Grid */}
        <div className="w-full md:w-7/12 p-8 md:p-12 space-y-8 bg-black/20 flex flex-col justify-center max-h-[85vh] overflow-y-auto">
           <div className="space-y-1">
             <h2 className="text-2xl font-black text-white tracking-tight">Restore Your Access</h2>
             <p className="text-gray-400 text-sm font-medium">Choose a plan or request a temporary extension below.</p>
           </div>

           <div className="grid grid-cols-1 gap-4">
             {/* Plans Section */}
             <div className="space-y-3">
               <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Pro Plans</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {plans.slice(0, 2).map(plan => (
                   <button 
                     key={plan.name}
                     onClick={() => openModal('upgrade', plan)}
                     className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 p-4 rounded-3xl text-left transition-all group"
                   >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br ${plan.color} text-white mb-3 group-hover:scale-110 transition-transform`}>
                       <plan.icon className="w-5 h-5" />
                     </div>
                     <p className="text-white font-black text-sm">{plan.name}</p>
                     <p className="text-blue-400 font-bold text-xs">{plan.price} <span className="text-gray-500 font-medium">/ {plan.period}</span></p>
                   </button>
                 ))}
               </div>
             </div>

             {/* Secondary Actions */}
             <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Temporary Solutions</p>
                <div className="space-y-3">
                  <button 
                    onClick={() => openModal('trial')}
                    disabled={subData?.trialUsed}
                    className={`w-full p-5 rounded-3xl border flex items-center justify-between transition-all ${subData?.trialUsed ? 'bg-transparent border-white/5 opacity-50 grayscale' : 'bg-linear-to-br from-blue-600/10 to-indigo-600/10 border-blue-500/20 hover:border-blue-500/50 hover:bg-white/10 text-white'}`}
                  >
                    <div className="flex items-center gap-4 text-left">
                       <Zap className={`w-6 h-6 ${subData?.trialUsed ? 'text-gray-500' : 'text-blue-400'}`} />
                       <div>
                         <p className="font-black text-sm">{subData?.trialUsed ? "Trial Used" : "Get 7-Day Free Trial"}</p>
                         <p className="text-[10px] font-bold text-gray-500">Unrestricted Pro features</p>
                       </div>
                    </div>
                    {!subData?.trialUsed && <ArrowRight className="w-5 h-5 text-blue-500/50" />}
                  </button>

                  <button 
                    onClick={() => openModal('extend')}
                    className="w-full bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 p-5 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 text-[#25D366] group"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" />
                    <span className="font-black text-xs uppercase tracking-widest italic group-hover:scale-105 transition-transform">Request 3-Day Extension</span>
                  </button>
                </div>
             </div>
           </div>

           <div className="pt-4 text-center">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center justify-center gap-2">
                System ID: <span className="text-blue-500/70 select-all">{restaurantName?.slice(0,4) || 'RES'}LTD</span>
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
