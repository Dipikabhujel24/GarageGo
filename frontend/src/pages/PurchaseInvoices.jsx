import React, { useEffect, useMemo, useState } from 'react';
import SecureForm from '../components/SecureForm';
import { getParts, getVendors } from '../services/api';
import {
  createPurchaseInvoice,
  deletePurchaseInvoice,
  getPurchaseInvoice,
  getPurchaseInvoices,
} from '../services/purchaseInvoiceService';

const emptyItem = { partId: '', quantity: 1, unitPrice: '' };

function formatCurrency(value) {
  return `Rs${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString();
}

function PurchaseInvoices() {
  const [vendors, setVendors] = useState([]);
  const [parts, setParts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form, setForm] = useState({
    vendorId: '',
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    items: [{ ...emptyItem }],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const loadData = async ({ clearMessage = true } = {}) => {
    setIsLoading(true);
    if (clearMessage) {
      setMessage('');
    }

    try {
      const [vendorsResponse, partsResponse, invoicesResponse] = await Promise.all([
        getVendors(),
        getParts(),
        getPurchaseInvoices(),
      ]);

      setVendors(vendorsResponse.data || []);
      setParts(partsResponse.data || []);
      setInvoices(invoicesResponse.data || []);
    } catch (error) {
      setMessage(error.message || 'Unable to load purchase invoices right now.');
      setMessageType('error');
      setVendors([]);
      setParts([]);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const partsForVendor = useMemo(() => {
    if (!form.vendorId) {
      return parts;
    }

    return parts.filter((part) => Number(part.vendorId) === Number(form.vendorId));
  }, [form.vendorId, parts]);

  const formTotal = useMemo(
    () =>
      form.items.reduce(
        (total, item) =>
          total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0
      ),
    [form.items]
  );

  const summary = useMemo(() => {
    const totalStockPurchased = invoices.reduce(
      (total, invoice) =>
        total +
        (invoice.items || []).reduce(
          (itemTotal, item) => itemTotal + Number(item.quantity || 0),
          0
        ),
      0
    );

    const totalPurchaseAmount = invoices.reduce(
      (total, invoice) => total + Number(invoice.totalAmount || 0),
      0
    );

    return {
      totalInvoices: invoices.length,
      totalStockPurchased,
      totalPurchaseAmount,
    };
  }, [invoices]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? [{ ...emptyItem }]
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetForm = () => {
    setForm({
      vendorId: '',
      invoiceNumber: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      items: [{ ...emptyItem }],
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!form.vendorId) {
      setMessage('Select a vendor before creating a purchase invoice.');
      setMessageType('error');
      return;
    }

    const payloadItems = form.items
      .filter((item) => item.partId)
      .map((item) => ({
        partId: Number(item.partId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }));

    if (payloadItems.length === 0) {
      setMessage('Add at least one part before creating a purchase invoice.');
      setMessageType('error');
      return;
    }

    if (payloadItems.some((item) => item.quantity <= 0 || item.unitPrice <= 0)) {
      setMessage('Every selected part needs a quantity and unit price greater than zero.');
      setMessageType('error');
      return;
    }

    setIsSaving(true);

    try {
      const response = await createPurchaseInvoice({
        vendorId: Number(form.vendorId),
        invoiceNumber: form.invoiceNumber.trim() || null,
        purchaseDate: form.purchaseDate
          ? new Date(`${form.purchaseDate}T00:00:00`).toISOString()
          : null,
        items: payloadItems,
      });

      setMessage('Purchase invoice created and stock updated successfully.');
      setMessageType('success');
      setSelectedInvoice(response.data);
      resetForm();
      await loadData({ clearMessage: false });
    } catch (error) {
      setMessage(error.message || 'Unable to create purchase invoice.');
      setMessageType('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleView = async (invoice) => {
    try {
      const response = await getPurchaseInvoice(invoice.id);
      setSelectedInvoice(response.data);
    } catch (error) {
      setMessage(error.message || 'Unable to open purchase invoice.');
      setMessageType('error');
    }
  };

  const handleDelete = async (invoice) => {
    const confirmed = window.confirm(
      `Delete purchase invoice "${invoice.invoiceNumber}"? Stock added by this invoice will be reversed.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deletePurchaseInvoice(invoice.id);
      setMessage('Purchase invoice deleted and stock adjusted.');
      setMessageType('success');
      if (selectedInvoice?.id === invoice.id) {
        setSelectedInvoice(null);
      }
      await loadData({ clearMessage: false });
    } catch (error) {
      setMessage(error.message || 'Unable to delete purchase invoice.');
      setMessageType('error');
    }
  };

  return (
    <section className="container purchase-page">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Purchase Invoices</h2>
        <p className="section-copy">
          Create supplier purchase invoices and update inventory stock from the admin workspace.
        </p>
      </div>

      {message && (
        <div className={messageType === 'error' ? 'message-banner error' : 'message-banner'}>
          {message}
        </div>
      )}

      {isLoading ? (
        <p className="status-text">Loading purchase invoice data...</p>
      ) : (
        <>
          <div className="stats-grid purchase-summary-grid">
            <article className="stat-card card">
              <p className="stat-label">Total Purchase Invoices</p>
              <p className="stat-value">{summary.totalInvoices.toLocaleString()}</p>
            </article>
            <article className="stat-card card">
              <p className="stat-label">Total Stock Purchased</p>
              <p className="stat-value">{summary.totalStockPurchased.toLocaleString()}</p>
            </article>
            <article className="stat-card card">
              <p className="stat-label">Total Purchase Amount</p>
              <p className="stat-value">{formatCurrency(summary.totalPurchaseAmount)}</p>
            </article>
          </div>

          <div className="purchase-layout">
            <article className="table-card card purchase-form-card">
              <div className="table-card-header">
                <div>
                  <h3 className="staff-card-title card-title">Create Invoice</h3>
                  <p className="section-copy">
                    Choose a vendor, add purchased parts, and confirm the stock update.
                  </p>
                </div>
              </div>

              {(vendors.length === 0 || parts.length === 0) && (
                <div className="message-banner error">
                  Add vendors and parts before creating purchase invoices.
                </div>
              )}

              <SecureForm className="purchase-form" onSubmit={handleSubmit} includePassword={false}>
                <div className="purchase-form-grid">
                  <label className="inventory-field">
                    <span>Vendor</span>
                    <select
                      className="input-field"
                      value={form.vendorId}
                      onChange={(event) => updateForm('vendorId', event.target.value)}
                      disabled={isSaving}
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.vendorName} - {vendor.companyName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="inventory-field">
                    <span>Invoice Number</span>
                    <input
                      className="input-field"
                      value={form.invoiceNumber}
                      onChange={(event) => updateForm('invoiceNumber', event.target.value)}
                      placeholder="Auto-generated if empty"
                      disabled={isSaving}
                    />
                  </label>

                  <label className="inventory-field">
                    <span>Purchase Date</span>
                    <input
                      className="input-field"
                      type="date"
                      value={form.purchaseDate}
                      onChange={(event) => updateForm('purchaseDate', event.target.value)}
                      disabled={isSaving}
                    />
                  </label>
                </div>

                <div className="purchase-items">
                  <div className="purchase-items-header">
                    <h4>Parts</h4>
                    <button className="button button-secondary" type="button" onClick={addItem} disabled={isSaving}>
                      Add Part
                    </button>
                  </div>

                  {form.items.map((item, index) => {
                    const lineTotal = Number(item.quantity || 0) * Number(item.unitPrice || 0);

                    return (
                      <div className="purchase-item-row" key={`${index}-${item.partId || 'new'}`}>
                        <label className="inventory-field purchase-part-field">
                          <span>Part</span>
                          <select
                            className="input-field"
                            value={item.partId}
                            onChange={(event) => updateItem(index, 'partId', event.target.value)}
                            disabled={isSaving}
                          >
                            <option value="">Select part</option>
                            {partsForVendor.map((part) => (
                              <option key={part.id} value={part.id}>
                                {part.partName} ({part.quantity} in stock)
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="inventory-field">
                          <span>Quantity</span>
                          <input
                            className="input-field"
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                            disabled={isSaving}
                          />
                        </label>

                        <label className="inventory-field">
                          <span>Unit Price</span>
                          <input
                            className="input-field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) => updateItem(index, 'unitPrice', event.target.value)}
                            disabled={isSaving}
                          />
                        </label>

                        <div className="purchase-line-total">
                          <span>Subtotal</span>
                          <strong>{formatCurrency(lineTotal)}</strong>
                        </div>

                        <button
                          className="button button-danger purchase-remove-button"
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={isSaving}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="purchase-total-row">
                  <span>Total</span>
                  <strong>{formatCurrency(formTotal)}</strong>
                </div>

                <div className="form-actions">
                  <button className="button button-primary" type="submit" disabled={isSaving}>
                    {isSaving ? 'Creating...' : 'Create Invoice'}
                  </button>
                  <button className="button button-secondary" type="button" onClick={resetForm} disabled={isSaving}>
                    Reset
                  </button>
                </div>
              </SecureForm>
            </article>

            <article className="table-card card purchase-detail-card">
              <div className="table-card-header">
                <div>
                  <h3 className="staff-card-title card-title">Invoice Details</h3>
                  <p className="section-copy">Open any purchase invoice to review its stock lines.</p>
                </div>
              </div>

              {!selectedInvoice ? (
                <p className="inventory-empty-state">Select an invoice to view details.</p>
              ) : (
                <div className="purchase-detail">
                  <div className="purchase-detail-header">
                    <div>
                      <p className="stat-label">Invoice</p>
                      <h3>{selectedInvoice.invoiceNumber}</h3>
                    </div>
                    <strong>{formatCurrency(selectedInvoice.totalAmount)}</strong>
                  </div>
                  <div className="purchase-detail-grid">
                    <p><span>Vendor</span>{selectedInvoice.vendorName || '-'}</p>
                    <p><span>Company</span>{selectedInvoice.companyName || '-'}</p>
                    <p><span>Date</span>{formatDate(selectedInvoice.purchaseDate)}</p>
                    <p><span>Items</span>{selectedInvoice.items?.length || 0}</p>
                  </div>
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Part</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedInvoice.items || []).map((item) => (
                          <tr key={item.id}>
                            <td>{item.partName}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unitPrice)}</td>
                            <td>{formatCurrency(item.subTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </article>
          </div>

          <article className="table-card card purchase-list-card">
            <div className="table-card-header">
              <div>
                <h3 className="staff-card-title card-title">Purchase Invoice List</h3>
                <p className="section-copy">Review supplier invoices and remove incorrect stock entries.</p>
              </div>
            </div>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td className="empty-state" colSpan="5">
                        No purchase invoices have been created yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{invoice.vendorName || `Vendor ${invoice.vendorId}`}</td>
                        <td>{formatDate(invoice.purchaseDate)}</td>
                        <td>{formatCurrency(invoice.totalAmount)}</td>
                        <td>
                          <div className="button-group">
                            <button className="button button-primary inventory-action-button" type="button" onClick={() => handleView(invoice)}>
                              View
                            </button>
                            <button className="button button-danger inventory-action-button" type="button" onClick={() => handleDelete(invoice)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}

export default PurchaseInvoices;
