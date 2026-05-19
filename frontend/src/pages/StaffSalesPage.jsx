import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSale, extractApiError, getSalesCatalog } from '../services/api';
import { saveStoredInvoice } from '../utils/invoiceStorage';
import { getStoredAuthUser } from '../utils/authSession';
import './StaffSalesPage.css';

function StaffSalesPage() {
  const navigate = useNavigate();
  const userRole = getStoredAuthUser()?.role;
  const canAccessSales = userRole === 'Staff' || userRole === 'Admin';
  const [catalog, setCatalog] = useState({ parts: [], customers: [] });
  const [customerId, setCustomerId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState([]);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  useEffect(() => {
    if (!canAccessSales) {
      setIsLoadingCatalog(false);
      setFeedback({
        type: 'error',
        message: 'Access denied. Sales invoices are available only to staff and admins.',
      });
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
          setFeedback({ type: 'error', message: `Unable to load sales catalog: ${extractApiError(error)}` });
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
    setSelectedPartId('');
    setQuantity(1);
  };

  const handleAddToCart = () => {
    const parsedPartId = Number(selectedPartId);
    const parsedQuantity = Number(quantity);
    const chosenPart = catalog.parts.find((part) => part.id === parsedPartId);

    if (!chosenPart) {
      alert('Please select a valid part.');
      return;
    }

    if (!parsedQuantity || parsedQuantity <= 0) {
      alert('Please enter a valid quantity.');
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
          item.partId === parsedPartId ? { ...item, quantity: item.quantity + parsedQuantity } : item
        );
      }

      return [
        ...previousItems,
        {
          partId: chosenPart.id,
          name: chosenPart.partName,
          price: chosenPart.price,
          quantity: parsedQuantity,
        },
      ];
    });

    resetLineItemForm();
  };

  const createInvoice = async () => {
    const parsedCustomerId = Number(customerId);

    setFeedback({ type: '', message: '' });

    if (!parsedCustomerId || parsedCustomerId <= 0) {
      alert('Please select a valid customer.');
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty. Add parts first.');
      return;
    }

    setIsSubmitting(true);

    try {
      setFeedback({ type: 'info', message: 'Generating invoice...' });

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
        customerEmail: customerEmail || selectedCustomer?.email || '',
        customerName: selectedCustomer?.name || '',
      });

      setCartItems([]);
      resetLineItemForm();
      setFeedback({ type: 'success', message: 'Invoice generated successfully.' });
      navigate(`/staff/invoices/${invoice.saleId}`, { state: { invoice } });
    } catch (error) {
      const errorMessage = extractApiError(error);
      setFeedback({ type: 'error', message: `Generate invoice failed: ${errorMessage}` });
      alert(`Generate Invoice failed: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="sales-page-shell">
      {feedback.message ? <div className={`sales-banner sales-banner--${feedback.type || 'info'}`}>{feedback.message}</div> : null}

      {!canAccessSales ? (
        <section className="sales-card">
          <div className="sales-card__intro sales-card__intro--single">
            <span className="sales-card__badge">Access Denied</span>
            <h2>Sales access is restricted</h2>
            <p>Sign in with a staff or admin account to create sales invoices.</p>
          </div>
        </section>
      ) : (
      <section className="sales-card">
        <div className="sales-card__intro sales-card__intro--single">
          <span className="sales-card__badge">Staff Sales</span>
          <h2>Create Sales Invoice</h2>
          <p>Sell vehicle parts, update stock, and generate invoice records for customers.</p>
        </div>

        <div className="sales-card__form sales-card__form--single">
          <div className="sales-page__grid">
            {isLoadingCatalog ? <div className="sales-banner sales-banner--info">Loading customers and parts...</div> : null}

            <div className="sales-section">
              <h3 className="sales-section__title">Customer</h3>
              <div className="sales-page__row sales-page__row--customer">
                <label className="field sales-field--wide">
                  <span className="field__label">Customer</span>
                  <select
                    value={customerId}
                    onChange={(event) => {
                      const nextCustomerId = event.target.value;
                      setCustomerId(nextCustomerId);
                      const nextCustomer = catalog.customers.find((customer) => String(customer.id) === nextCustomerId);
                      setCustomerEmail(nextCustomer?.email ?? '');
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
              <h3 className="sales-section__title">Add Parts</h3>

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
                        {part.partName} - Rs{Number(part.price || 0).toFixed(2)} - Stock {part.quantity}
                      </option>
                    ))}
                  </select>
                  <span className="sales-field-hint">
                    {selectedPart
                      ? `${selectedPart.category} • ${selectedPart.vendorName || 'No vendor'}`
                      : 'Choose a part from inventory'}
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
                  <input type="number" value={selectedPart ? Number(selectedPart.price || 0).toFixed(2) : ''} readOnly />
                </label>

                <div className="sales-page__actions sales-page__actions--inline">
                  <button className="btn btn--secondary" type="button" onClick={handleAddToCart} disabled={isLoadingCatalog || isSubmitting}>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>

            <div className="sales-section">
              <h3 className="sales-section__title">Shopping Cart</h3>

              {cartItems.length === 0 ? (
                <p className="sales-cart__empty">No items added yet.</p>
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
              <h3 className="sales-section__title">Submit</h3>
              <div className="sales-card__footer sales-card__footer--centered">
                <span className="sales-page__checkout-note">Generate an invoice to open the invoice details page.</span>
                <div className="sales-page__actions">
                  <button className="btn btn--primary" type="button" onClick={createInvoice} disabled={isSubmitting || isLoadingCatalog}>
                    Create Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}
    </section>
  );
}

export default StaffSalesPage;
