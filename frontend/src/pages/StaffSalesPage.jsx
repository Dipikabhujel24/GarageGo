import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSale, extractApiError, getSalesCatalog } from '../services/api';
import { garageStaffRoles } from '../config/roleBasedNav';
import { saveStoredInvoice } from '../utils/invoiceStorage';
import { getStoredAuthUser } from '../utils/authSession';
import {
  numberInputAutofillProps,
} from '../utils/formAutofill';
import './StaffSalesPage.css';

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function computeTotals(cartItems) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const loyaltyDiscountApplied = subtotal > 5000;
  const discountAmount = loyaltyDiscountApplied ? subtotal * 0.1 : 0;
  const finalAmount = subtotal - discountAmount;
  const loyaltyPointsEarned = Math.floor(finalAmount / 100);

  return {
    subtotal,
    discountAmount,
    finalAmount,
    loyaltyDiscountApplied,
    loyaltyPointsEarned,
  };
}

function SummaryRow({ label, value, highlight = false }) {
  return (
    <div className={`sales-summary__row${highlight ? ' sales-summary__row--highlight' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function StaffSalesPage() {
  const navigate = useNavigate();
  const userRole = getStoredAuthUser()?.role;
  const canAccessSales = userRole === 'Admin' || garageStaffRoles.includes(userRole);

  const [catalog, setCatalog] = useState({ parts: [], customers: [] });
  const [customerId, setCustomerId] = useState('');
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  useEffect(() => {
    if (!canAccessSales) {
      setIsLoadingCatalog(false);
      return undefined;
    }

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
          customers: response.data?.customers ?? [],
        });
      } catch (error) {
        if (mounted) {
          setFeedback({ type: 'error', message: `Unable to load catalog: ${extractApiError(error)}` });
        }
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
  }, [canAccessSales]);

  const matchedCustomer = useMemo(
    () => catalog.customers.find((customer) => String(customer.id) === String(customerId)),
    [catalog.customers, customerId]
  );

  const matchedPart = useMemo(
    () => catalog.parts.find((part) => String(part.id) === String(partId)),
    [catalog.parts, partId]
  );

  const totals = useMemo(() => computeTotals(cartItems), [cartItems]);

  const handlePartIdChange = (value) => {
    setPartId(value);
    const part = catalog.parts.find((entry) => String(entry.id) === String(value));
    if (part) {
      setPrice(Number(part.price || 0));
    }
  };

  const handleAddToCart = () => {
    const parsedPartId = Number(partId);
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    const chosenPart = catalog.parts.find((entry) => entry.id === parsedPartId);

    if (!chosenPart) {
      setFeedback({ type: 'error', message: 'Enter a valid Part ID from inventory.' });
      return;
    }

    if (!parsedQuantity || parsedQuantity <= 0) {
      setFeedback({ type: 'error', message: 'Quantity must be greater than zero.' });
      return;
    }

    if (parsedPrice < 0) {
      setFeedback({ type: 'error', message: 'Price cannot be negative.' });
      return;
    }

    const unitPrice = parsedPrice > 0 ? parsedPrice : Number(chosenPart.price || 0);
    const existingItem = cartItems.find((item) => item.partId === parsedPartId);
    const existingQuantity = existingItem ? existingItem.quantity : 0;

    if (chosenPart.quantity < existingQuantity + parsedQuantity) {
      setFeedback({
        type: 'error',
        message: `Not enough stock for Part ID ${chosenPart.id} (${chosenPart.partName}). Available: ${chosenPart.quantity}.`,
      });
      return;
    }

    setFeedback({ type: '', message: '' });
    setCartItems((previousItems) => {
      const existing = previousItems.find((item) => item.partId === parsedPartId);

      if (existing) {
        return previousItems.map((item) =>
          item.partId === parsedPartId
            ? { ...item, quantity: item.quantity + parsedQuantity, price: unitPrice }
            : item
        );
      }

      return [
        ...previousItems,
        {
          partId: chosenPart.id,
          name: chosenPart.partName,
          price: unitPrice,
          quantity: parsedQuantity,
        },
      ];
    });

    setPartId('');
    setQuantity(1);
    setPrice(0);
  };

  const removeFromCart = (targetPartId) => {
    setCartItems((previousItems) => previousItems.filter((item) => item.partId !== targetPartId));
  };

  const createInvoice = async () => {
    const parsedCustomerId = Number(customerId);

    setFeedback({ type: '', message: '' });

    if (!parsedCustomerId || parsedCustomerId <= 0) {
      setFeedback({ type: 'error', message: 'Enter a valid Customer ID.' });
      return;
    }

    if (!matchedCustomer) {
      setFeedback({ type: 'error', message: `Customer ID ${parsedCustomerId} was not found.` });
      return;
    }

    if (cartItems.length === 0) {
      setFeedback({ type: 'error', message: 'Cart is empty. Add parts before checkout.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createSale({
        customerId: parsedCustomerId,
        items: cartItems.map((item) => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      const invoice = saveStoredInvoice({
        ...response.data,
        customerEmail: matchedCustomer.email || '',
        customerName: matchedCustomer.name || '',
      });

      setCartItems([]);
      setPartId('');
      setQuantity(1);
      setPrice(0);
      setFeedback({ type: 'success', message: 'Invoice created successfully.' });
      navigate(`/staff/invoices/${invoice.saleId}`, { state: { invoice } });
    } catch (error) {
      setFeedback({ type: 'error', message: extractApiError(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="sales-page-shell">
      {feedback.message ? (
        <div className={`sales-banner sales-banner--${feedback.type || 'info'}`}>{feedback.message}</div>
      ) : null}

      <section className="sales-card sales-card--checkout">
        <div className="sales-card__intro sales-card__intro--single">
          <h2>Sales Checkout</h2>
          <p>Create sales invoices and process transactions quickly.</p>
        </div>

        <div className="sales-card__form sales-card__form--single">
          {!canAccessSales ? (
            <p className="sales-cart__empty">Sales access is restricted to staff accounts.</p>
          ) : (
            <>
              {isLoadingCatalog ? (
                <div className="sales-banner sales-banner--info">Loading customers and parts...</div>
              ) : null}

              <div className="sales-checkout-sections">
                <section className="sales-section">
                  <h3 className="sales-section__title">Section 1: Select Customer</h3>
                  <label className="field">
                    <span className="field__label">Customer ID</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter Customer ID"
                      value={customerId}
                      onChange={(event) => setCustomerId(event.target.value)}
                      disabled={isLoadingCatalog || isSubmitting}
                      {...numberInputAutofillProps}
                    />
                  </label>
                  {customerId ? (
                    <p className="sales-field-hint">
                      {matchedCustomer
                        ? `Customer #${matchedCustomer.id} — ${matchedCustomer.name}${matchedCustomer.email ? ` (${matchedCustomer.email})` : ''}`
                        : `No customer found for ID ${customerId}.`}
                    </p>
                  ) : null}
                </section>

                <section className="sales-section">
                  <h3 className="sales-section__title">Section 2: Add Parts</h3>
                  <div className="sales-page__row sales-page__row--add">
                    <label className="field">
                      <span className="field__label">Part ID</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter Part ID"
                        value={partId}
                        onChange={(event) => handlePartIdChange(event.target.value)}
                        disabled={isLoadingCatalog || isSubmitting}
                        {...numberInputAutofillProps}
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Quantity</span>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        disabled={isLoadingCatalog || isSubmitting}
                        {...numberInputAutofillProps}
                      />
                    </label>

                    <label className="field">
                      <span className="field__label">Price</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        disabled={isLoadingCatalog || isSubmitting}
                        {...numberInputAutofillProps}
                      />
                    </label>

                    <div className="sales-page__actions sales-page__actions--inline">
                      <button
                        className="btn btn--secondary"
                        type="button"
                        onClick={handleAddToCart}
                        disabled={isLoadingCatalog || isSubmitting}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                  {partId ? (
                    <p className="sales-field-hint">
                      {matchedPart
                        ? `Part #${matchedPart.id} — ${matchedPart.partName} • Stock ${matchedPart.quantity}`
                        : `No part found for ID ${partId}.`}
                    </p>
                  ) : null}
                </section>

                <section className="sales-section">
                  <h3 className="sales-section__title">Section 3: Shopping Cart</h3>

                  {cartItems.length === 0 ? (
                    <p className="sales-cart__empty">Cart is empty</p>
                  ) : (
                    <ul className="sales-cart__list">
                      {cartItems.map((item) => (
                        <li className="sales-cart__item" key={item.partId}>
                          <span className="sales-cart__item-name">
                            Part ID {item.partId} — {item.name}
                          </span>
                          <span>{item.quantity} x {formatCurrency(item.price)}</span>
                          <span>{formatCurrency(item.quantity * item.price)}</span>
                          <button
                            type="button"
                            className="sales-cart__remove"
                            onClick={() => removeFromCart(item.partId)}
                            aria-label={`Remove part ${item.partId}`}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="sales-summary">
                    <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} highlight />
                    {totals.loyaltyDiscountApplied ? (
                      <SummaryRow label="Loyalty Discount (10%)" value={`-${formatCurrency(totals.discountAmount)}`} />
                    ) : null}
                    <SummaryRow label="Loyalty Points Earned" value={String(totals.loyaltyPointsEarned)} />
                    <SummaryRow label="Final Amount" value={formatCurrency(totals.finalAmount)} highlight />
                  </div>

                  <div className="sales-page__actions sales-page__actions--checkout">
                    <button
                      className="btn btn--primary"
                      type="button"
                      onClick={createInvoice}
                      disabled={isSubmitting || isLoadingCatalog || cartItems.length === 0}
                    >
                      {isSubmitting ? 'Processing...' : 'Complete Sale'}
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </section>
    </section>
  );
}

export default StaffSalesPage;
