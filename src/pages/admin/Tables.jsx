import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode, Save, Hotel } from 'lucide-react';
import { encryptTableId } from '../../utils/crypto';

export default function Tables() {
  const [tableCount, setTableCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const [cabins, setCabins] = useState([]);
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchTableCount = async () => {
      try {
        const snap = await getDocs(collection(db, 'tables'));
        if (!snap.empty) {
          const max = Math.max(...snap.docs.map(d => d.data().number || 0));
          if (max > 0) setTableCount(max);
        }
      } catch (e) { console.error("Failed fetching tables", e); }
    };
    fetchTableCount();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'cabins'), orderBy('name'));
    const unsub = onSnapshot(q, snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSaveTables = async () => {
    setSaving(true);
    try {
      for (let i = 1; i <= tableCount; i++) {
        await setDoc(doc(db, 'tables', `table-${i}`), { number: i, capacity: 4 });
      }
      const snap = await getDocs(collection(db, 'tables'));
      for (const d of snap.docs) {
        if (d.data().number > tableCount) await deleteDoc(d.ref);
      }
      alert('Tables successfully synchronized!');
    } catch (e) { console.error(e); alert('Failed to save tables'); }
    setSaving(false);
  };

  const TABLE_COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
  ];
  const getTableColor = (id) => TABLE_COLORS[(id - 1) % TABLE_COLORS.length];
  const CABIN_COLOR = '#6366F1';

  const downloadQR = (canvasId, filename) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header + controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Table & Cabin QR Codes</h1>
          <p className="text-gray-500">Generate QR codes for customers to scan and order.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Number of Tables:</label>
          <input
            type="number" min="1" max="100"
            value={tableCount}
            onChange={(e) => setTableCount(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold"
          />
          <button
            onClick={handleSaveTables} disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl shadow-sm transition-colors flex items-center space-x-2 font-bold px-4"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Regular Table QRs */}
      <div>
        <h2 className="text-lg font-black text-gray-700 mb-4 flex items-center gap-2"><QrCode className="w-5 h-5 text-blue-500" />Regular Tables</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: tableCount }).map((_, i) => {
            const tableId = i + 1;
            const tableUrl = `${baseUrl}/table/${encryptTableId(tableId)}`;
            const hexColor = getTableColor(tableId);
            return (
              <div key={tableId} className="bg-white rounded-3xl shadow-sm border-2 overflow-hidden flex flex-col items-center text-center hover:shadow-md transition-shadow" style={{ borderColor: `${hexColor}20` }}>
                <div className="w-full py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white" style={{ backgroundColor: hexColor }}>
                  <QrCode className="w-5 h-5" /><span>Table {tableId}</span>
                </div>
                <div className="bg-white p-6 pb-2 flex items-center justify-center">
                  <QRCodeCanvas id={`qr-canvas-${tableId}`} value={tableUrl} size={180} level="H" includeMargin={false} fgColor="#000000" />
                </div>
                <div className="w-full px-3 pb-3">
                  <p className="text-xs text-gray-400 truncate mb-3" title={tableUrl}>{tableUrl}</p>
                  <button onClick={() => downloadQR(`qr-canvas-${tableId}`, `table-${tableId}-qr.png`)} className="w-full flex items-center justify-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl border border-gray-200 transition-colors">
                    <Download className="w-4 h-4" /><span>Download PNG</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cabin QRs */}
      {cabins.length > 0 && (
        <div>
          <h2 className="text-lg font-black text-gray-700 mb-4 flex items-center gap-2"><Hotel className="w-5 h-5 text-indigo-500" />Cabin / VIP Tables</h2>
          <p className="text-sm text-gray-400 -mt-2 mb-4">Customers at a cabin can scan these QRs to order food directly from their cabin.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {cabins.map((cabin) => {
              const cabinTableId = `cabin-${cabin.id}`;
              const cabinUrl = `${baseUrl}/table/${encryptTableId(cabinTableId)}`;
              const canvasId = `qr-cabin-${cabin.id}`;
              return (
                <div key={cabin.id} className="bg-white rounded-3xl shadow-sm border-2 overflow-hidden flex flex-col items-center text-center hover:shadow-md transition-shadow" style={{ borderColor: `${CABIN_COLOR}20` }}>
                  <div className="w-full py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white" style={{ backgroundColor: CABIN_COLOR }}>
                    <Hotel className="w-5 h-5" /><span>{cabin.name}</span>
                  </div>
                  {cabin.image && <img src={cabin.image} alt={cabin.name} className="w-full h-20 object-cover" />}
                  <div className="bg-white p-6 pb-2 flex items-center justify-center">
                    <QRCodeCanvas id={canvasId} value={cabinUrl} size={180} level="H" includeMargin={false} fgColor="#4F46E5" />
                  </div>
                  <div className="w-full px-3 pb-3">
                    <p className="text-xs text-gray-400 truncate mb-3" title={cabinUrl}>{cabinUrl}</p>
                    <button onClick={() => downloadQR(canvasId, `cabin-${cabin.name}-qr.png`)} className="w-full flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2.5 rounded-xl border border-indigo-100 transition-colors">
                      <Download className="w-4 h-4" /><span>Download PNG</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {cabins.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center text-indigo-500 font-medium text-sm">
          <Hotel className="w-6 h-6 mx-auto mb-2 opacity-50" />
          No cabins added yet. Add cabins in the "Cabins & VIP" section to generate QR codes for them.
        </div>
      )}
    </div>
  );
}

