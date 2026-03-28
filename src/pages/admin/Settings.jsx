import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Store, Save, Percent, Receipt, Globe, Image as ImageIcon, Briefcase, Calculator, Check, MessageCircle } from 'lucide-react';
import LoaderScreen from '../../components/LoaderScreen';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [settings, setSettings] = useState({
    name: 'My Restaurant',
    address: '',
    pan: '',
    logo: '',
    currency: 'Rs.',
    taxRate: 0,
    taxEnabled: false,
    serviceChargeRate: 0,
    serviceChargeEnabled: false
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let logoUrl = settings.logo;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const res = await fetch('https://api.imgbb.com/1/upload?key=0e887e356028dfa76c96867759b68981', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data && data.data && data.data.url) {
          logoUrl = data.data.url;
        }
      }

      const newSettings = { ...settings, logo: logoUrl };
      await setDoc(doc(db, 'settings', 'general'), newSettings);
      setSettings(newSettings);
      setImageFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoaderScreen message="Gearing up Settings..." type="minimal" />;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <Store className="w-4 h-4" />
              <span>System Settings</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">
              Restaurant Config
            </h1>
            <p className="text-gray-400 font-medium">Configure your restaurant's identity and billing rules.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg disabled:opacity-50 shrink-0 ${
              saved 
                ? 'bg-emerald-500 text-white shadow-emerald-200' 
                : 'bg-gray-950 hover:bg-black text-white shadow-gray-200'
            }`}
          >
            {saving 
              ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              : saved 
                ? <><Check className="w-4 h-4" /><span>Saved!</span></>
                : <><Save className="w-4 h-4" /><span>Save Changes</span></>
            }
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Business Identity */}
          <section className="bg-white rounded-4xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-gray-950">Business Identity</h2>
                <p className="text-xs text-gray-400 font-medium">Your restaurant's public profile</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Restaurant Name</label>
                  <input 
                    type="text" required
                    value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all"
                    placeholder="e.g. The Everest Kitchen"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Currency Symbol</label>
                  <input 
                    type="text" required
                    value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all"
                    placeholder="e.g. Rs. or $"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Business Address</label>
                <textarea 
                  value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all min-h-[90px] resize-none"
                  placeholder="Street, City, Country"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">PAN / Tax Registration Number</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    value={settings.pan} onChange={e => setSettings({...settings, pan: e.target.value})}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-gray-800 transition-all"
                    placeholder="e.g. 601234567"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Billing & Taxes */}
          <section className="bg-white rounded-4xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-gray-950">Billing & Taxes</h2>
                <p className="text-xs text-gray-400 font-medium">VAT and service charge configuration</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* VAT */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gray-50 border border-gray-100 hover:border-blue-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm text-blue-600 flex items-center justify-center border border-gray-100">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-950">VAT / Tax</h3>
                    <p className="text-xs text-gray-400 font-medium italic">Standard government tax</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm">
                    <input 
                      type="number" 
                      disabled={!settings.taxEnabled}
                      value={settings.taxRate} 
                      onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})}
                      className="w-12 text-center font-black text-gray-800 outline-none bg-transparent disabled:opacity-40"
                    />
                    <span className="text-gray-400 font-black">%</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSettings({...settings, taxEnabled: !settings.taxEnabled})}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-all ${settings.taxEnabled ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-200'}`}
                  >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${settings.taxEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Service Charge */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gray-50 border border-gray-100 hover:border-amber-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm text-amber-600 flex items-center justify-center border border-gray-100">
                    <Percent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-950">Service Charge</h3>
                    <p className="text-xs text-gray-400 font-medium italic">Extra service fees</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm">
                    <input 
                      type="number" 
                      disabled={!settings.serviceChargeEnabled}
                      value={settings.serviceChargeRate} 
                      onChange={e => setSettings({...settings, serviceChargeRate: parseFloat(e.target.value) || 0})}
                      className="w-12 text-center font-black text-gray-800 outline-none bg-transparent disabled:opacity-40"
                    />
                    <span className="text-gray-400 font-black">%</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSettings({...settings, serviceChargeEnabled: !settings.serviceChargeEnabled})}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-all ${settings.serviceChargeEnabled ? 'bg-amber-500 shadow-lg shadow-amber-200' : 'bg-gray-200'}`}
                  >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${settings.serviceChargeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          
          {/* Logo */}
          <section className="bg-white rounded-4xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-black text-gray-950">Branding</h2>
                <p className="text-xs text-gray-400 font-medium">Restaurant logo</p>
              </div>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-4 p-2 relative group cursor-pointer hover:border-blue-300 transition-colors">
                {settings.logo || imageFile ? (
                  <img 
                    src={imageFile ? URL.createObjectURL(imageFile) : settings.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain mix-blend-multiply" 
                  />
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-200" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
                  <span className="text-[10px] text-white font-black uppercase tracking-widest">Change</span>
                </div>
                <input 
                  type="file" accept="image/*"
                  onChange={handleImageFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] font-bold text-gray-300 uppercase text-center leading-relaxed tracking-wider">
                Square PNG recommended<br/>Transparent background
              </p>
            </div>
          </section>

          {/* Support */}
          <section className="relative overflow-hidden bg-gray-950 rounded-4xl p-6 text-white text-center">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-4 bg-white/10 rounded-3xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white/60" />
              </div>
              <h3 className="text-lg font-black mb-2">Need support?</h3>
              <p className="text-white/40 text-xs font-medium leading-relaxed mb-5">
                Our team can help you configure taxes and branding for your restaurant.
              </p>
              <a
                href="https://wa.me/9779805713657?text=Hi, I need help with RestroMVP settings."
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5c] text-white w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Support
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
