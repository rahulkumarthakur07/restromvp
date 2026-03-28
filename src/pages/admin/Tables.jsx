import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, orderBy, query, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode, Save, Hotel, Layout, FileText, Loader2, Check } from 'lucide-react';
import { encryptTableId } from '../../utils/crypto';
import { jsPDF } from 'jspdf';

export default function Tables() {
  const [tableCount, setTableCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cabins, setCabins] = useState([]);
  const [settings, setSettings] = useState({ name: 'My Restaurant', logo: '' });
  const baseUrl = window.location.origin;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) setSettings(docSnap.data());
      } catch (e) {}
    };
    fetchSettings();

    const fetchTableCount = async () => {
      try {
        const snap = await getDocs(collection(db, 'tables'));
        if (!snap.empty) {
          const max = Math.max(...snap.docs.map(d => d.data().number || 0));
          if (max > 0) setTableCount(max);
        }
      } catch (e) {}
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
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('Failed to save tables'); }
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
    link.href = canvas.toDataURL('image/png');
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateBrandedCanvas = (canvasId, label, themeColor = '#3B82F6') => {
    return new Promise((resolve) => {
      const qrCanvas = document.getElementById(canvasId);
      if (!qrCanvas) return resolve(null);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 600; canvas.height = 850;

      const roundRect = (x, y, w, h, r) => {
        if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
        ctx.beginPath(); ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      };

      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#F3F4F6'; ctx.lineWidth = 20;
      roundRect(10, 10, canvas.width - 20, canvas.height - 20, 40); ctx.stroke();

      const drawContent = (logoImg) => {
        ctx.fillStyle = themeColor;
        roundRect(20, 20, canvas.width - 40, 120, 30); ctx.fill();
        if (logoImg) {
          const logoSize = 130; const logoX = (canvas.width - logoSize) / 2; const logoY = 60;
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath();
          ctx.arc(canvas.width / 2, logoY + logoSize / 2, (logoSize / 2) + 15, 0, Math.PI * 2); ctx.fill();
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        }
        ctx.fillStyle = '#111827'; ctx.font = '900 38px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(settings.name.toUpperCase(), canvas.width / 2, logoImg ? 225 : 80);
        ctx.fillStyle = themeColor; ctx.font = 'italic 900 36px serif';
        ctx.fillText('â€¢ Digital Menu â€¢', canvas.width / 2, logoImg ? 275 : 130);
        ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(150, 305); ctx.lineTo(450, 305); ctx.stroke();
        const qrSize = 345; const qrX = (canvas.width - qrSize) / 2; const qrY = 330;
        ctx.strokeStyle = '#F3F4F6'; ctx.lineWidth = 2;
        roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 20); ctx.stroke();
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        const badgeW = 320; const badgeH = 80; const badgeX = (canvas.width - badgeW) / 2; const badgeY = 695;
        ctx.fillStyle = themeColor; roundRect(badgeX, badgeY, badgeW, badgeH, 25); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        let fs = 52; ctx.font = `900 ${fs}px sans-serif`;
        while (ctx.measureText(label).width > badgeW - 40 && fs > 20) { fs -= 2; ctx.font = `900 ${fs}px sans-serif`; }
        ctx.fillText(label, canvas.width / 2, badgeY + (badgeH / 2) + (fs / 3));
        const scanW = 280; const scanH = 45; const scanX = (canvas.width - scanW) / 2; const scanY = 790;
        ctx.fillStyle = '#111827'; roundRect(scanX, scanY, scanW, scanH, 15); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 20px sans-serif';
        ctx.fillText('SCAN TO ORDER', canvas.width / 2, scanY + 30);
        resolve(canvas.toDataURL('image/png'));
      };

      if (settings.logo) {
        const img = new Image(); img.crossOrigin = 'anonymous'; img.src = settings.logo;
        img.onload = () => drawContent(img); img.onerror = () => drawContent(null);
      } else { drawContent(null); }
    });
  };

  const downloadBrandedQR = async (canvasId, label, filename, themeColor = '#3B82F6') => {
    const dataUrl = await generateBrandedCanvas(canvasId, label, themeColor);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl; link.download = filename;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadAllPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const items = [];
      for (let i = 1; i <= tableCount; i++) {
        items.push({ id: `qr-canvas-${i}`, label: `TABLE ${i}`, color: getTableColor(i) });
      }
      cabins.forEach(c => items.push({ id: `qr-cabin-${c.id}`, label: c.name.toUpperCase(), color: CABIN_COLOR }));
      const cardWidth = 65; const cardHeight = 92; const colWidth = 297 / 3; const rowHeight = 210 / 2;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dataUrl = await generateBrandedCanvas(item.id, item.label, item.color);
        if (!dataUrl) continue;
        const pageItemIndex = i % 6; const col = pageItemIndex % 3; const row = Math.floor(pageItemIndex / 3);
        const x = col * colWidth + (colWidth - cardWidth) / 2; const y = row * rowHeight + (rowHeight - cardHeight) / 2;
        pdf.addImage(dataUrl, 'PNG', x, y, cardWidth, cardHeight);
        if (pageItemIndex === 0) {
          pdf.setDrawColor(200, 200, 200); pdf.setLineDash([2, 2]);
          pdf.line(colWidth, 0, colWidth, 210); pdf.line(colWidth * 2, 0, colWidth * 2, 210);
          pdf.line(0, rowHeight, 297, rowHeight); pdf.setLineDash([]);
        }
        if (pageItemIndex === 5 && i < items.length - 1) pdf.addPage();
      }
      pdf.save(`${settings.name}_QR_Grid_Landscape.pdf`);
    } catch (e) { alert("PDF generation failed"); }
    setExporting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-violet-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-violet-50 text-violet-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <QrCode className="w-4 h-4" />
              <span>Tables & QR Codes</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">
              QR Management
            </h1>
            <p className="text-gray-400 font-medium">Generate QR codes for customers to scan and place orders.</p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tables</span>
              <input
                type="number" min="1" max="100"
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value))}
                className="w-14 text-center bg-white border border-gray-200 rounded-xl px-2 py-1.5 font-black text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              onClick={handleSaveTables} disabled={saving}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm disabled:opacity-50 ${saved ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-gray-950 hover:bg-black text-white shadow-gray-200'}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Synced!' : 'Sync Tables'}</span>
            </button>
            <button
              onClick={downloadAllPDF} disabled={exporting}
              className="flex items-center gap-2 bg-linear-to-r from-blue-600 to-indigo-700 hover:hue-rotate-15 text-white px-5 py-3 rounded-2xl shadow-lg shadow-blue-200 transition-all active:scale-95 font-black text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>Download All PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Regular Tables */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-black text-gray-950">Regular Tables</h2>
          <div className="px-3 py-1 bg-gray-100 text-gray-500 rounded-xl text-xs font-black uppercase tracking-widest">{tableCount} tables</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {Array.from({ length: tableCount }).map((_, i) => {
            const tableId = i + 1;
            const tableUrl = `${baseUrl}/table/${encryptTableId(tableId)}`;
            const hexColor = getTableColor(tableId);
            return (
              <div key={tableId} className="force-light group bg-white rounded-4xl border-2 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-gray-100/80 transition-all duration-500" style={{ borderColor: `${hexColor}25` }}>
                {/* Color header */}
                <div className="w-full py-3.5 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white" style={{ backgroundColor: hexColor }}>
                  <QrCode className="w-4 h-4" />
                  <span>Table {tableId}</span>
                </div>
                {/* QR */}
                <div className="p-6 flex items-center justify-center bg-white">
                  <div className="p-3 rounded-3xl border-2 border-dashed" style={{ borderColor: `${hexColor}30` }}>
                    <QRCodeCanvas id={`qr-canvas-${tableId}`} value={tableUrl} size={160} level="H" includeMargin={false} fgColor="#111827" />
                  </div>
                </div>
                {/* URL + Actions */}
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-[10px] text-gray-300 truncate text-center font-mono" title={tableUrl}>{tableUrl}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => downloadQR(`qr-canvas-${tableId}`, `table-${tableId}-raw.png`)}
                      className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-black py-2.5 rounded-2xl border border-gray-100 transition-all active:scale-95"
                    >
                      <Download className="w-3 h-3" /><span>Raw PNG</span>
                    </button>
                    <button
                      onClick={() => downloadBrandedQR(`qr-canvas-${tableId}`, `TABLE ${tableId}`, `table-${tableId}-branded.png`, hexColor)}
                      className="flex items-center justify-center gap-1.5 text-white text-xs font-black py-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm"
                      style={{ backgroundColor: hexColor }}
                    >
                      <Layout className="w-3 h-3" /><span>Branded</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cabin QR Codes */}
      {cabins.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Hotel className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-gray-950">Cabin / VIP QR Codes</h2>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100">{cabins.length} cabins</div>
          </div>
          <p className="text-sm text-gray-400 font-medium -mt-2 mb-5 pl-1 italic">Customers in a cabin scan this to order directly from their cabin.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {cabins.map((cabin) => {
              const cabinTableId = `cabin-${cabin.id}`;
              const cabinUrl = `${baseUrl}/table/${encryptTableId(cabinTableId)}`;
              const canvasId = `qr-cabin-${cabin.id}`;
              return (
                <div key={cabin.id} className="force-light group bg-white rounded-4xl border-2 border-indigo-100/60 overflow-hidden flex flex-col hover:shadow-2xl hover:shadow-indigo-50/80 transition-all duration-500">
                  <div className="w-full py-3.5 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white" style={{ backgroundColor: CABIN_COLOR }}>
                    <Hotel className="w-4 h-4" /><span>{cabin.name}</span>
                  </div>
                  {cabin.image && <img src={cabin.image} alt={cabin.name} className="w-full h-20 object-cover" />}
                  <div className="p-6 flex items-center justify-center bg-white">
                    <div className="p-3 rounded-3xl border-2 border-dashed border-indigo-100">
                      <QRCodeCanvas id={canvasId} value={cabinUrl} size={160} level="H" includeMargin={false} fgColor="#111827" />
                    </div>
                  </div>
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-[10px] text-gray-300 truncate text-center font-mono" title={cabinUrl}>{cabinUrl}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => downloadQR(canvasId, `cabin-${cabin.name}-raw.png`)}
                        className="flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-black py-2.5 rounded-2xl border border-gray-100 transition-all active:scale-95"
                      >
                        <Download className="w-3 h-3" /><span>Raw PNG</span>
                      </button>
                      <button
                        onClick={() => downloadBrandedQR(canvasId, cabin.name.toUpperCase(), `cabin-${cabin.name}-branded.png`, CABIN_COLOR)}
                        className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 rounded-2xl transition-all active:scale-95 shadow-sm shadow-indigo-200"
                      >
                        <Layout className="w-3 h-3" /><span>Branded</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No cabins yet */}
      {cabins.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-4xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Hotel className="w-8 h-8 text-indigo-200" />
          </div>
          <p className="font-black text-gray-300 text-lg">No cabins yet</p>
          <p className="text-sm text-gray-300 font-medium mt-1 max-w-xs mx-auto">Add cabins in the "Cabins & VIP" section to generate QR codes for them.</p>
        </div>
      )}
    </div>
  );
}


