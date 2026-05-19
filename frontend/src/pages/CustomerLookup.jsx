import React, { useEffect, useState } from 'react';
import {
  getCustomerDetails,
  searchCustomers,
} from '../services/customerFeatureService';

function CustomerLookup() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadCustomers = async (searchText = '') => {
    setIsLoading(true);
    setMessage('');

    try {
      const customerRows = await searchCustomers(searchText);
      setCustomers(customerRows);
      if (customerRows.length === 0) {
        setSelectedCustomer(null);
        setMessage('No matching customers found.');
      }
    } catch (error) {
      setMessage(error.message || 'Unable to load customers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    await loadCustomers(query);
  };

  const handleSelectCustomer = async (customerId) => {
    setMessage('');

    try {
      const customerDetails = await getCustomerDetails(customerId);
      setSelectedCustomer(customerDetails);
    } catch (error) {
      setMessage(error.message || 'Unable to load customer details.');
    }
  };

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Customer Lookup</h2>
        <p className="section-copy">
          Search customers by vehicle number, plate, phone, customer ID, or name.
        </p>
      </div>

      <form className="feature-search-card card" onSubmit={handleSearch}>
        <label className="form-label" htmlFor="customer-search">
          Search
        </label>
        <div className="feature-search-row">
          <input
            id="customer-search"
            className="input-field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, phone, ID, vehicle number, or plate"
          />
          <button className="button button-primary" type="submit">
            Search
          </button>
        </div>
      </form>

      {message && <div className="message-banner">{message}</div>}

      <div className="customer-feature-layout">
        <div className="table-card card">
          <h3 className="staff-card-title card-title">Customers</h3>
          {isLoading ? (
            <p className="status-text">Loading customers...</p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Vehicles</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td className="empty-state" colSpan="5">
                        No customers available.
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id}>
                        <td>{customer.id}</td>
                        <td>{customer.name}</td>
                        <td>{customer.phone}</td>
                        <td>{customer.vehicleNumbers?.filter(Boolean).join(', ') || '-'}</td>
                        <td>
                          <button
                            className="button button-primary"
                            type="button"
                            onClick={() => handleSelectCustomer(customer.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="feature-detail-column">
          {selectedCustomer ? (
            <>
              <section className="table-card card">
                <h3 className="staff-card-title card-title">Customer Details</h3>
                <div className="detail-grid">
                  <p><strong>ID:</strong> {selectedCustomer.id}</p>
                  <p><strong>Name:</strong> {selectedCustomer.name}</p>
                  <p><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                  <p className="detail-full"><strong>Address:</strong> {selectedCustomer.address || '-'}</p>
                </div>
              </section>

              <section className="table-card card">
                <h3 className="staff-card-title card-title">Vehicle Info</h3>
                {selectedCustomer.vehicles.length === 0 ? (
                  <p className="status-text">No vehicles found.</p>
                ) : (
                  <div className="feature-list">
                    {selectedCustomer.vehicles.map((vehicle) => (
                      <article className="feature-list-item" key={vehicle.id}>
                        <strong>{vehicle.vehicleNumber || vehicle.licensePlate || '-'}</strong>
                        <p>{vehicle.make} {vehicle.model} {vehicle.year || ''}</p>
                        <p>Vehicle No: {vehicle.vehicleNumber || '-'} | Plate: {vehicle.licensePlate || '-'}</p>
                        <p>Color: {vehicle.color || '-'} | Type: {vehicle.vehicleType || '-'}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="table-card card">
                <h3 className="staff-card-title card-title">Service History</h3>
                {selectedCustomer.serviceHistory.length === 0 ? (
                  <p className="status-text">No service history found.</p>
                ) : (
                  <div className="feature-list">
                    {selectedCustomer.serviceHistory.map((history) => (
                      <article className="feature-list-item" key={history.id}>
                        <strong>{history.historyType || history.title}</strong>
                        <p>{new Date(history.serviceDate).toLocaleDateString()} | {history.vehicleNumber || history.vehicle || '-'}</p>
                        <p>{history.description || '-'}</p>
                        <p>Title: {history.title || '-'}</p>
                        <p>Amount: {Number(history.amount || 0).toFixed(2)} | Payment: {history.paymentStatus || '-'}</p>
                        <p>Invoice: {history.invoiceNumber || '-'}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="placeholder-card card">
              <p className="placeholder-title">Select a customer</p>
              <p className="placeholder-copy">Customer details, vehicles, and service history will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CustomerLookup;
