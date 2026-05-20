import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractApiError, getSales, getSalesCatalog } from '../services/api';

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function StaffInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [customerNames, setCustomerNames] = useState({});
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadInvoices = async () => {
      setIsLoading(true);

      try {
        const [salesResponse, catalogResponse] = await Promise.all([
          getSales(),
          getSalesCatalog(),
        ]);

        if (!mounted) {
          return;
        }

        const customers = catalogResponse.data?.customers ?? [];
        const nameMap = customers.reduce((accumulator, customer) => {
          accumulator[customer.id] = {
            name: customer.name,
            email: customer.email,
          };
          return accumulator;
        }, {});

        setCustomerNames(nameMap);
        setInvoices(salesResponse.data ?? []);
      } catch (error) {
        if (mounted) {
          setFeedback({ type: 'error', message: extractApiError(error) });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadInvoices();

    return () => {
      mounted = false;
    };
  }, []);

  const latestInvoice = invoices[0] || null;

  return (
    <section className="container">
      {feedback.message ? (
        <div className={`sales-banner sales-banner--${feedback.type || 'error'}`} style={{ marginBottom: '14px' }}>
          {feedback.message}
        </div>
      ) : null}

      <div className="page-header-card card">
        <h2 className="section-title card-title">Invoices</h2>
        <p className="section-copy">Review recent sales invoices, open details, print, download, or email them.</p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Invoice Summary</h3>
          <p>
            {isLoading
              ? 'Loading invoices...'
              : `${invoices.length} invoice${invoices.length === 1 ? '' : 's'} from the sales API.`}
          </p>
          <div className="dashboard-card-links">
            <Link className="dashboard-card-link primary" to="/staff/sales">Create Invoice</Link>
            <Link className="dashboard-card-link" to="/staff/sales-history">Sales History</Link>
          </div>
        </article>

        <article className="dashboard-card">
          <h3>Latest Invoice</h3>
          {latestInvoice ? (
            <>
              <p>Invoice #{latestInvoice.id}</p>
              <p>Customer ID {latestInvoice.customerId}</p>
              <p>Final {formatCurrency(latestInvoice.finalAmount ?? latestInvoice.totalAmount)}</p>
              <div className="dashboard-card-links">
                <Link className="dashboard-card-link primary" to={`/staff/invoices/${latestInvoice.id}`}>
                  Open Details
                </Link>
              </div>
            </>
          ) : (
            <p>{isLoading ? 'Loading...' : 'No invoices have been created yet.'}</p>
          )}
        </article>
      </div>

      <div className="table-card card" style={{ marginTop: '18px' }}>
        <h3 className="staff-card-title card-title">Recent invoices</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Subtotal</th>
                <th>Final</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="empty-state" colSpan="7">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="7">No invoices available.</td>
                </tr>
              ) : (
                invoices.map((invoice) => {
                  const customer = customerNames[invoice.customerId] || {};
                  return (
                    <tr key={invoice.id}>
                      <td>#{invoice.id}</td>
                      <td>{invoice.customerId}</td>
                      <td>{customer.name || `Customer ${invoice.customerId}`}</td>
                      <td>{customer.email || '-'}</td>
                      <td>{formatCurrency(invoice.totalAmount)}</td>
                      <td>{formatCurrency(invoice.finalAmount ?? invoice.totalAmount)}</td>
                      <td>
                        <Link className="button button-primary" to={`/staff/invoices/${invoice.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default StaffInvoices;
