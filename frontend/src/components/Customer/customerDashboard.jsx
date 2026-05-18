import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getStoredAuthUser } from '../../utils/authSession';
import './CustomerModule.css';

function CustomerDashboard() {
  const navigate = useNavigate();
  const customer = getStoredAuthUser();
  const vehicleCount = Array.isArray(customer?.vehicles) ? customer.vehicles.length : 0;
  const customerName = customer?.name || 'Customer';

  const quickActions = [
    {
      title: 'My Profile',
      description: 'Update your contact details and address information.',
      buttonLabel: 'Open Profile',
      onClick: () => navigate('/profile'),
    },
    {
      title: 'My Vehicles',
      description: 'View and manage the vehicles linked to your GarageGo account.',
      buttonLabel: 'Manage Vehicles',
      onClick: () => navigate('/vehicles'),
    },
    {
      title: 'History',
      description: 'Review invoices, payments, parts, and service records.',
      buttonLabel: 'View History',
      onClick: () => navigate('/history'),
    },
    {
      title: 'Requests',
      description: 'Book appointments, request unavailable parts, and leave service reviews.',
      buttonLabel: 'Open Requests',
      onClick: () => navigate('/requests'),
    },
  ];

  const logout = () => {
    clearAuthSession();
    navigate('/login');
  };

  return (
    <div className="dashboard-home">
      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">GarageGo customer dashboard</p>
          <h2>Welcome back, {customerName}</h2>
          <p className="dashboard-copy">
            Manage your profile, vehicles, appointments, and service requests in one place.
          </p>

          <div className="dashboard-hero-actions">
            <button type="button" className="primary-btn" onClick={() => navigate('/requests')}>
              Book a Service
            </button>
            <button type="button" className="secondary-btn" onClick={() => navigate('/history')}>
              View History
            </button>
            <button type="button" className="secondary-btn" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>

        <div className="dashboard-hero-aside">
          <article className="dashboard-metric-card">
            <span className="dashboard-metric-label">Signed in as</span>
            <span className="dashboard-metric-value">{customerName}</span>
            <p className="dashboard-copy" style={{ marginTop: '10px', fontSize: '15px' }}>
              {customer?.email || 'No email available'}
            </p>
          </article>

          <article className="dashboard-shortcut-card">
            <span className="dashboard-shortcut-label">GarageGo self-service</span>
            <span className="dashboard-metric-value" style={{ fontSize: '1.2rem' }}>
              Requests and appointments
            </span>
            <p className="dashboard-copy" style={{ marginTop: '10px', fontSize: '15px' }}>
              Use the requests page to book an appointment, request a part, or leave feedback.
            </p>
            <div className="dashboard-card-links" style={{ marginTop: '14px' }}>
              <button type="button" className="secondary-btn" onClick={() => navigate('/requests')}>
                Open Requests
              </button>
              <button type="button" className="secondary-btn" onClick={() => navigate('/vehicles')}>
                Manage Vehicles
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section-grid" aria-label="GarageGo dashboard content">
        <div className="dashboard-panel">
          <section className="dashboard-card">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Quick access</span>
                <h3>Shortcuts</h3>
              </div>
            </div>

            <div className="dashboard-panel-grid">
              {quickActions.map((action) => (
                <article className="dashboard-panel-card" key={action.title}>
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                  <button type="button" className="secondary-action-button" onClick={action.onClick}>
                    {action.buttonLabel}
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-panel">
          <section className="dashboard-card">
            <div className="section-heading">
              <div>
                <span className="section-kicker">Account</span>
                <h3>Current profile</h3>
              </div>
            </div>

            <div className="profile-card-mini">
              <div>
                <strong>{customerName}</strong>
                <p>{customer?.email || 'No email available'}</p>
              </div>
              <button type="button" className="secondary-action-button" onClick={() => navigate('/profile')}>
                Edit Profile
              </button>
            </div>

            <div className="support-links">
              <button type="button" className="support-link-button" onClick={() => navigate('/vehicles')}>
                View Vehicles
              </button>
              <button type="button" className="support-link-button" onClick={() => navigate('/history')}>
                Open History
              </button>
              <button type="button" className="support-link-button" onClick={() => navigate('/requests')}>
                Open Requests
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

export default CustomerDashboard;
