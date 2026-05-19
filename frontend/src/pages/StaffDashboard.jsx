import React from 'react';
import { Link } from 'react-router-dom';
import { getStoredAuthUser } from '../utils/authSession';
import { loadStoredInvoices } from '../utils/invoiceStorage';

const quickLinks = [
  { label: 'Customers', to: '/staff/customers', description: 'Search and manage customer records.' },
  { label: 'Sales', to: '/staff/sales', description: 'Create sales invoices and update stock.' },
  { label: 'Invoices', to: '/staff/invoices', description: 'Review recent invoices and send email receipts.' },
  { label: 'Inventory', to: '/staff/inventory', description: 'Check parts stock and vendor coverage.' },
  { label: 'Reports', to: '/staff/reports', description: 'Review operational performance.' },
  { label: 'Customer Reports', to: '/staff/customer-reports', description: 'Review regulars, high spenders, and pending credits.' },
];

function StaffDashboard() {
  const user = getStoredAuthUser();
  const invoices = loadStoredInvoices();
  const latestInvoice = invoices[0];

  return (
    <section className="dashboard-home">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Staff workspace</p>
          <h2>Welcome back, {user?.name || 'Staff member'}</h2>
          <p className="dashboard-copy">
            Use the staff dashboard to create sales invoices, manage customers, and follow up on billing.
          </p>

          <div className="dashboard-hero-actions">
            <Link className="dashboard-button primary" to="/staff/sales">Create Invoice</Link>
            <Link className="dashboard-button secondary" to="/staff/invoices">View Invoices</Link>
          </div>
        </div>

        <div className="dashboard-hero-aside">
          <article className="dashboard-metric-card">
            <span className="dashboard-metric-label">Invoices stored</span>
            <span className="dashboard-metric-value">{invoices.length}</span>
            <p className="dashboard-copy" style={{ marginTop: '10px', fontSize: '15px' }}>
              Recent sales invoices are saved locally for quick access in this staff workspace.
            </p>
          </article>

          <article className="dashboard-shortcut-card">
            <span className="dashboard-shortcut-label">Latest invoice</span>
            <span className="dashboard-metric-value" style={{ fontSize: '1.2rem' }}>
              {latestInvoice ? `#${latestInvoice.saleId}` : 'None yet'}
            </span>
            <p className="dashboard-copy" style={{ marginTop: '10px', fontSize: '15px' }}>
              {latestInvoice ? `Total Rs${Number(latestInvoice.totalAmount || 0).toFixed(2)}` : 'Create the first invoice from Sales.'}
            </p>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        {quickLinks.map((item) => (
          <article className="dashboard-card" key={item.label}>
            <h3>{item.label}</h3>
            <p>{item.description}</p>
            <div className="dashboard-card-links">
              <Link className="dashboard-card-link primary" to={item.to}>Open</Link>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

export default StaffDashboard;
