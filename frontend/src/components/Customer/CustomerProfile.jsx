import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerModule.css';

const API_BASE = 'http://localhost:5028';

function CustomerProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/customers/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load profile.');
        }

        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || ''
        });
      } catch (err) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/customers/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      if (data.customer) {
        localStorage.setItem('customer', JSON.stringify(data.customer));
      }

      setMessage(data.message || 'Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  if (loading) {
    return <div className="customer-page"><div className="customer-page-content">Loading profile...</div></div>;
  }

  return (
    <div className="customer-page">
      <div className="customer-page-header">
        <h2>My Profile</h2>
        <p>View and edit your personal details.</p>
      </div>

      <div className="customer-page-content">
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" value={formData.email} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" value={formData.phone} onChange={handleChange} required />
          </div>

          <div className="form-group full">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" value={formData.address} onChange={handleChange} />
          </div>

          <div className="customer-actions form-group full">
            <button type="submit" className="primary-btn">Save Profile</button>
            <button type="button" className="secondary-btn" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomerProfile;
