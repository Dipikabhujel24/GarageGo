import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getApiErrorMessage, readApiResponse } from '../../config/api';
import { clearAuthSession, getStoredToken } from '../../utils/authSession';
import './CustomerModule.css';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  address: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicleYear: '',
  licensePlate: ''
};

function StaffAddCustomer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdSummary, setCreatedSummary] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);
    setCreatedSummary(null);

    try {
      const token = getStoredToken();
      const response = await fetch(`${API_BASE}/api/staff/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...formData,
          vehicleYear: Number(formData.vehicleYear)
        })
      });

      const data = await readApiResponse(response);

      if (response.status === 401) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to register customer from the GarageGo workspace.'));
      }

      setMessage(data.message || 'Customer registered successfully by staff.');
      setCreatedSummary({
        customerName: data.customer?.name || formData.name,
        customerEmail: data.customer?.email || formData.email,
        vehicleLabel: data.vehicle ? `${data.vehicle.make} ${data.vehicle.model}` : `${formData.vehicleMake} ${formData.vehicleModel}`,
        vehicleYear: data.vehicle?.year || formData.vehicleYear,
        licensePlate: data.vehicle?.licensePlate || formData.licensePlate
      });
      setFormData(initialForm);
    } catch (err) {
      setError(err.message || 'Failed to register customer from the GarageGo workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="customer-page-shell customer-staff-shell">
      <div className="customer-page-card customer-staff-card">
        <header className="customer-page-hero staff-hero">
          <div>
            <span className="section-kicker">Internal workflow</span>
            <h2>Staff Customer Registration</h2>
            <p>Register walk-in customers and their vehicle details.</p>
          </div>

          <div className="staff-hero-badge">
            <span>GarageGo Staff</span>
            <strong>Customer Intake</strong>
          </div>
        </header>

        <div className="customer-page-alerts">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>

        {createdSummary && (
          <section className="customer-summary-result">
            <div>
              <span className="section-kicker">Created customer</span>
              <h3>{createdSummary.customerName}</h3>
              <p>{createdSummary.customerEmail}</p>
            </div>

            <div className="customer-summary-result__vehicle">
              <span>Vehicle</span>
              <strong>{createdSummary.vehicleLabel}</strong>
              <p>{createdSummary.vehicleYear} • {createdSummary.licensePlate || 'No plate provided'}</p>
            </div>
          </section>
        )}

        <form className="staff-form-grid" onSubmit={handleSubmit}>
          <section className="customer-form-card">
            <div className="customer-form-card__header">
              <div>
                <span className="section-kicker">Customer details</span>
                <h3>Account information</h3>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Customer Name</label>
                <input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="password">Temporary Password</label>
                <input id="password" name="password" type="password" minLength="6" value={formData.password} onChange={handleChange} required />
              </div>

              <div className="form-group full">
                <label htmlFor="address">Address</label>
                <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows="4" />
              </div>
            </div>
          </section>

          <section className="customer-form-card">
            <div className="customer-form-card__header">
              <div>
                <span className="section-kicker">Vehicle details</span>
                <h3>Primary vehicle</h3>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="vehicleMake">Vehicle Make</label>
                <input id="vehicleMake" name="vehicleMake" value={formData.vehicleMake} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="vehicleModel">Vehicle Model</label>
                <input id="vehicleModel" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="vehicleYear">Vehicle Year</label>
                <input id="vehicleYear" name="vehicleYear" type="number" min="1900" max="2100" value={formData.vehicleYear} onChange={handleChange} required />
              </div>

              <div className="form-group">
                <label htmlFor="licensePlate">License Plate</label>
                <input id="licensePlate" name="licensePlate" value={formData.licensePlate} onChange={handleChange} />
              </div>
            </div>
          </section>

          <div className="form-actions staff-form-actions">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Customer'}
            </button>
            <button className="secondary-btn" type="button" onClick={() => navigate('/staff/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StaffAddCustomer;
