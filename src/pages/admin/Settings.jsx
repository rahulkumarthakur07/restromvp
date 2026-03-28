import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Store, Save, Percent, Receipt, Globe, Image as ImageIcon, Briefcase, Calculator } from 'lucide-react';
import LoaderScreen from '../../components/LoaderScreen';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      alert('Settings saved successfully!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoaderScreen message="Gearing up Settings..." type="minimal" />;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-gray-500 font-medium">Configure your restaurant's identity and billing rules.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
        >
          {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Save className="w-5 h-5"/><span>Save Changes</span></>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: General & Identity */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="font-black text-gray-800">Business Identity</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Restaurant Name</label>
                  <input 
                    type="text" required
                    value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 transition-all"
                    placeholder="e.g. The Everest Kitchen"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Currency Symbol</label>
                  <input 
                    type="text" required
                    value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 transition-all"
                    placeholder="e.g. Rs. or $"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Business Address</label>
                <textarea 
                  value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 transition-all min-h-[100px]"
                  placeholder="Street, City, Country"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">PAN / Tax Registration Number</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    value={settings.pan} onChange={e => setSettings({...settings, pan: e.target.value})}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 transition-all"
                    placeholder="e.g. 601234567"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                <Calculator className="w-5 h-5" />
              </div>
              <h2 className="font-black text-gray-800">Billing & Taxes</h2>
            </div>
            <div className="p-6 space-y-8">
              {/* VAT / TAX */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800">VAT / Tax</h3>
                    <p className="text-xs text-gray-500 font-medium italic">Standard government tax</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200">
                    <input 
                      type="number" 
                      disabled={!settings.taxEnabled}
                      value={settings.taxRate} 
                      onChange={e => setSettings({...settings, taxRate: parseFloat(e.target.value) || 0})}
                      className="w-12 text-center font-black text-gray-800 outline-none bg-transparent"
                    />
                    <span className="text-gray-400 font-black">%</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSettings({...settings, taxEnabled: !settings.taxEnabled})}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors ${settings.taxEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${settings.taxEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Service Charge */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                    <Percent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-800">Service Charge</h3>
                    <p className="text-xs text-gray-500 font-medium italic">Extra service fees</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200">
                    <input 
                      type="number" 
                      disabled={!settings.serviceChargeEnabled}
                      value={settings.serviceChargeRate} 
                      onChange={e => setSettings({...settings, serviceChargeRate: parseFloat(e.target.value) || 0})}
                      className="w-12 text-center font-black text-gray-800 outline-none bg-transparent"
                    />
                    <span className="text-gray-400 font-black">%</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSettings({...settings, serviceChargeEnabled: !settings.serviceChargeEnabled})}
                    className={`w-14 h-8 rounded-full flex items-center p-1 transition-colors ${settings.serviceChargeEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${settings.serviceChargeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Logo & Visuals */}
        <div className="space-y-6">
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h2 className="font-black text-gray-800">Branding</h2>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden mb-4 p-2 relative group">
                {settings.logo || imageFile ? (
                  <img 
                    src={imageFile ? URL.createObjectURL(imageFile) : settings.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain mix-blend-multiply" 
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white font-black uppercase tracking-widest">Change</span>
                </div>
                <input 
                  type="file" accept="image/*"
                  onChange={handleImageFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase text-center leading-relaxed">
                Preferred: Square PNG<br/>Transparent background
              </p>
            </div>
          </section>

          <section className="bg-linear-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl p-6 text-white text-center">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-black mb-2">Need direct help?</h3>
            <p className="text-blue-100 text-xs font-medium leading-relaxed mb-4">
              Our support team is available to help you configure your taxes and branding.
            </p>
            <button className="bg-white/10 hover:bg-white/20 text-white w-full py-3 rounded-2xl font-black text-sm transition-all">
              Contact Support
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
