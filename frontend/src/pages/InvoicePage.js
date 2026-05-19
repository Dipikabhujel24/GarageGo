import React, { useState } from "react";
import { sendEmail, extractApiError } from "../services/api";
import "./InvoicePage.css";

function InvoicePage({ sale, onNewSale }) {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const invoiceItems = sale?.items ?? [];
  const customerId = sale?.customerId ?? "";
  const date = sale?.date ?? new Date().toLocaleDateString();
  const total = sale?.total ?? 0;
  const loyaltyPoints = sale?.loyaltyPoints ?? Math.floor(Number(total) / 100);

  const formatCurrency = (value) => `Rs. ${Number(value).toFixed(2)}`;

  const handleSendEmail = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      alert("Enter an email address");
      return;
    }

    try {
      setIsSending(true);
      await sendEmail(trimmedEmail, sale);
      alert("Invoice email sent successfully!");
    } catch (err) {
      alert(`Failed to send invoice email: ${extractApiError(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="invoice-page-shell">
      <div className="invoice-card">
        <header className="invoice-header">
          <h1>Invoice</h1>
          <p>GarageGo Sales Receipt</p>
        </header>

        <section className="invoice-meta">
          <div className="invoice-meta-row">
            <span>Customer ID:</span>
            <strong>{customerId}</strong>
          </div>
          <div className="invoice-meta-row">
            <span>Date:</span>
            <strong>{date}</strong>
          </div>
        </section>

        <section className="invoice-items-section">
          <h2>Items Purchased</h2>
          <div className="invoice-items-list">
            {invoiceItems.length === 0 ? (
              <div className="invoice-empty">No items available.</div>
            ) : (
              invoiceItems.map((item) => (
                <div key={item.partId} className="invoice-item-row">
                  <div className="invoice-item-name">{item.name}</div>
                  <div className="invoice-item-qty">
                    {item.quantity} x {formatCurrency(item.price)}
                  </div>
                  <div className="invoice-item-total">
                    {formatCurrency(item.lineTotal ?? item.quantity * item.price)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="invoice-total-row">
          <span>Loyalty Points Earned:</span>
          <strong>{loyaltyPoints}</strong>
        </section>

        <section className="invoice-total-row">
          <span>Total:</span>
          <strong>{formatCurrency(total)}</strong>
        </section>

        <section className="invoice-email-section">
          <h2>Email Invoice</h2>
          <input
            type="email"
            className="invoice-email-input"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSendEmail}
            className="invoice-email-btn"
            disabled={isSending}
          >
            {isSending ? "Sending..." : "Send Email"}
          </button>
        </section>

        <div className="invoice-actions">
          <button type="button" onClick={onNewSale} className="invoice-new-sale-btn">
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

export default InvoicePage;
