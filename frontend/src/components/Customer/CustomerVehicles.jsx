import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, getApiErrorMessage, readApiResponse } from '../../config/api';
import { clearAuthSession, getStoredToken } from '../../utils/authSession';
import SecureForm from '../SecureForm';
import './CustomerModule.css';

function CustomerVehicles() {
  const navigate = useNavigate();
  const token = getStoredToken();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: ''
  });

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/customers/vehicles`, {
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
        throw new Error(getApiErrorMessage(data, 'Failed to load vehicles.'));
      }

      setVehicles(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetchVehicles();
  }, [token, navigate, fetchVehicles]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/customers/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          make: formData.make,
          model: formData.model,
          year: Number(formData.year),
          licensePlate: formData.licensePlate
        })
      });

      const data = await readApiResponse(response);

      if (response.status === 401) {
        clearAuthSession();
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, 'Failed to add vehicle.'));
      }

      setMessage(data.message || 'Vehicle added successfully.');
      setFormData({ make: '', model: '', year: '', licensePlate: '' });
      await fetchVehicles();
    } catch (err) {
      setError(err.message || 'Failed to add vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalVehicles = useMemo(() => vehicles.length, [vehicles]);

  return (
    <div className="customer-page-shell customer-vehicles-shell">
      <div className="customer-page-card customer-vehicles-card">
        <header className="customer-page-hero vehicles-hero">
          <div>
            <span className="section-kicker">Garage records</span>
            <h2>My Vehicles</h2>
            <p>Manage vehicles connected to your GarageGo account.</p>
          </div>

          <div className="hero-stat-card">
            <span>Total Vehicles</span>
            <strong>{totalVehicles}</strong>
          </div>
        </header>

        <div className="customer-page-alerts">
          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="vehicles-layout-grid">
          <section className="customer-form-card">
            <div className="customer-form-card__header">
              <div>
                <span className="section-kicker">Add vehicle</span>
                <h3>Vehicle details</h3>
              </div>
            </div>

            <SecureForm onSubmit={handleSubmit} className="form-grid vehicle-form-grid" includePassword={false}>
              <div className="form-group">
                <label htmlFor="make">Make</label>
                <input id="make" name="make" value={formData.make} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="model">Model</label>
                <input id="model" name="model" value={formData.model} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <input id="year" name="year" type="number" min="1900" max="2100" value={formData.year} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="licensePlate">License Plate</label>
                <input id="licensePlate" name="licensePlate" value={formData.licensePlate} onChange={handleChange} />
              </div>

              <div className="form-actions form-actions-wide">
                <button className="primary-btn" type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Vehicle'}
                </button>
                <button className="secondary-btn" type="button" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </button>
              </div>
            </SecureForm>
          </section>

          <section className="customer-form-card">
            <div className="customer-form-card__header">
              <div>
                <span className="section-kicker">Vehicle list</span>
                <h3>Connected vehicles</h3>
              </div>
            </div>

            {loading ? (
              <div className="inline-loading-state">
                <div className="loading-spinner" aria-hidden="true" />
                <p>Loading vehicles from SQLite...</p>
              </div>
            ) : vehicles.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-icon">🚙</div>
                <h4>No vehicles added yet. Add your first vehicle to get started.</h4>
              </div>
            ) : (
              <div className="vehicle-card-grid">
                {vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="vehicle-card">
                    <div className="vehicle-card-top">
                      <div className="vehicle-badge">{String(vehicle.make || 'V').slice(0, 1).toUpperCase()}</div>
                      <div>
                        <h4>{vehicle.make} {vehicle.model}</h4>
                        <p>GarageGo Vehicle</p>
                      </div>
                    </div>

                    <div className="vehicle-card-meta">
                      <div>
                        <span>Year</span>
                        <strong>{vehicle.year}</strong>
                      </div>
                      <div>
                        <span>License Plate</span>
                        <strong>{vehicle.licensePlate || '—'}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CustomerVehicles;
