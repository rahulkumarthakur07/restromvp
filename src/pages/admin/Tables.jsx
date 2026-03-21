import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

export default function Tables() {
  const [tableCount, setTableCount] = useState(5);
  const baseUrl = window.location.origin;

  const TABLE_COLORS = [
    '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6'
  ];

  const getTableColor = (id) => TABLE_COLORS[(id - 1) % TABLE_COLORS.length];

  const downloadQR = (tableId) => {
    const canvas = document.getElementById(`qr-canvas-${tableId}`);
    if (!canvas) return;
    
    const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
    
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `table-${tableId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Table QR Codes</h1>
          <p className="text-gray-500">Generate QR codes for customers to scan and order.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700">Number of Tables:</label>
          <input 
            type="number" 
            min="1" max="100"
            value={tableCount} 
            onChange={(e) => setTableCount(Number(e.target.value))}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.from({ length: tableCount }).map((_, i) => {
          const tableId = i + 1;
          const tableUrl = `${baseUrl}/table/${tableId}`;
          const hexColor = getTableColor(tableId);
          
          return (
            <div key={tableId} className="bg-white rounded-3xl shadow-sm border-2 overflow-hidden flex flex-col items-center text-center hover:shadow-md transition-shadow" style={{borderColor: `${hexColor}20`}}>
              <div 
                className="w-full py-3 font-black text-sm tracking-widest uppercase flex items-center justify-center space-x-2 text-white"
                style={{ backgroundColor: hexColor }}
              >
                <QrCode className="w-5 h-5" />
                <span>Table {tableId}</span>
              </div>
              
              <div className="bg-white p-6 pb-2 flex items-center justify-center">
                <QRCodeCanvas 
                  id={`qr-canvas-${tableId}`}
                  value={tableUrl} 
                  size={180}
                  level="H"
                  includeMargin={false}
                  fgColor="#000000"
                />
              </div>

              <div className="w-full">
                <p className="text-xs text-gray-400 truncate w-full mb-4 px-2" title={tableUrl}>
                  {tableUrl}
                </p>
                <button 
                  onClick={() => downloadQR(tableId)}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl border border-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
