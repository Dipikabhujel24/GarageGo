import React, { useState } from "react";
import { createSale, extractApiError, sendEmail } from "../services/api";
import "./SalesPage.css";

function SalesPage() {
  
  // eslint-disable-next-line no-unused-vars
  const parts = [];

  const [customerId, setCustomerId] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [price, setPrice] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = subtotal;

  const handleAddToCart = () => {
    const parsedPartId = Number(selectedPartId);
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);

    if (!parsedPartId || parsedPartId <= 0) {
      alert("Please enter a valid Part ID.");
      return;
    }

    if (!parsedQuantity || parsedQuantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    if (!parsedPrice || parsedPrice <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.partId === parsedPartId);

      if (existing) {
        return prev.map((item) =>
          item.partId === parsedPartId
            ? { ...item, quantity: item.quantity + parsedQuantity }
            : item
        );
      }

      return [
        ...prev,
        {
          partId: parsedPartId,
          name: `Part ${parsedPartId}`,
          price: parsedPrice,
          quantity: parsedQuantity
        }
      ];
    });

    setSelectedPartId("");
    setQuantity(1);
    setPrice("");
  };

  const handleSaveSale = async () => {
    const parsedCustomerId = Number(customerId);

    setFeedback({ type: "", message: "" });

    if (!parsedCustomerId || parsedCustomerId <= 0) {
      alert("Please enter a valid Customer ID.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty. Add parts first.");
      return;
    }

    setIsSubmitting(true);

    try {
      setFeedback({ type: "info", message: "Saving sale..." });
      await createSale({
        customerId: parsedCustomerId,
        items: cartItems.map((item) => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.price
        }))
      });

      alert("Sale Saved!");
      setCartItems([]);
      setSelectedPartId("");
      setQuantity(1);
      setPrice("");
      setFeedback({ type: "success", message: "Sale saved successfully." });

    } catch (err) {
      const errorMessage = extractApiError(err);
      setFeedback({ type: "error", message: `Save failed: ${errorMessage}` });
      alert(`Save failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    const parsedCustomerId = Number(customerId);

    setFeedback({ type: "", message: "" });

    if (!parsedCustomerId || parsedCustomerId <= 0) {
      alert("Please enter a valid Customer ID.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty. Add parts first.");
      return;
    }

    setIsSubmitting(true);

    try {
      setFeedback({ type: "info", message: "Generating invoice..." });
      const response = await createSale({
        customerId: parsedCustomerId,
        items: cartItems.map((item) => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.price
        }))
      });

      setInvoice(response.data);
      setCartItems([]);
      setSelectedPartId("");
      setQuantity(1);
      setPrice("");
      setFeedback({ type: "success", message: "Invoice generated successfully." });

    } catch (err) {
      const errorMessage = extractApiError(err);
      setFeedback({ type: "error", message: `Generate invoice failed: ${errorMessage}` });
      alert(`Generate Invoice failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearSale = () => {
    setCartItems([]);
    setSelectedPartId("");
    setQuantity(1);
    setPrice("");
  };

  const handleNewSale = () => {
    setInvoice(null);
    setCustomerId("");
    setEmail("");
    handleClearSale();
  };

  const handleSendEmail = async () => {
    setFeedback({ type: "", message: "" });

    if (!email) {
      alert("Please enter an email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      setFeedback({ type: "info", message: "Sending invoice email..." });
      await sendEmail(email);
      setFeedback({ type: "success", message: "Email sent successfully." });
      alert("Email sent successfully!");
    } catch (err) {
      const errorMessage = extractApiError(err);
      setFeedback({ type: "error", message: `Email send failed: ${errorMessage}` });
      alert(`Email send failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sales-page-shell">
      {feedback.message ? (
        <div className={`sales-banner sales-banner--${feedback.type || "info"}`}>
          {feedback.message}
        </div>
      ) : null}

      {invoice ? (
        <section className="sales-card invoice-card">
          <div className="invoice-header">
            <h2>Invoice</h2>
            <p>GarageGo Sales Receipt</p>
          </div>
          <div className="invoice-details">
            <div className="invoice-row">
              <span>Customer ID:</span>
              <span>{invoice.customerId}</span>
            </div>
            <div className="invoice-row">
              <span>Date:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div className="invoice-items">
            <h3>Items Purchased</h3>
            <ul className="invoice-list">
              {invoice.items.map((item, index) => (
                <li key={index} className="invoice-item">
                  <span>{item.name || `Part ${item.partId}`}</span>
                  <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                  <span>${(item.quantity * item.price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="invoice-total">
            <div className="invoice-row invoice-row--total">
              <span>Total:</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
          </div>
          <div className="invoice-email">
            <label className="field">
              <span className="field__label">Email Invoice</span>
              <input
                type="email"
                placeholder="Enter email to send invoice"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <button className="btn btn--secondary" onClick={handleSendEmail}>
              Send Email
            </button>
          </div>
          <div className="invoice-actions">
            <button className="btn btn--primary" onClick={handleNewSale}>
              New Sale
            </button>
          </div>
        </section>
      ) : (
        <section className="sales-card">
          <div className="sales-card__intro sales-card__intro--single">
            <span className="sales-card__badge">Sales & Invoicing</span>
            <h2>Sales Checkout</h2>
            <p>Create sales invoices and process transactions quickly.</p>
          </div>

          <div className="sales-card__form sales-card__form--single">
            <div className="sales-page__grid">

              {/* Customer */}
              <div className="sales-section">
                <h3 className="sales-section__title">Section 1: Select Customer</h3>
                <label className="field">
                  <span className="field__label">Customer ID</span>
                  <input
                    type="number"
                    placeholder="Enter Customer ID"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                  />
                </label>
              </div>

              {/* Parts */}
              <div className="sales-section">
                <h3 className="sales-section__title">Section 2: Add Parts</h3>

                <div className="sales-page__row sales-page__row--add">

                  <label className="field">
                    <span className="field__label">Part ID</span>
                    <input
                      type="number"
                      placeholder="Enter Part ID"
                      value={selectedPartId}
                      onChange={e => setSelectedPartId(e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={e => setQuantity(e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Price</span>
                    <input
                      type="number"
                      placeholder="Enter Price"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                    />
                  </label>

                  <div className="sales-page__actions sales-page__actions--inline">
                    <button className="btn btn--secondary" onClick={handleAddToCart}>
                      Add to Cart
                    </button>
                  </div>

                </div>
              </div>

              {/* Cart */}
              <div className="sales-section">
                <h3 className="sales-section__title">Section 3: Shopping Cart</h3>

                {cartItems.length === 0 ? (
                  <p className="sales-cart__empty">Cart is empty. Add parts to get started.</p>
                ) : (
                  <ul className="sales-cart__list">
                    {cartItems.map((item) => (
                      <li className="sales-cart__item" key={item.partId}>
                        <span>{item.name}</span>
                        <span>{item.quantity} x ${item.price.toFixed(2)}</span>
                        <span>${(item.quantity * item.price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="sales-page__total">
                  Total Amount: <span className="sales-page__total-value">${total.toFixed(2)}</span>
                </h3>
              </div>

              {/* Submit */}
              <div className="sales-section">
                <h3 className="sales-section__title">Section 4: Submit Sale</h3>
                <div className="sales-card__footer sales-card__footer--centered">
                  <span className="sales-page__checkout-note">Ready to complete this sale?</span>
                  <div className="sales-page__actions">
                    <button className="btn btn--secondary" onClick={handleSaveSale} disabled={isSubmitting}>
                      Save Sale
                    </button>
                    <button className="btn btn--primary" onClick={handleGenerateInvoice} disabled={isSubmitting}>
                      Generate Invoice
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default SalesPage;