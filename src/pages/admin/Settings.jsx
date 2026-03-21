import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Store, Save } from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [settings, setSettings] = useState({
    name: 'My Restaurant',
    address: '',
    pan: '',
    logo: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
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

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 rounded-full bg-blue-50 text-blue-600">
          <Store className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500 font-medium">Configure details used in your printable bills and UI.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Restaurant Name</label>
            <input 
              type="text" required
              value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Address</label>
            <textarea 
              value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">PAN / Tax Number</label>
            <input 
              type="text"
              value={settings.pan} onChange={e => setSettings({...settings, pan: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700 mb-1">Restaurant Logo</label>
            {settings.logo && !imageFile && (
              <img src={settings.logo} alt="Logo" className="h-20 object-contain rounded-lg border border-gray-200 mb-2 p-1 bg-gray-50 maxWidth-[200px]" />
            )}
            <input 
              type="file" accept="image/*"
              onChange={handleImageFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
          <button 
            type="submit" disabled={saving}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center space-x-2"
          >
            {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <><Save className="w-5 h-5"/><span>Save Details</span></>}
          </button>
        </div>
      </form>
    </div>
  );
}
