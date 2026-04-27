import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerModule.css';

const API_BASE = 'http://localhost:5028';

function CustomerVehicles() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: '',
    licensePlate: ''
  });

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/customers/vehicles`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load vehicles.');
      }

      setVehicles(data);
    } catch (err) {
      setError(err.message || 'Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    fetchVehicles();
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add vehicle.');
      }

      setMessage(data.message || 'Vehicle added successfully.');
      setFormData({ make: '', model: '', year: '', licensePlate: '' });
      await fetchVehicles();
    } catch (err) {
      setError(err.message || 'Failed to add vehicle.');
    }
  };

  return (
    <div className="customer-page">
      <div className="customer-page-header">
        <h2>My Vehicles</h2>
        <p>See your registered vehicles and add new ones.</p>
      </div>

      <div className="customer-page-content">
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="customer-card">
          <h3>Add Vehicle</h3>
          <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: '12px' }}>
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
            <div className="form-group full customer-actions">
              <button className="primary-btn" type="submit">Add Vehicle</button>
              <button className="secondary-btn" type="button" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </form>
        </div>

        <div className="customer-card">
          <h3>Vehicle List</h3>
          {loading ? (
            <p>Loading vehicles...</p>
          ) : vehicles.length === 0 ? (
            <p>No vehicles added yet.</p>
          ) : (
            <div className="customer-list" style={{ marginTop: '12px' }}>
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="customer-list-item">
                  <strong>{vehicle.make} {vehicle.model}</strong>
                  <p>Year: {vehicle.year}</p>
                  <p>License Plate: {vehicle.licensePlate || 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerVehicles;
