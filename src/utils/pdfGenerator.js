import { jsPDF } from 'jspdf';

export const generatePDFReceipt = async (order, settings) => {
  const doc = new jsPDF();
  let y = 20;
  
  // Try to load and add the logo
  if (settings?.logo) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = settings.logo;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image failed to load'));
      });
      // Calculate aspect ratio
      const imgWidth = 40;
      const imgHeight = (img.height / img.width) * imgWidth;
      doc.addImage(img, 'PNG', 85, y, imgWidth, imgHeight);
      y += imgHeight + 15;
    } catch (e) {
      console.warn("Failed to load logo for PDF", e);
    }
  }

  doc.setFontSize(22);
  doc.text(settings?.name || 'Restaurant', 105, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(12);
  if (settings?.address) {
    doc.text(settings.address.replace(/\n/g, ', '), 105, y, { align: 'center' });
    y += 8;
  }
  if (settings?.pan) {
    doc.text(`PAN: ${settings.pan}`, 105, y, { align: 'center' });
    y += 10;
  }
  
  doc.line(20, y, 190, y);
  y += 10;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('RECEIPT', 105, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Queue #${order.tokenNumber} | Table ${order.tableId}`, 20, y);
  doc.text(new Date().toLocaleDateString(), 190, y, { align: 'right' });
  y += 10;
  
  if (order.customerName) {
    doc.text(`Customer: ${order.customerName}`, 20, y);
    y += 8;
  }
  if (order.customerPhone) {
    doc.text(`Phone: ${order.customerPhone}`, 20, y);
    y += 8;
  }
  
  doc.line(20, y, 190, y);
  y += 10;
  
  order.items.forEach(item => {
    doc.text(`${item.quantity}x ${item.name}`, 20, y);
    doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 190, y, { align: 'right' });
    y += 8;
  });
  
  doc.line(20, y, 190, y);
  y += 10;
  
  // Breakdown
  const currency = settings?.currency || 'Rs.';
  doc.setFont(undefined, 'normal');
  doc.text('Subtotal', 20, y);
  doc.text(`${currency} ${(order.subtotal || (order.totalAmount - (order.taxAmount || 0) - (order.serviceChargeAmount || 0))).toFixed(2)}`, 190, y, { align: 'right' });
  y += 8;

  if (order.serviceChargeAmount > 0) {
    doc.text(`Service Charge (${settings?.serviceChargeRate || 0}%)`, 20, y);
    doc.text(`${currency} ${order.serviceChargeAmount.toFixed(2)}`, 190, y, { align: 'right' });
    y += 8;
  }

  if (order.taxAmount > 0) {
    doc.text(`VAT (${settings?.taxRate || 0}%)`, 20, y);
    doc.text(`${currency} ${order.taxAmount.toFixed(2)}`, 190, y, { align: 'right' });
    y += 8;
  }

  doc.line(20, y, 190, y);
  y += 10;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL DUE', 20, y);
  doc.text(`${currency} ${order.totalAmount?.toFixed(2) || '0.00'}`, 190, y, { align: 'right' });
  y += 20;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Thank you for your visit!', 105, y, { align: 'center' });
  
  doc.save(`Receipt_${order.tokenNumber}.pdf`);
};
