import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getApiErrorMessage, readApiResponse } from '../../config/api';
import { clearAuthSession, getStoredToken, updateStoredAuthUser } from '../../utils/authSession';
import './CustomerModule.css';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: ''
};

function CustomerProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(initialForm);
  const [profileMeta, setProfileMeta] = useState({ vehicleCount: 0, lastUpdated: '—' });

  const token = getStoredToken();

  const displayName = formData.name.trim() || 'Customer';

  const initials = useMemo(() => {
    const parts = displayName.split(' ').filter(Boolean);

    if (parts.length === 0) {
      return 'G';
    }

    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [displayName]);

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

        const data = await readApiResponse(response);

        if (response.status === 401) {
          clearAuthSession();
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(getApiErrorMessage(data, 'Failed to load profile.'));
        }

        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || ''
        });

        setProfileMeta({
          vehicleCount: Array.isArray(data.vehicles) ? data.vehicles.length : 0,
          lastUpdated: new Date().toLocaleDateString('en-NP', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        });
      } catch (err) {
        setError(err.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate, token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

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

      const data = await readApiResponse(response);

      if (response.status === 401) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to update profile.'));
      }

      if (data.user) {
        updateStoredAuthUser(data.user);
        setFormData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          address: data.user.address || ''
        });
      }

      setMessage(data.message || 'Profile updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="customer-page-shell">
        <div className="customer-loading-card">
          <div className="loading-spinner" aria-hidden="true" />
          <div>
            <h2>Loading your profile</h2>
            <p>Fetching account details from GarageGo.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page-shell customer-profile-shell">
      <div className="customer-page-card customer-profile-card">
        <header className="customer-page-hero profile-hero">
          <div>
            <span className="section-kicker">Customer account</span>
            <h2>My Profile</h2>
            <p>Manage your personal information and contact details.</p>
          </div>

          <div className="profile-avatar-circle" aria-label="Customer avatar">
            <span>{initials}</span>
          </div>
        </header>

        <div className="customer-page-alerts">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="profile-layout-grid">
          <section className="customer-form-card">
            <div className="customer-form-card__header">
              <div>
                <span className="section-kicker">Profile details</span>
                <h3>Edit profile information</h3>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="form-grid profile-form-grid">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} required />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" value={formData.email} readOnly />
              </div>

              <div className="form-group full">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} required />
              </div>

              <div className="form-group full">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                  rows="4"
                />
              </div>

              <div className="form-actions form-actions-wide">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" className="secondary-btn" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </button>
              </div>
            </form>
          </section>

          <aside className="customer-aside-panel">
            <div className="customer-aside-card">
              <span className="section-kicker">Account snapshot</span>
              <h3>{displayName}</h3>
              <div className="aside-stat-list">
                <div>
                  <span>Email</span>
                  <strong>{formData.email || '—'}</strong>
                </div>
                <div>
                  <span>Linked vehicles</span>
                  <strong>{profileMeta.vehicleCount}</strong>
                </div>
                <div>
                  <span>Last synced</span>
                  <strong>{profileMeta.lastUpdated}</strong>
                </div>
              </div>
            </div>

            <div className="customer-aside-card customer-aside-card--soft">
              <h4>Tips</h4>
              <p>Keep your phone and address updated so GarageGo can reach you about service reminders and vehicle updates.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfile;
