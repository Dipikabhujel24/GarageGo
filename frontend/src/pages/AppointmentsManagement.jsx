import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import RequestManagePanel from '../components/admin/RequestManagePanel';
import StatusChip from '../components/admin/StatusChip';
import {
  APPOINTMENT_STATUSES,
  getAdminAppointments,
  updateAppointmentStatus,
} from '../services/adminRequestService';
import {
  isWithinDateRange,
  matchSearchFields,
} from '../utils/adminFilters';
import { statusMatchesFilter } from '../utils/statusHelpers';

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
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRequests = async () => {
      setIsLoading(true);
      setError('');

      try {
        const { getAllRequests } = await import('../services/customerFeatureService');
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
  }, [reloadToken]);

  return { requests, isLoading, error, reload };
}

const appointmentSearchGetters = {
  customer: (appointment) => appointment.customerName || `Customer #${appointment.customerId}`,
  vehicle: (appointment) => getVehicleLabel(appointment.vehicle),
  service: (appointment) => appointment.serviceType,
};

function AppointmentsManagement() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getAdminAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load appointments.');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim();

    return appointments.filter((appointment) => {
      if (!statusMatchesFilter(appointment.status, statusFilter)) {
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
  }, [appointments, searchQuery, searchField, statusFilter, dateFrom, dateTo]);

  const handleSaveAppointment = async ({ status, adminNotes }) => {
    if (!selectedAppointment) {
      return;
    }

    setIsSaving(true);
    setPanelFeedback(null);

    try {
      const appointmentId = selectedAppointment.id;
      await updateAppointmentStatus(appointmentId, {
        status,
        adminNotes,
      });
      setSelectedAppointment(null);
      await loadAppointments();
      setPanelFeedback({ type: 'success', message: `Appointment #${appointmentId} updated to ${status}.` });
    } catch (saveError) {
      setPanelFeedback({ type: 'error', message: saveError.message || 'Unable to update appointment.' });
    } finally {
      setIsSaving(false);
    }
  };

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
        <p className="section-copy">Review, approve, and manage customer appointment requests.</p>
      </div>

      {error && <div className="message-banner error">{error}</div>}
      {panelFeedback && !selectedAppointment ? (
        <div className={`message-banner ${panelFeedback.type === 'error' ? 'error' : ''}`}>{panelFeedback.message}</div>
      ) : null}
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
                { value: 'rejected', label: 'Rejected' },
                { value: 'in-progress', label: 'In Progress' },
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
          resultText={`Showing ${filteredAppointments.length} of ${appointments.length} appointments`}
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
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="7">No appointments match your filters.</td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{formatDate(appointment.appointmentDate)}</td>
                    <td>
                      <strong>{appointment.customerName || `Customer #${appointment.customerId}`}</strong>
                      {appointment.customerPhone && <p className="table-note">{appointment.customerPhone}</p>}
                    </td>
                    <td>{getVehicleLabel(appointment.vehicle)}</td>
                    <td>
                      <strong>{appointment.serviceType}</strong>
                      {appointment.description && <p className="table-note">{appointment.description}</p>}
                      {appointment.adminNotes && (
                        <p className="table-note table-note--admin">Admin: {appointment.adminNotes}</p>
                      )}
                    </td>
                    <td>
                      <StatusChip label={appointment.status || 'Pending'} />
                    </td>
                    <td>{formatDate(appointment.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="button button-primary inventory-action-button"
                        onClick={() => {
                          setPanelFeedback(null);
                          setSelectedAppointment(appointment);
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <RequestManagePanel
        title="Manage appointment"
        record={selectedAppointment}
        statusOptions={APPOINTMENT_STATUSES}
        isSaving={isSaving}
        feedback={panelFeedback && selectedAppointment ? panelFeedback : null}
        onClose={() => setSelectedAppointment(null)}
        onSave={handleSaveAppointment}
        renderDetails={(record) => (
          <div className="request-manage-panel__details">
            <p><strong>Customer:</strong> {record.customerName}</p>
            <p><strong>Email:</strong> {record.customerEmail || '—'}</p>
            <p><strong>Vehicle:</strong> {getVehicleLabel(record.vehicle)}</p>
            <p><strong>Service:</strong> {record.serviceType}</p>
            <p><strong>Scheduled:</strong> {formatDate(record.appointmentDate)}</p>
            {record.description ? <p><strong>Customer notes:</strong> {record.description}</p> : null}
          </div>
        )}
      />
    </section>
  );
}

export default AppointmentsManagement;
