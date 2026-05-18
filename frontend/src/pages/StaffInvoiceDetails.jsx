import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { sendInvoiceEmail } from '../services/api';
import { getStoredInvoice, saveStoredInvoice } from '../utils/invoiceStorage';

function buildInvoicePdf(invoice) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(18);
  doc.text('GarageGo Invoice', 14, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Invoice #: ${invoice.saleId}`, 14, y);
  y += 7;
  doc.text(`Customer ID: ${invoice.customerId}`, 14, y);
  y += 7;
  doc.text(`Customer Email: ${invoice.customerEmail || 'Not set'}`, 14, y);
  y += 7;
  doc.text(`Date: ${new Date(invoice.date).toLocaleString()}`, 14, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Items', 14, y);
  y += 8;

  invoice.items.forEach((item) => {
    const line = `${item.partName} | Qty ${item.quantity} | Rs${Number(item.price || 0).toFixed(2)} | Rs${Number(item.lineTotal || 0).toFixed(2)}`;
    const lines = doc.splitTextToSize(line, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 3;
  });

  y += 4;
  doc.setFontSize(13);
  doc.text(`Total: Rs${Number(invoice.totalAmount || 0).toFixed(2)}`, 14, y);

  doc.save(`garagego-invoice-${invoice.saleId}.pdf`);
}

function StaffInvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const invoice = useMemo(() => {
    const locationInvoice = location.state?.invoice;
    if (locationInvoice?.saleId) {
      return saveStoredInvoice(locationInvoice);
    }

    return getStoredInvoice(id);
  }, [id, location.state]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (!invoice) {
      return;
    }

    buildInvoicePdf(invoice);
  };

  const handleSendEmail = async () => {
    if (!invoice?.customerEmail) {
      alert('Customer email is missing for this invoice.');
      return;
    }

    try {
      await sendInvoiceEmail({
        email: invoice.customerEmail,
        invoice,
      });
      alert('Invoice email sent successfully.');
    } catch (error) {
      alert(error?.message || 'Failed to send invoice email.');
    }
  };

  if (!invoice) {
    return (
      <section className="container">
        <div className="placeholder-card card">
          <p className="placeholder-title">Invoice not found</p>
          <p className="placeholder-copy">Open an invoice from Sales or Invoices to view its details.</p>
          <div className="dashboard-card-links" style={{ marginTop: '16px' }}>
            <button className="button button-primary" type="button" onClick={() => navigate('/staff/sales')}>
              Create Invoice
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Invoice Details</h2>
        <p className="section-copy">Review the invoice, print it, download a PDF, or send it to the customer by email.</p>
      </div>

      <article className="sales-card invoice-card">
        <div className="invoice-header">
          <h2>Invoice #{invoice.saleId}</h2>
          <p>GarageGo Sales Receipt</p>
        </div>

        <div className="invoice-details">
          <div className="invoice-row"><span>Customer ID:</span><span>{invoice.customerId}</span></div>
          <div className="invoice-row"><span>Customer Email:</span><span>{invoice.customerEmail || 'Not set'}</span></div>
          <div className="invoice-row"><span>Date:</span><span>{new Date(invoice.date).toLocaleString()}</span></div>
        </div>

        <div className="invoice-items">
          <h3>Items Purchased</h3>
          <ul className="invoice-list">
            {invoice.items.map((item) => (
              <li key={item.partId} className="invoice-item">
                <span>{item.partName || `Part ${item.partId}`}</span>
                <span>{item.quantity} x Rs{Number(item.price || 0).toFixed(2)}</span>
                <span>Rs{Number(item.lineTotal || 0).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="invoice-total">
          <div className="invoice-row invoice-row--total">
            <span>Total:</span>
            <span>Rs{Number(invoice.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="invoice-email">
          <label className="field">
            <span className="field__label">Customer Email</span>
            <input type="email" value={invoice.customerEmail || ''} readOnly />
          </label>
        </div>

        <div className="invoice-actions">
          <button className="btn btn--secondary" type="button" onClick={handlePrint}>Print Invoice</button>
          <button className="btn btn--secondary" type="button" onClick={handleDownloadPdf}>Download PDF</button>
          <button className="btn btn--primary" type="button" onClick={handleSendEmail}>Send Email</button>
        </div>
      </article>
    </section>
  );
}

export default StaffInvoiceDetails;