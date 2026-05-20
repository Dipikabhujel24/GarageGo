import { jsPDF } from 'jspdf';

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

export function buildPurchaseInvoicePdf(invoice) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(18);
  doc.text('GarageGo Purchase Invoice', 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, y);
  y += 7;
  doc.text(`Vendor: ${invoice.vendorName || '-'}`, 14, y);
  y += 7;
  doc.text(`Company: ${invoice.companyName || '-'}`, 14, y);
  y += 7;
  doc.text(`Date: ${new Date(invoice.purchaseDate).toLocaleDateString()}`, 14, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Items Purchased', 14, y);
  y += 8;

  (invoice.items || []).forEach((item) => {
    const line = `${item.partName} | Qty ${item.quantity} | ${formatCurrency(item.unitPrice)} | ${formatCurrency(item.subTotal)}`;
    const lines = doc.splitTextToSize(line, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 3;
  });

  y += 4;
  doc.text(`Total: ${formatCurrency(invoice.totalAmount)}`, 14, y);

  const safeNumber = (invoice.invoiceNumber || invoice.id || 'invoice')
    .toString()
    .replace(/[^\w-]+/g, '-');
  doc.save(`garagego-purchase-${safeNumber}.pdf`);
}
