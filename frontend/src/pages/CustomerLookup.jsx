import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import {
  getCustomerDetails,
  searchCustomers,
} from '../services/customerFeatureService';
import {
  getHighSpenderCustomerReports,
  getPendingCreditCustomerReports,
  getRegularCustomerReports,
} from '../services/reportService';
import { matchSearchFields } from '../utils/adminFilters';
import './CustomerLookup.css';

function formatVehicleLabels(customer) {
  const vehicles = customer.vehicles ?? customer.Vehicles ?? [];
  if (vehicles.length > 0) {
    return vehicles
      .map((vehicle) => {
        if (vehicle.displayLabel || vehicle.DisplayLabel) {
          return vehicle.displayLabel || vehicle.DisplayLabel;
        }

        const vehicleNumber = vehicle.vehicleNumber ?? vehicle.VehicleNumber;
        const licensePlate = vehicle.licensePlate ?? vehicle.LicensePlate;
        const make = vehicle.make ?? vehicle.Make;
        const model = vehicle.model ?? vehicle.Model;

        if (vehicleNumber) {
          return licensePlate ? `${vehicleNumber} (${licensePlate})` : vehicleNumber;
        }

        if (licensePlate) {
          return licensePlate;
        }

        return [make, model].filter(Boolean).join(' ').trim();
      })
      .filter(Boolean);
  }

  const numbers = customer.vehicleNumbers ?? customer.VehicleNumbers ?? [];
  return Array.isArray(numbers) ? numbers.filter(Boolean) : [];
}

const SEARCH_FIELDS = [
  { value: 'all', label: 'All fields' },
  { value: 'name', label: 'Customer name' },
  { value: 'phone', label: 'Phone number' },
  { value: 'id', label: 'Customer ID' },
  { value: 'vehicle', label: 'Vehicle number' },
  { value: 'email', label: 'Email' },
];

const customerSearchGetters = {
  name: (customer) => customer.name,
  phone: (customer) => customer.phone,
  id: (customer) => customer.id,
  email: (customer) => customer.email,
  vehicle: (customer) => formatVehicleLabels(customer).join(' '),
};

function CustomerLookup() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [segmentIds, setSegmentIds] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadCustomers = useCallback(async (searchText = '') => {
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSegmentIds = async () => {
      if (segmentFilter === 'all' || segmentFilter === 'recently-added') {
        setSegmentIds(null);
        return;
      }

      try {
        let rows = [];

        if (segmentFilter === 'regular') {
          rows = await getRegularCustomerReports();
        } else if (segmentFilter === 'top-spenders') {
          rows = await getHighSpenderCustomerReports();
        } else if (segmentFilter === 'pending-credits') {
          rows = await getPendingCreditCustomerReports();
        }

        if (!cancelled) {
          const ids = new Set(
            (Array.isArray(rows) ? rows : []).map(
              (row) => row.customerId ?? row.CustomerId ?? row.id ?? row.Id
            )
          );
          setSegmentIds(ids);
        }
      } catch {
        if (!cancelled) {
          setSegmentIds(new Set());
        }
      }
    };

    loadSegmentIds();

    return () => {
      cancelled = true;
    };
  }, [segmentFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const apiQuery = segmentFilter === 'all' ? searchQuery.trim() : '';
      loadCustomers(apiQuery);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery, segmentFilter, loadCustomers]);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    if (segmentIds && segmentIds.size > 0) {
      list = list.filter((customer) => segmentIds.has(customer.id));
    }

    if (segmentFilter === 'recently-added') {
      list = [...list].sort((left, right) => right.id - left.id).slice(0, 20);
    }

    if (searchQuery.trim()) {
      const activeFields = searchField === 'all' ? ['all'] : [searchField];
      list = list.filter((customer) =>
        matchSearchFields(customer, searchQuery, activeFields, customerSearchGetters)
      );
    }

    return list;
  }, [customers, segmentFilter, segmentIds, searchField, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setSegmentFilter('all');
    setSegmentIds(null);
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
    <section className="container customer-lookup-page">
      <div className="page-header-card card customer-lookup-header">
        <div>
          <h2 className="section-title card-title">Customer Lookup</h2>
          <p className="section-copy">
            Search customers by vehicle number, plate, phone, customer ID, or name.
          </p>
        </div>
        <AdminDataToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search customers..."
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchFields={SEARCH_FIELDS}
          selects={[
            {
              id: 'segment',
              label: 'Filter',
              value: segmentFilter,
              onChange: setSegmentFilter,
              options: [
                { value: 'all', label: 'All customers' },
                { value: 'regular', label: 'Regular customers' },
                { value: 'top-spenders', label: 'Top spenders' },
                { value: 'pending-credits', label: 'Pending credits' },
                { value: 'recently-added', label: 'Recently added' },
              ],
            },
          ]}
          onClear={handleClearFilters}
          resultText={`Showing ${filteredCustomers.length} of ${customers.length} loaded customers`}
        />
      </div>

      {message && <div className="message-banner">{message}</div>}

      <div className="customer-lookup-layout">
        <div className="table-card card customer-lookup-table-card">
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
                    <th>Email</th>
                    <th>Vehicles</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td className="empty-state" colSpan="6">
                        No customers match your search or filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>{customer.id}</td>
                        <td>{customer.name}</td>
                        <td>{customer.phone}</td>
                        <td>{customer.email || '—'}</td>
                        <td>
                          {(() => {
                            const labels = formatVehicleLabels(customer);
                            if (labels.length === 0) {
                              return <span className="customer-lookup-vehicle-empty">—</span>;
                            }

                            return (
                              <div className="customer-lookup-vehicles">
                                {labels.map((label, index) => (
                                  <span className="customer-lookup-vehicle-chip" key={`${customer.id}-${label}-${index}`}>
                                    {label}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
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

        <div className="customer-lookup-detail-stack">
          {selectedCustomer ? (
            <>
              <section className="table-card card customer-lookup-detail-card">
                <h3 className="staff-card-title card-title">Customer Details</h3>
                <div className="detail-grid">
                  <p><strong>ID:</strong> {selectedCustomer.id}</p>
                  <p><strong>Name:</strong> {selectedCustomer.name}</p>
                  <p><strong>Email:</strong> {selectedCustomer.email}</p>
                  <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                  <p className="detail-full"><strong>Address:</strong> {selectedCustomer.address || '-'}</p>
                </div>
              </section>

              <section className="table-card card customer-lookup-detail-card">
                <h3 className="staff-card-title card-title">Vehicle Info</h3>
                {(selectedCustomer.vehicles ?? []).length === 0 ? (
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

              <section className="table-card card customer-lookup-detail-card">
                <h3 className="staff-card-title card-title">Service History</h3>
                {(selectedCustomer.serviceHistory ?? []).length === 0 ? (
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
            <div className="placeholder-card card customer-lookup-placeholder">
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
