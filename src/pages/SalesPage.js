import React, { useEffect, useMemo, useState } from "react";
import { createSale, extractApiError, getSalesCatalog, sendEmail } from "../services/api";
import "./SalesPage.css";

function SalesPage() {
  const [catalog, setCatalog] = useState({ parts: [], customers: [] });
  const [customerId, setCustomerId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCatalog = async () => {
      setIsLoadingCatalog(true);

      try {
        const response = await getSalesCatalog();

        if (!mounted) {
          return;
        }

        setCatalog({
          parts: response.data?.parts ?? [],
          customers: response.data?.customers ?? []
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setFeedback({
          type: "error",
          message: `Unable to load sales catalog: ${extractApiError(error)}`
        });
      } finally {
        if (mounted) {
          setIsLoadingCatalog(false);
        }
      }
    };

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedCustomer = useMemo(
    () => catalog.customers.find((customer) => String(customer.id) === String(customerId)),
    [catalog.customers, customerId]
  );

  const selectedPart = useMemo(
    () => catalog.parts.find((part) => String(part.id) === String(selectedPartId)),
    [catalog.parts, selectedPartId]
  );

  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const resetLineItemForm = () => {
    setSelectedPartId("");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    const parsedPartId = Number(selectedPartId);
    const parsedQuantity = Number(quantity);
    const chosenPart = catalog.parts.find((part) => part.id === parsedPartId);

    if (!chosenPart) {
      alert("Please select a valid part.");
      return;
    }

    if (!parsedQuantity || parsedQuantity <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    const existingItem = cartItems.find((item) => item.partId === parsedPartId);
    const existingQuantity = existingItem ? existingItem.quantity : 0;

    if (chosenPart.quantity < existingQuantity + parsedQuantity) {
      alert(`Only ${chosenPart.quantity} units of ${chosenPart.partName} are available.`);
      return;
    }

    setCartItems((previousItems) => {
      const existing = previousItems.find((item) => item.partId === parsedPartId);

      if (existing) {
        return previousItems.map((item) =>
          item.partId === parsedPartId
            ? { ...item, quantity: item.quantity + parsedQuantity }
            : item
        );
      }

      return [
        ...previousItems,
        {
          partId: chosenPart.id,
          name: chosenPart.partName,
          price: chosenPart.price,
          quantity: parsedQuantity
        }
      ];
    });

    resetLineItemForm();
  };

  const submitSale = async (showInvoice) => {
    const parsedCustomerId = Number(customerId);

    setFeedback({ type: "", message: "" });

    if (!parsedCustomerId || parsedCustomerId <= 0) {
      alert("Please select a valid customer.");
      return null;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty. Add parts first.");
      return null;
    }

    setIsSubmitting(true);

    try {
      setFeedback({ type: "info", message: showInvoice ? "Generating invoice..." : "Saving sale..." });

      const response = await createSale({
        customerId: parsedCustomerId,
        items: cartItems.map((item) => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.price
        }))
      });

      const generatedInvoice = response.data;

      if (showInvoice) {
        setInvoice(generatedInvoice);
      } else {
        setInvoice(null);
      }

      setCartItems([]);
      resetLineItemForm();
      setFeedback({
        type: "success",
        message: showInvoice ? "Invoice generated successfully." : "Sale saved successfully."
      });

      return generatedInvoice;
    } catch (error) {
      const errorMessage = extractApiError(error);
      setFeedback({
        type: "error",
        message: showInvoice ? `Generate invoice failed: ${errorMessage}` : `Save failed: ${errorMessage}`
      });
      alert(showInvoice ? `Generate Invoice failed: ${errorMessage}` : `Save failed: ${errorMessage}`);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSale = async () => {
    await submitSale(false);
  };

  const handleGenerateInvoice = async () => {
    await submitSale(true);
  };

  const handleClearSale = () => {
    setCartItems([]);
    resetLineItemForm();
  };

  const handleNewSale = () => {
    setInvoice(null);
    setCustomerId("");
    setCustomerEmail("");
    handleClearSale();
  };

  const handleSendEmail = async () => {
    setFeedback({ type: "", message: "" });

    if (!customerEmail) {
      alert("Please enter an email address.");
      return;
    }

    if (!invoice) {
      alert("Generate the invoice before sending it by email.");
      return;
    }

    setIsSubmitting(true);

    try {
      setFeedback({ type: "info", message: "Sending invoice email..." });
      await sendEmail(customerEmail, invoice);
      setFeedback({ type: "success", message: "Email sent successfully." });
      alert("Email sent successfully!");
    } catch (error) {
      const errorMessage = extractApiError(error);
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
              <span>Invoice #:</span>
              <span>{invoice.saleId}</span>
            </div>
            <div className="invoice-row">
              <span>Customer ID:</span>
              <span>{invoice.customerId}</span>
            </div>
            <div className="invoice-row">
              <span>Email:</span>
              <span>{customerEmail || selectedCustomer?.email || "Not set"}</span>
            </div>
            <div className="invoice-row">
              <span>Date:</span>
              <span>{new Date(invoice.date).toLocaleString()}</span>
            </div>
          </div>
          <div className="invoice-items">
            <h3>Items Purchased</h3>
            <ul className="invoice-list">
              {invoice.items.map((item) => (
                <li key={item.partId} className="invoice-item">
                  <span>{item.partName || `Part ${item.partId}`}</span>
                  <span>{item.quantity} x Rs{item.price.toFixed(2)}</span>
                  <span>Rs{item.lineTotal.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="invoice-total">
            <div className="invoice-row invoice-row--total">
              <span>Total:</span>
              <span>Rs{(invoice.totalAmount ?? subtotal).toFixed(2)}</span>
            </div>
          </div>
          <div className="invoice-email">
            <label className="field">
              <span className="field__label">Email Invoice</span>
              <input
                type="email"
                placeholder="Enter email to send invoice"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </label>
            <button className="btn btn--secondary" onClick={handleSendEmail} disabled={isSubmitting}>
              Send Email
            </button>
          </div>
          <div className="invoice-actions">
            <button className="btn btn--primary" onClick={handleNewSale} disabled={isSubmitting}>
              New Sale
            </button>
          </div>
        </section>
      ) : (
        <section className="sales-card">
          <div className="sales-card__intro sales-card__intro--single">
            <span className="sales-card__badge">Sales & Invoicing</span>
            <h2>Sales Checkout</h2>
            <p>Create sales invoices, manage stock deductions, and email receipts to customers.</p>
          </div>

          <div className="sales-card__form sales-card__form--single">
            <div className="sales-page__grid">
              {isLoadingCatalog ? (
                <div className="sales-banner sales-banner--info">Loading customers and parts...</div>
              ) : null}

              <div className="sales-section">
                <h3 className="sales-section__title">Section 1: Select Customer</h3>
                <div className="sales-page__row sales-page__row--customer">
                  <label className="field sales-field--wide">
                    <span className="field__label">Customer</span>
                    <select
                      value={customerId}
                      onChange={(event) => {
                        const nextCustomerId = event.target.value;
                        setCustomerId(nextCustomerId);

                        const nextCustomer = catalog.customers.find((customer) => String(customer.id) === nextCustomerId);
                        setCustomerEmail(nextCustomer?.email ?? "");
                      }}
                      disabled={isLoadingCatalog}
                    >
                      <option value="">Select a customer</option>
                      {catalog.customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} - {customer.email}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field sales-field--wide">
                    <span className="field__label">Customer Email</span>
                    <input
                      type="email"
                      placeholder="Customer email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="sales-section">
                <h3 className="sales-section__title">Section 2: Add Parts</h3>

                <div className="sales-page__row sales-page__row--add">
                  <label className="field">
                    <span className="field__label">Part</span>
                    <select
                      value={selectedPartId}
                      onChange={(event) => setSelectedPartId(event.target.value)}
                      disabled={isLoadingCatalog}
                    >
                      <option value="">Select a part</option>
                      {catalog.parts.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.partName} - Rs{part.price.toFixed(2)} - Stock {part.quantity}
                        </option>
                      ))}
                    </select>
                    <span className="sales-field-hint">
                      {selectedPart
                        ? `${selectedPart.category} • ${selectedPart.vendorName || "No vendor"}`
                        : "Choose a part from inventory"}
                    </span>
                  </label>

                  <label className="field">
                    <span className="field__label">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Price</span>
                    <input
                      type="number"
                      value={selectedPart ? selectedPart.price.toFixed(2) : ""}
                      readOnly
                    />
                  </label>

                  <div className="sales-page__actions sales-page__actions--inline">
                    <button className="btn btn--secondary" onClick={handleAddToCart} disabled={isLoadingCatalog || isSubmitting}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>

              <div className="sales-section">
                <h3 className="sales-section__title">Section 3: Shopping Cart</h3>

                {cartItems.length === 0 ? (
                  <p className="sales-cart__empty">Cart is empty. Add parts to get started.</p>
                ) : (
                  <ul className="sales-cart__list">
                    {cartItems.map((item) => (
                      <li className="sales-cart__item" key={item.partId}>
                        <span>{item.name}</span>
                        <span>{item.quantity} x Rs{item.price.toFixed(2)}</span>
                        <span>Rs{(item.quantity * item.price).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <h3 className="sales-page__total">
                  Total Amount: <span className="sales-page__total-value">Rs{subtotal.toFixed(2)}</span>
                </h3>
              </div>

              <div className="sales-section">
                <h3 className="sales-section__title">Section 4: Submit Sale</h3>
                <div className="sales-card__footer sales-card__footer--centered">
                  <span className="sales-page__checkout-note">Ready to complete this sale?</span>
                  <div className="sales-page__actions">
                    <button className="btn btn--secondary" onClick={handleSaveSale} disabled={isSubmitting || isLoadingCatalog}>
                      Save Sale
                    </button>
                    <button className="btn btn--primary" onClick={handleGenerateInvoice} disabled={isSubmitting || isLoadingCatalog}>
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