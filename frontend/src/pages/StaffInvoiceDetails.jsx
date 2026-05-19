import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { extractApiError, getSaleById, getSalesCatalog, sendInvoiceEmail } from '../services/api';
import { getStoredInvoice, saveStoredInvoice } from '../utils/invoiceStorage';
import './StaffSalesPage.css';

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

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
  doc.text(`Date: ${new Date(invoice.date).toLocaleString()}`, 14, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Items', 14, y);
  y += 8;

  invoice.items.forEach((item) => {
    const line = `Part ID ${item.partId} — ${item.partName} | Qty ${item.quantity} | ${formatCurrency(item.price)} | ${formatCurrency(item.lineTotal)}`;
    const lines = doc.splitTextToSize(line, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 3;
  });

  y += 4;
  doc.text(`Subtotal: ${formatCurrency(invoice.totalAmount)}`, 14, y);
  y += 7;
  doc.text(`Discount: ${formatCurrency(invoice.discountAmount)}`, 14, y);
  y += 7;
  doc.text(`Final: ${formatCurrency(invoice.finalAmount ?? invoice.totalAmount)}`, 14, y);

  doc.save(`garagego-invoice-${invoice.saleId}.pdf`);
}

function mapApiSaleToInvoice(sale, customerMeta = {}) {
  return {
    saleId: sale.id,
    customerId: sale.customerId,
    date: sale.date,
    totalAmount: sale.totalAmount,
    discountAmount: sale.discountAmount ?? 0,
    finalAmount: sale.finalAmount ?? sale.totalAmount,
    loyaltyDiscountApplied: sale.loyaltyDiscountApplied,
    loyaltyPointsEarned: Math.floor(Number(sale.finalAmount ?? sale.totalAmount) / 100),
    customerEmail: customerMeta.email || '',
    customerName: customerMeta.name || '',
    items: (sale.items || []).map((item) => ({
      partId: item.partId,
      partName: item.partName || `Part ${item.partId}`,
      quantity: item.quantity,
      price: item.price,
      lineTotal: item.lineTotal ?? item.quantity * item.price,
    })),
  };
}

function StaffInvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const locationInvoice = useMemo(() => {
    const candidate = location.state?.invoice;
    if (candidate?.saleId) {
      return saveStoredInvoice(candidate);
    }
    return getStoredInvoice(id);
  }, [id, location.state]);

  useEffect(() => {
    let mounted = true;

    const loadInvoice = async () => {
      setIsLoading(true);
      setFeedback('');

      if (locationInvoice) {
        if (mounted) {
          setInvoice(locationInvoice);
          setIsLoading(false);
        }
        return;
      }

      try {
        const [saleResponse, catalogResponse] = await Promise.all([
          getSaleById(id),
          getSalesCatalog(),
        ]);

        if (!mounted) {
          return;
        }

        const customers = catalogResponse.data?.customers ?? [];
        const customer = customers.find((entry) => entry.id === saleResponse.data?.customerId);
        const mapped = mapApiSaleToInvoice(saleResponse.data, customer || {});
        const stored = saveStoredInvoice(mapped);
        setInvoice(stored);
      } catch (error) {
        if (mounted) {
          setFeedback(extractApiError(error));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInvoice();

    return () => {
      mounted = false;
    };
  }, [id, locationInvoice]);

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
        saleId: invoice.saleId,
        invoice,
      });
      alert('Invoice email sent successfully.');
    } catch (error) {
      alert(error?.message || 'Failed to send invoice email.');
    }
  };

  if (isLoading) {
    return (
      <section className="sales-page-shell">
        <div className="sales-banner sales-banner--info">Loading invoice...</div>
      </section>
    );
  }

  if (!invoice) {
    return (
      <section className="container">
        <PlaceholderCard feedback={feedback} navigate={navigate} />
      </section>
    );
  }

  return (
    <section className="container">
      {feedback ? <div className="sales-banner sales-banner--error">{feedback}</div> : null}

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
          {invoice.customerName ? (
            <div className="invoice-row"><span>Customer Name:</span><span>{invoice.customerName}</span></div>
          ) : null}
          <div className="invoice-row"><span>Customer Email:</span><span>{invoice.customerEmail || 'Not set'}</span></div>
          <div className="invoice-row"><span>Date:</span><span>{new Date(invoice.date).toLocaleString()}</span></div>
        </div>

        <div className="invoice-items">
          <h3>Items Purchased</h3>
          <ul className="invoice-list">
            {invoice.items.map((item) => (
              <li key={item.partId} className="invoice-item">
                <span>Part ID {item.partId} — {item.partName || `Part ${item.partId}`}</span>
                <span>{item.quantity} x {formatCurrency(item.price)}</span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="invoice-total">
          <div className="invoice-row"><span>Subtotal:</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
          {invoice.loyaltyDiscountApplied ? (
            <div className="invoice-row"><span>Loyalty Discount (10%):</span><span>-{formatCurrency(invoice.discountAmount)}</span></div>
          ) : null}
          <div className="invoice-row"><span>Loyalty Points Earned:</span><span>{invoice.loyaltyPointsEarned ?? 0}</span></div>
          <div className="invoice-row invoice-row--total">
            <span>Final Amount:</span>
            <span>{formatCurrency(invoice.finalAmount ?? invoice.totalAmount)}</span>
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

function PlaceholderCard({ feedback, navigate }) {
  return (
    <div className="placeholder-card card">
      <p className="placeholder-title">Invoice not found</p>
      <p className="placeholder-copy">{feedback || 'Open an invoice from Sales or Sales History to view its details.'}</p>
      <div className="dashboard-card-links" style={{ marginTop: '16px' }}>
        <button className="button button-primary" type="button" onClick={() => navigate('/staff/sales')}>
          Create Invoice
        </button>
      </div>
    </div>
  );
}

export default StaffInvoiceDetails;
