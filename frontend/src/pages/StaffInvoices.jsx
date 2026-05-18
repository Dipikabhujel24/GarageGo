import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadStoredInvoices } from '../utils/invoiceStorage';

function StaffInvoices() {
  const [invoices] = useState(() => loadStoredInvoices());

  const latestInvoice = useMemo(() => invoices[0] || null, [invoices]);

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Invoices</h2>
        <p className="section-copy">Review recent sales invoices, open details, print, download, or email them.</p>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <h3>Invoice Summary</h3>
          <p>{invoices.length} invoice{invoices.length === 1 ? '' : 's'} stored for the staff workspace.</p>
          <div className="dashboard-card-links">
            <Link className="dashboard-card-link primary" to="/staff/sales">Create Invoice</Link>
          </div>
        </article>

        <article className="dashboard-card">
          <h3>Latest Invoice</h3>
          {latestInvoice ? (
            <>
              <p>Invoice #{latestInvoice.saleId}</p>
              <p>Total Rs{Number(latestInvoice.totalAmount || 0).toFixed(2)}</p>
              <div className="dashboard-card-links">
                <Link className="dashboard-card-link primary" to={`/staff/invoices/${latestInvoice.saleId}`}>
                  Open Details
                </Link>
              </div>
            </>
          ) : (
            <p>No invoices have been created yet.</p>
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
                <th>Customer</th>
                <th>Email</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="5">No invoices available.</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.saleId}>
                    <td>#{invoice.saleId}</td>
                    <td>{invoice.customerName || `Customer ${invoice.customerId}`}</td>
                    <td>{invoice.customerEmail || '-'}</td>
                    <td>Rs{Number(invoice.totalAmount || 0).toFixed(2)}</td>
                    <td>
                      <Link className="button button-primary" to={`/staff/invoices/${invoice.saleId}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default StaffInvoices;