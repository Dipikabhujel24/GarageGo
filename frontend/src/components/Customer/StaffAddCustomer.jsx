import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config/api';
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/staff/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          vehicleYear: Number(formData.vehicleYear)
        })
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { message: rawText || 'Unexpected server response.' };
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to register customer from staff portal.');
      }

      setMessage(data.message || 'Customer registered successfully by staff.');
      setFormData(initialForm);
    } catch (err) {
      setError(err.message || 'Failed to register customer from staff portal.');
    }
  };

  return (
    <div className="customer-page">
      <div className="customer-page-header">
        <h2>Staff Customer Registration</h2>
        <p>Create a customer account and vehicle details from the internal staff portal.</p>
      </div>

      <div className="customer-page-content">
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
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
            <input id="address" name="address" value={formData.address} onChange={handleChange} />
          </div>

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

          <div className="form-group full customer-actions">
            <button className="primary-btn" type="submit">Register Customer</button>
            <button className="secondary-btn" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StaffAddCustomer;
