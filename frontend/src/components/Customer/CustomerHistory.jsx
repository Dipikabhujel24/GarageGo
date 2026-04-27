import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config/api';
import './CustomerModule.css';

function CustomerHistory() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/customers/service-history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const rawText = await response.text();
      let data = [];

      try {
        data = rawText ? JSON.parse(rawText) : [];
      } catch {
        data = { message: rawText || 'Unexpected server response.' };
      }

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('customer');
          navigate('/login');
          return;
        }

        console.error('Service history API error:', data);
        throw new Error(data.message || 'Failed to load service history.');
      }

      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Service history fetch error:', err);
      setError(err.message || 'Failed to load service history.');
    } finally {
      setLoading(false);
    }
  }, [navigate, token]);

  useEffect(() => {
    loadHistory();
  }, [token, navigate, loadHistory]);

  return (
    <div className="customer-page">
      <div className="customer-page-header">
        <h2>My Service History</h2>
        <p>Track all completed services and their costs.</p>
      </div>

      <div className="customer-page-content">
        {error && <div className="error-message">{error}</div>}

        <div className="customer-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>

        {loading ? (
          <div className="customer-card"><p>Loading service history...</p></div>
        ) : history.length === 0 ? (
          <div className="customer-card"><p>No service history found yet.</p></div>
        ) : (
          <div className="customer-list">
            {history.map((record) => (
              <div key={record.id} className="customer-list-item">
                <strong>{record.serviceType}</strong>
                <p>Date: {new Date(record.serviceDate).toLocaleDateString()}</p>
                <p>Vehicle: {record.vehicleDetails || 'N/A'}</p>
                <p>Description: {record.description || 'N/A'}</p>
                <p>Cost: NPR {Number(record.cost ?? 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CustomerHistory;
