import React, { useState, useEffect } from 'react';
import './CustomerHistory.css';

const API_BASE = process.env.REACT_APP_API_URL?.trim() || 'http://localhost:5000';

const CustomerHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Please log in to view your service history.');
                    setLoading(false);
                    return;
                }

                // Call the correct backend API mapped through the ServiceHistoryController
                const response = await fetch(`${API_BASE}/api/customers/ServiceHistory`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401) {
                    setError('Your session has expired. Please log in again.');
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch service history: ${response.status}`);
                }

                const data = await response.json();
                setHistory(data);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching history:", err);
                setError('Failed to load service history. Please try again later.');
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) return <div className="history-loading">Loading your history...</div>;

    if (error) return <div className="history-error">{error}</div>;

    return (
        <div className="customer-history-container">
            <h2>Your Service History</h2>

            {history.length === 0 ? (
                <p className="no-history">You don't have any service history yet.</p>
            ) : (
                <div className="history-list">
                    {history.map((record) => (
                        <div key={record.id} className="history-card">
                            <div className="history-header">
                                <span className="service-date">
                                    {new Date(record.serviceDate).toLocaleDateString()}
                                </span>
                                <span className="service-cost">${record.cost.toFixed(2)}</span>
                            </div>
                            <div className="history-body">
                                <h3>{record.serviceType}</h3>
                                <p className="vehicle-details">
                                    <strong>Vehicle:</strong> {record.vehicleDetails}
                                </p>
                                {record.description && (
                                    <p className="service-description">{record.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerHistory;
