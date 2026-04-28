import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getApiErrorMessage, readApiResponse } from '../../config/api';
import './CustomerHistory.css';

function CustomerHistory() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  useEffect(() => {
    const loadHistory = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please sign in to view your service and purchase history.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE}/api/customers/service-history`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await readApiResponse(response);

        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('customer');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(getApiErrorMessage(data, 'Failed to load history records.'));
        }

        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Service history fetch error:', err);
        setError(err.message || 'Failed to load history records.');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [navigate]);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }),
    []
  );

  const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

  const formatDate = (value) => {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleDateString('en-NP', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const summary = useMemo(() => {
    return history.reduce(
      (accumulator, record) => {
        const amount = Number(record.amount || 0);
        const historyType = (record.historyType || '').toLowerCase();
        const paymentStatus = (record.paymentStatus || '').toLowerCase();

        if (historyType === 'service') {
          accumulator.totalServices += 1;
        }

        if (historyType === 'purchase') {
          accumulator.totalPurchases += 1;
        }

        accumulator.totalAmountSpent += amount;

        if (paymentStatus === 'pending' || paymentStatus === 'credit') {
          accumulator.pendingCount += 1;
          accumulator.pendingAmount += amount;
        }

        return accumulator;
      },
      {
        totalServices: 0,
        totalPurchases: 0,
        totalAmountSpent: 0,
        pendingCount: 0,
        pendingAmount: 0
      }
    );
  }, [history]);

  const filteredHistory = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return history.filter((record) => {
      const recordType = record.historyType || '';
      const recordPayment = record.paymentStatus || '';
      const searchableText = [
        record.title,
        record.description,
        record.vehicleDetails,
        record.invoiceNumber,
        record.historyType
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesType = typeFilter === 'All' || recordType === typeFilter;
      const matchesPayment = paymentFilter === 'All' || recordPayment === paymentFilter;

      return matchesSearch && matchesType && matchesPayment;
    });
  }, [history, paymentFilter, searchTerm, typeFilter]);

  const historyTypeBadgeClass = (value) => {
    const normalizedValue = (value || '').toLowerCase();

    if (normalizedValue === 'purchase') {
      return 'badge badge-type badge-purchase';
    }

    return 'badge badge-type badge-service';
  };

  const paymentBadgeClass = (value) => {
    const normalizedValue = (value || '').toLowerCase();

    if (normalizedValue === 'paid') {
      return 'badge badge-payment badge-paid';
    }

    if (normalizedValue === 'credit') {
      return 'badge badge-payment badge-credit';
    }

    return 'badge badge-payment badge-pending';
  };

  const showEmptyState = !loading && !error && history.length === 0;
  const showNoResultsState = !loading && !error && history.length > 0 && filteredHistory.length === 0;

  return (
    <div className="customer-history-page">
      <div className="customer-history-shell">
        <section className="customer-history-hero">
          <div className="customer-history-hero-copy">
            <p className="history-eyebrow">GarageGo Customer Portal</p>
            <h1>Service &amp; Purchase History</h1>
            <p className="history-subtitle">
              View your past services, purchases, invoices, and payment records in one place.
            </p>
          </div>

          <div className="customer-history-actions">
            <button type="button" className="history-back-button" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </section>

        <section className="history-summary-grid" aria-label="History summary">
          <article className="summary-card">
            <span className="summary-label">Total Services</span>
            <strong className="summary-value">{summary.totalServices}</strong>
            <span className="summary-caption">Completed service visits</span>
          </article>

          <article className="summary-card">
            <span className="summary-label">Total Purchases</span>
            <strong className="summary-value">{summary.totalPurchases}</strong>
            <span className="summary-caption">Parts and product purchases</span>
          </article>

          <article className="summary-card">
            <span className="summary-label">Total Amount Spent</span>
            <strong className="summary-value">{formatCurrency(summary.totalAmountSpent)}</strong>
            <span className="summary-caption">Combined service and purchase value</span>
          </article>

          <article className="summary-card">
            <span className="summary-label">Pending Payments</span>
            <strong className="summary-value">{formatCurrency(summary.pendingAmount)}</strong>
            <span className="summary-caption">{summary.pendingCount} record{summary.pendingCount === 1 ? '' : 's'} awaiting settlement</span>
          </article>
        </section>

        <section className="history-filter-panel" aria-label="Filters">
          <div className="filter-grid">
            <div className="filter-group filter-group-wide">
              <label htmlFor="history-search">Search by service or part name</label>
              <input
                id="history-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, description, invoice, or vehicle"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="history-type-filter">Filter by type</label>
              <select
                id="history-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="Service">Service</option>
                <option value="Purchase">Purchase</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="history-payment-filter">Filter by payment status</label>
              <select
                id="history-payment-filter"
                value={paymentFilter}
                onChange={(event) => setPaymentFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>
          </section>

        {loading ? (
          <div className="history-state-card loading-state">
            <div className="loading-spinner" aria-hidden="true" />
            <div>
              <h2>Loading your history</h2>
              <p>Fetching service and purchase records from SQLite.</p>
            </div>
          </div>
        ) : error ? (
          <div className="history-state-card error-state">
            <h2>Unable to load history</h2>
            <p>{error}</p>
          </div>
        ) : showEmptyState ? (
          <div className="history-state-card empty-state">
            <h2>No history records yet</h2>
            <p>Your service and purchase history will appear here once records are added in the backend.</p>
          </div>
        ) : showNoResultsState ? (
          <div className="history-state-card empty-state">
            <h2>No matching results</h2>
            <p>Adjust your search or filter settings to view more records.</p>
          </div>
        ) : (
          <section className="history-results">
            <div className="history-table-shell">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.serviceDate)}</td>
                      <td>{record.vehicleDetails || 'No vehicle linked'}</td>
                      <td>
                        <span className={historyTypeBadgeClass(record.historyType)}>{record.historyType || 'Service'}</span>
                      </td>
                      <td>
                        <div className="record-title-cell">{record.title || 'Untitled record'}</div>
                        <div className="record-muted-cell">{record.description || 'No description provided.'}</div>
                      </td>
                      <td>{record.description || 'No description provided.'}</td>
                      <td className="amount-cell">{formatCurrency(record.amount)}</td>
                      <td>
                        <span className={paymentBadgeClass(record.paymentStatus)}>{record.paymentStatus || 'Unknown'}</span>
                      </td>
                      <td>{record.invoiceNumber || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="history-mobile-cards">
              {filteredHistory.map((record) => (
                <article key={record.id} className="history-mobile-card">
                  <div className="mobile-card-top">
                    <div>
                      <span className="mobile-card-date">{formatDate(record.serviceDate)}</span>
                      <h2>{record.title || 'Untitled record'}</h2>
                    </div>
                    <span className={historyTypeBadgeClass(record.historyType)}>{record.historyType || 'Service'}</span>
                  </div>

                  <div className="mobile-card-grid">
                    <div>
                      <span className="mobile-card-label">Vehicle</span>
                      <strong>{record.vehicleDetails || 'No vehicle linked'}</strong>
                    </div>
                    <div>
                      <span className="mobile-card-label">Amount</span>
                      <strong>{formatCurrency(record.amount)}</strong>
                    </div>
                    <div>
                      <span className="mobile-card-label">Status</span>
                      <span className={paymentBadgeClass(record.paymentStatus)}>{record.paymentStatus || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="mobile-card-label">Invoice</span>
                      <strong>{record.invoiceNumber || '—'}</strong>
                    </div>
                  </div>

                  <p className="mobile-card-description">{record.description || 'No description provided.'}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default CustomerHistory;
