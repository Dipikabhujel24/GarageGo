import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerModule.css';

function CustomerDashboard() {
  const navigate = useNavigate();
  const storedCustomer = localStorage.getItem('customer');
  const customer = storedCustomer ? JSON.parse(storedCustomer) : null;

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('customer');
    navigate('/login');
  };

  return (
    <div className="customer-page">
      <div className="customer-page-header">
        <h2>Customer Dashboard</h2>
        <p>
          Welcome{customer?.name ? `, ${customer.name}` : ''}. Manage your profile, vehicles, and service history from one place.
        </p>
      </div>

      <div className="customer-page-content">
        <div className="customer-grid">
          <div className="customer-card">
            <h3>My Profile</h3>
            <p>Update your contact details and address.</p>
            <div className="customer-actions">
              <button className="primary-btn" onClick={() => navigate('/profile')}>
                Go to Profile
              </button>
            </div>
          </div>

          <div className="customer-card">
            <h3>My Vehicles</h3>
            <p>Add and view your registered vehicles.</p>
            <div className="customer-actions">
              <button className="primary-btn" onClick={() => navigate('/vehicles')}>
                Manage Vehicles
              </button>
            </div>
          </div>

          <div className="customer-card">
            <h3>My Service History</h3>
            <p>Review your previous services and costs.</p>
            <div className="customer-actions">
              <button className="primary-btn" onClick={() => navigate('/history')}>
                View History
              </button>
            </div>
          </div>

          <div className="customer-card">
            <h3>Logout</h3>
            <p>Sign out from your GarageGo customer account.</p>
            <div className="customer-actions">
              <button className="danger-btn" onClick={logout}>
                Logout
              </button>
            </div>
          </div>

          <div className="customer-card">
            <h3>Staff: Add Customer</h3>
            <p>Open internal registration form to add a customer with vehicle details.</p>
            <div className="customer-actions">
              <button className="secondary-btn" onClick={() => navigate('/staff/customers/new')}>
                Open Staff Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDashboard;