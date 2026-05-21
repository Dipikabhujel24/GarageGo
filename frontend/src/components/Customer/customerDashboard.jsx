import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getStoredAuthUser } from '../../utils/authSession';
import AiMaintenanceAlerts from './AiMaintenanceAlerts';
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
      title: 'Appointments',
      description: 'Book a service appointment and track your booking status.',
      buttonLabel: 'Book Appointment',
      onClick: () => navigate('/appointments'),
    },
    {
      title: 'Part Requests',
      description: 'Request unavailable parts for your vehicle.',
      buttonLabel: 'Request a Part',
      onClick: () => navigate('/part-requests'),
    },
    {
      title: 'Reviews',
      description: 'Rate your GarageGo service experience.',
      buttonLabel: 'Leave a Review',
      onClick: () => navigate('/reviews'),
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
            <button type="button" className="primary-btn" onClick={() => navigate('/appointments')}>
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
              Appointments, parts, and reviews
            </span>
            <p className="dashboard-copy" style={{ marginTop: '10px', fontSize: '15px' }}>
              Book an appointment, request a part, or leave feedback from dedicated pages.
            </p>
            <div className="dashboard-card-links" style={{ marginTop: '14px' }}>
              <button type="button" className="secondary-btn" onClick={() => navigate('/appointments')}>
                Appointments
              </button>
              <button type="button" className="secondary-btn" onClick={() => navigate('/vehicles')}>
                Manage Vehicles
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard-section-grid dashboard-section-grid--ai" aria-label="AI maintenance insights">
        <div className="dashboard-panel dashboard-panel--full">
          <AiMaintenanceAlerts />
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
              <button type="button" className="support-link-button" onClick={() => navigate('/appointments')}>
                Appointments
              </button>
              <button type="button" className="support-link-button" onClick={() => navigate('/part-requests')}>
                Part Requests
              </button>
              <button type="button" className="support-link-button" onClick={() => navigate('/reviews')}>
                Reviews
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

export default CustomerDashboard;
