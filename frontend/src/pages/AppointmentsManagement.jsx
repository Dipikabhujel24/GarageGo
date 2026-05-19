import React, { useEffect, useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import StatusChip from '../components/admin/StatusChip';
import { getAllRequests } from '../services/customerFeatureService';
import {
  isWithinDateRange,
  matchSearchFields,
} from '../utils/adminFilters';

const emptyRequests = {
  appointments: [],
  partRequests: [],
  serviceReviews: [],
};

export function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getVehicleLabel(vehicle) {
  if (!vehicle) {
    return 'Vehicle details unavailable';
  }

  const title = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const identifier = vehicle.vehicleNumber || vehicle.licensePlate;

  return identifier ? `${title} (${identifier})` : title || 'Vehicle details unavailable';
}

export function useManagementRequests() {
  const [requests, setRequests] = useState(emptyRequests);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRequests = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await getAllRequests();

        if (!isMounted) {
          return;
        }

        setRequests({
          appointments: Array.isArray(data?.appointments) ? data.appointments : [],
          partRequests: Array.isArray(data?.partRequests) ? data.partRequests : [],
          serviceReviews: Array.isArray(data?.serviceReviews) ? data.serviceReviews : [],
        });
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load management data.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  return { requests, isLoading, error };
}

const appointmentSearchGetters = {
  customer: (appointment) => appointment.customerName || `Customer #${appointment.customerId}`,
  vehicle: (appointment) => getVehicleLabel(appointment.vehicle),
  service: (appointment) => appointment.serviceType,
};

function AppointmentsManagement() {
  const { requests, isLoading, error } = useManagementRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim();

    return requests.appointments.filter((appointment) => {
      const status = String(appointment.status || '').toLowerCase();

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      if (!isWithinDateRange(appointment.appointmentDate, dateFrom, dateTo)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const fields = searchField === 'all' ? ['all'] : [searchField];
      return matchSearchFields(appointment, query, fields, appointmentSearchGetters);
    });
  }, [requests.appointments, searchQuery, searchField, statusFilter, dateFrom, dateTo]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <section className="appointments-management">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Appointments Management</h2>
        <p className="section-copy">Review all customer appointments.</p>
      </div>

      {error && <div className="message-banner error">{error}</div>}
      {isLoading && <div className="message-banner">Loading appointments...</div>}

      <section className="table-card card">
        <h3 className="staff-card-title card-title">Appointments</h3>

        <AdminDataToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search appointments..."
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchFields={[
            { value: 'all', label: 'All fields' },
            { value: 'customer', label: 'Customer name' },
            { value: 'vehicle', label: 'Vehicle number' },
            { value: 'service', label: 'Service type' },
          ]}
          selects={[
            {
              id: 'status',
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ],
            },
          ]}
          showDateRange
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={handleClearFilters}
          resultText={`Showing ${filteredAppointments.length} of ${requests.appointments.length} appointments`}
        />

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="5">No appointments match your filters.</td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{formatDate(appointment.appointmentDate)}</td>
                    <td>{appointment.customerName || `Customer #${appointment.customerId}`}</td>
                    <td>{getVehicleLabel(appointment.vehicle)}</td>
                    <td>
                      <strong>{appointment.serviceType}</strong>
                      {appointment.description && <p className="table-note">{appointment.description}</p>}
                    </td>
                    <td>
                      <StatusChip label={appointment.status || 'Pending'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default AppointmentsManagement;
