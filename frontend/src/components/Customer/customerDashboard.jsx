import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerModule.css';

function CustomerDashboard() {
  const navigate = useNavigate();
  const storedCustomer = localStorage.getItem('customer');
  const customer = storedCustomer ? JSON.parse(storedCustomer) : null;
  const vehicleCount = Array.isArray(customer?.vehicles) ? customer.vehicles.length : 0;
  const customerName = customer?.name || 'Customer';
  const customerInitials = customerName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const summaryCards = [
    {
      label: 'Registered Vehicles',
      value: vehicleCount,
      hint: vehicleCount > 0 ? 'Vehicles linked to your account' : 'No vehicles added yet',
      icon: '🚗'
    },
    {
      label: 'Service Records',
      value: '0',
      hint: 'History entries will appear here',
      icon: '🛠️'
    },
    {
      label: 'Pending Payments',
      value: 'NPR 0',
      hint: 'No outstanding balances right now',
      icon: '💳'
    },
    {
      label: 'Last Service',
      value: '—',
      hint: 'No recent service activity found',
      icon: '📅'
    }
  ];

  const quickActions = [
    {
      title: 'My Profile',
      description: 'Update your contact details and address information.',
      icon: '👤',
      buttonLabel: 'Open Profile',
      onClick: () => navigate('/profile')
    },
    {
      title: 'My Vehicles',
      description: 'View and manage the vehicles linked to your GarageGo account.',
      icon: '🚘',
      buttonLabel: 'Manage Vehicles',
      onClick: () => navigate('/vehicles')
    },
    {
      title: 'Service & Purchase History',
      description: 'Review your invoices, payments, parts, and service records.',
      icon: '🧾',
      buttonLabel: 'View History',
      onClick: () => navigate('/history')
    },
    {
      title: 'Staff Add Customer',
      description: 'Open the internal staff form to add a new customer with vehicle details.',
      icon: '🧩',
      buttonLabel: 'Open Staff Form',
      onClick: () => navigate('/staff/customers/new')
    }
  ];

  const notifications = [
    {
      title: 'Unpaid payment reminder',
      body: 'Please clear any pending invoices before your next garage visit.',
      tone: 'warning'
    },
    {
      title: 'Service due reminder',
      body: 'Your next maintenance window will appear here once service dates are available.',
      tone: 'info'
    },
    {
      title: 'Requested part update',
      body: 'Requested parts and order updates will be surfaced here for quick follow-up.',
      tone: 'success'
    }
  ];

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    navigate('/login');
  };

  return (
    <div className="customer-portal-shell">
      <aside className="customer-sidebar">
        <div className="customer-brand">
          <div className="customer-brand-mark">G</div>
          <div>
            <h1>GarageGo</h1>
            <p>Customer Portal</p>
          </div>
        </div>

        <nav className="customer-nav" aria-label="Customer navigation">
          <button type="button" className="customer-nav-item active" onClick={() => navigate('/dashboard')}>
            <span>Dashboard</span>
            <small>Overview</small>
          </button>
          <button type="button" className="customer-nav-item" onClick={() => navigate('/profile')}>
            <span>My Profile</span>
            <small>Account settings</small>
          </button>
          <button type="button" className="customer-nav-item" onClick={() => navigate('/vehicles')}>
            <span>My Vehicles</span>
            <small>Garage records</small>
          </button>
          <button type="button" className="customer-nav-item" onClick={() => navigate('/history')}>
            <span>Service History</span>
            <small>Services and purchases</small>
          </button>
          <button type="button" className="customer-nav-item" onClick={() => navigate('/staff/customers/new')}>
            <span>Staff Add Customer</span>
            <small>Internal form</small>
          </button>
        </nav>

        <div className="customer-sidebar-footer">
          <button type="button" className="customer-logout-button" onClick={logout}>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="customer-dashboard-main">
        <header className="customer-dashboard-header">
          <div className="customer-greeting-block">
            <span className="customer-eyebrow">GarageGo Vehicle Parts &amp; Service Management</span>
            <h2>Welcome back, {customerName}</h2>
            <p>Manage your vehicles, services, and account from one place.</p>
          </div>

          <div className="customer-avatar" aria-label={`${customerName} profile avatar`}>
            <span>{customerInitials || 'G'}</span>
          </div>
        </header>

        <section className="customer-summary-grid" aria-label="Customer summary">
          {summaryCards.map((card) => (
            <article className="customer-summary-card" key={card.label}>
              <div className="customer-summary-card-top">
                <span className="summary-icon" aria-hidden="true">{card.icon}</span>
                <span className="summary-label">{card.label}</span>
              </div>
              <strong className="summary-value">{card.value}</strong>
              <p className="summary-hint">{card.hint}</p>
            </article>
          ))}
        </section>

        <section className="customer-content-grid">
          <div className="customer-content-column">
            <section className="customer-panel">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Quick access</span>
                  <h3>Shortcuts</h3>
                </div>
              </div>

              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <article className="quick-action-card" key={action.title}>
                    <div className="quick-action-icon" aria-hidden="true">{action.icon}</div>
                    <h4>{action.title}</h4>
                    <p>{action.description}</p>
                    <button type="button" className="quick-action-button" onClick={action.onClick}>
                      {action.buttonLabel}
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="customer-panel">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Recent activity</span>
                  <h3>Latest service and purchase updates</h3>
                </div>
              </div>

              <div className="activity-empty-state">
                <div className="empty-state-icon">🕒</div>
                <h4>No recent activity found.</h4>
                <p>Your latest services, purchases, and invoices will appear here when records are available.</p>
              </div>
            </section>
          </div>

          <aside className="customer-content-column customer-content-column-side">
            <section className="customer-panel notifications-panel">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Alerts</span>
                  <h3>Notifications</h3>
                </div>
              </div>

              <div className="notification-list">
                {notifications.map((item) => (
                  <article className={`notification-card notification-${item.tone}`} key={item.title}>
                    <div className="notification-dot" aria-hidden="true" />
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="customer-panel support-panel">
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
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default CustomerDashboard;