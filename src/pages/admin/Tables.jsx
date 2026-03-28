import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, orderBy, query, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode, Save, Hotel, Layout, FileText, Loader2 } from 'lucide-react';
import { encryptTableId } from '../../utils/crypto';
import { jsPDF } from 'jspdf';

export default function Tables() {
  const [tableCount, setTableCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cabins, setCabins] = useState([]);
  const [settings, setSettings] = useState({ name: 'My Restaurant', logo: '' });
  const baseUrl = window.location.origin;

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
      }
    };
    fetchSettings();

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
      canvas.width = 600;
      canvas.height = 850;

      const roundRect = (x, y, w, h, r) => {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 20;
      roundRect(10, 10, canvas.width - 20, canvas.height - 20, 40);
      ctx.stroke();

      const drawContent = (logoImg) => {
        ctx.fillStyle = themeColor;
        roundRect(20, 20, canvas.width - 40, 120, 30);
        ctx.fill();

        if (logoImg) {
          const logoSize = 130;
          const logoX = (canvas.width - logoSize) / 2;
          const logoY = 60;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(canvas.width / 2, logoY + logoSize / 2, (logoSize / 2) + 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        }

        ctx.fillStyle = '#111827';
        ctx.font = '900 38px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(settings.name.toUpperCase(), canvas.width / 2, logoImg ? 225 : 80);

        ctx.fillStyle = themeColor;
        ctx.font = 'italic 900 36px serif';
        ctx.fillText('• Digital Menu •', canvas.width / 2, logoImg ? 275 : 130);

        ctx.strokeStyle = '#E5E7EB';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(150, 305); ctx.lineTo(450, 305); ctx.stroke();

        const qrSize = 345;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 330;
        ctx.strokeStyle = '#F3F4F6';
        ctx.lineWidth = 2;
        roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 20);
        ctx.stroke();
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

        const badgeW = 320;
        const badgeH = 80;
        const badgeX = (canvas.width - badgeW) / 2;
        const badgeY = 695;
        ctx.fillStyle = themeColor;
        roundRect(badgeX, badgeY, badgeW, badgeH, 25);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';

        let currentFontSize = 52;
        ctx.font = `900 ${currentFontSize}px sans-serif`;
        while (ctx.measureText(label).width > badgeW - 40 && currentFontSize > 20) {
          currentFontSize -= 2;
          ctx.font = `900 ${currentFontSize}px sans-serif`;
        }
        ctx.font = `900 ${currentFontSize}px sans-serif`;
        ctx.fillText(label, canvas.width / 2, badgeY + (badgeH / 2) + (currentFontSize / 3));

        const scanW = 280;
        const scanH = 45;
        const scanX = (canvas.width - scanW) / 2;
        const scanY = 790;
        ctx.fillStyle = '#111827';
        roundRect(scanX, scanY, scanW, scanH, 15);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText('SCAN TO ORDER', canvas.width / 2, scanY + 30);

        resolve(canvas.toDataURL('image/png'));
      };

      if (settings.logo) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = settings.logo;
        img.onload = () => drawContent(img);
        img.onerror = () => drawContent(null);
      } else {
        drawContent(null);
      }
    });
  };

  const downloadBrandedQR = async (canvasId, label, filename, themeColor = '#3B82F6') => {
    const dataUrl = await generateBrandedCanvas(canvasId, label, themeColor);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllPDF = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const items = [];
      
      for (let i = 1; i <= tableCount; i++) {
        items.push({ id: `qr-canvas-${i}`, label: `TABLE ${i}`, color: getTableColor(i) });
      }
      cabins.forEach(c => {
        items.push({ id: `qr-cabin-${c.id}`, label: c.name.toUpperCase(), color: CABIN_COLOR });
      });

      const cardWidth = 65; 
      const cardHeight = 92; 
      const colWidth = 297 / 3;
      const rowHeight = 210 / 2;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const dataUrl = await generateBrandedCanvas(item.id, item.label, item.color);
        if (!dataUrl) continue;

        const pageItemIndex = i % 6;
        const col = pageItemIndex % 3;
        const row = Math.floor(pageItemIndex / 3);

        const x = col * colWidth + (colWidth - cardWidth) / 2;
        const y = row * rowHeight + (rowHeight - cardHeight) / 2;

        pdf.addImage(dataUrl, 'PNG', x, y, cardWidth, cardHeight);

        if (pageItemIndex === 0) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineDash([2, 2]);
          pdf.line(colWidth, 0, colWidth, 210);
          pdf.line(colWidth * 2, 0, colWidth * 2, 210);
          pdf.line(0, rowHeight, 297, rowHeight);
          pdf.setLineDash([]); 
        }

        if (pageItemIndex === 5 && i < items.length - 1) {
          pdf.addPage();
        }
      }
      pdf.save(`${settings.name}_QR_Grid_Landscape.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF generation failed");
    }
    setExporting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Table & Cabin QR Codes</h1>
          <p className="text-gray-500">Generate QR codes for customers to scan and order.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Tables</label>
            <input
              type="number" min="1" max="100"
              value={tableCount}
              onChange={(e) => setTableCount(Number(e.target.value))}
              className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800"
            />
          </div>
          
          <button
            onClick={handleSaveTables} disabled={saving}
            className="bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center space-x-2 font-bold text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Sync</span>
          </button>

          <button
            onClick={downloadAllPDF} disabled={exporting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md shadow-blue-100 transition-all flex items-center space-x-2 font-bold text-sm disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>Download All (PDF)</span>
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-black text-gray-700 mb-4 flex items-center gap-2"><QrCode className="w-5 h-5 text-blue-500" />Regular Tables</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: tableCount }).map((_, i) => {
            const tableId = i + 1;
            const tableUrl = `${baseUrl}/table/${encryptTableId(tableId)}`;
            const hexColor = getTableColor(tableId);
            return (
              <div key={tableId} className="force-light rounded-3xl shadow-sm border-2 overflow-hidden flex flex-col items-center text-center hover:shadow-md transition-shadow" style={{ borderColor: `${hexColor}20` }}>
                <div className="w-full py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white" style={{ backgroundColor: hexColor }}>
                  <QrCode className="w-5 h-5" /><span>Table {tableId}</span>
                </div>
                <div className="p-6 pb-2 flex items-center justify-center">
                  <QRCodeCanvas id={`qr-canvas-${tableId}`} value={tableUrl} size={180} level="H" includeMargin={false} fgColor="#000000" />
                </div>
                <div className="w-full px-3 pb-3 space-y-2">
                  <p className="text-[10px] text-gray-400 truncate mb-1" title={tableUrl}>{tableUrl}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => downloadQR(`qr-canvas-${tableId}`, `table-${tableId}-raw.png`)} className="flex items-center justify-center space-x-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-2 rounded-xl border border-gray-100 transition-colors">
                      <Download className="w-3 h-3" /><span>Raw</span>
                    </button>
                    <button onClick={() => downloadBrandedQR(`qr-canvas-${tableId}`, `TABLE ${tableId}`, `table-${tableId}-branded.png`, hexColor)} className="flex items-center justify-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold py-2 rounded-xl border border-blue-100 transition-colors">
                      <Layout className="w-3 h-3" /><span>Branded</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                <div key={cabin.id} className="force-light rounded-3xl shadow-sm border-2 overflow-hidden flex flex-col items-center text-center hover:shadow-md transition-shadow" style={{ borderColor: `${CABIN_COLOR}20` }}>
                  <div className="w-full py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white" style={{ backgroundColor: CABIN_COLOR }}>
                    <Hotel className="w-5 h-5" /><span>{cabin.name}</span>
                  </div>
                  {cabin.image && <img src={cabin.image} alt={cabin.name} className="w-full h-20 object-cover" />}
                  <div className="p-6 pb-2 flex items-center justify-center">
                    <QRCodeCanvas id={canvasId} value={cabinUrl} size={180} level="H" includeMargin={false} fgColor="#000000" />
                  </div>
                  <div className="w-full px-3 pb-3 space-y-2">
                    <p className="text-[10px] text-gray-400 truncate mb-1" title={cabinUrl}>{cabinUrl}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => downloadQR(canvasId, `cabin-${cabin.name}-raw.png`)} className="flex items-center justify-center space-x-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold py-2 rounded-xl border border-gray-100 transition-colors">
                        <Download className="w-3 h-3" /><span>Raw</span>
                      </button>
                      <button onClick={() => downloadBrandedQR(canvasId, cabin.name.toUpperCase(), `cabin-${cabin.name}-branded.png`, CABIN_COLOR)} className="flex items-center justify-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold py-2 rounded-xl border border-indigo-100 transition-colors">
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
      {cabins.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center text-indigo-500 font-medium text-sm">
          <Hotel className="w-6 h-6 mx-auto mb-2 opacity-50" />
          No cabins added yet. Add cabins in the "Cabins & VIP" section to generate QR codes for them.
        </div>
      )}
    </div>
  );
}
