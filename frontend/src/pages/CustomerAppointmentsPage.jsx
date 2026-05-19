import React, { useEffect, useMemo, useState } from 'react';
import SecureForm from '../components/SecureForm';
import CustomerSelfServiceShell from '../components/Customer/CustomerSelfServiceShell';
import CustomerRequestHistoryTable, {
  formatCustomerRequestDate,
  getVehicleLabel,
} from '../components/Customer/CustomerRequestHistoryTable';
import RequestStatusBadge from '../components/Customer/RequestStatusBadge';
import { useMyCustomerRequests } from '../hooks/useMyCustomerRequests';
import { bookAppointment } from '../services/customerFeatureService';

const initialAppointment = {
  vehicleId: '',
  appointmentDate: '',
  serviceType: '',
  description: '',
};

function CustomerAppointmentsPage() {
  const { requests, vehicles, serviceTypes, isLoading, error, setError, reload } = useMyCustomerRequests({
    loadVehicles: true,
    loadServiceTypes: true,
  });
  const [appointment, setAppointment] = useState(initialAppointment);
  const [message, setMessage] = useState('');
  const [formReady, setFormReady] = useState(false);

  useEffect(() => {
    if (isLoading || formReady) {
      return;
    }

    setAppointment((previous) => ({
      ...previous,
      vehicleId: previous.vehicleId || String(vehicles[0]?.id || ''),
      serviceType: previous.serviceType || serviceTypes[0] || '',
    }));
    setFormReady(true);
  }, [formReady, isLoading, serviceTypes, vehicles]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await bookAppointment({
        vehicleId: Number(appointment.vehicleId),
        appointmentDate: appointment.appointmentDate,
        serviceType: appointment.serviceType,
        description: appointment.description,
      });

      setAppointment({
        ...initialAppointment,
        vehicleId: String(vehicles[0]?.id || ''),
        serviceType: serviceTypes[0] || '',
      });
      setMessage('Appointment booked successfully.');
      await reload();
    } catch (submitError) {
      setError(submitError.message || 'Unable to book appointment.');
    }
  };

  const appointments = useMemo(() => requests.appointments || [], [requests.appointments]);

  return (
    <CustomerSelfServiceShell
      pageIcon="appointments"
      title="Appointments"
      subtitle="Book a service appointment and track your booking status."
      message={message}
      error={error}
      isLoading={isLoading}
      loadingLabel="Loading appointment options..."
    >
      {!isLoading && (
        <div className="customer-self-service-stack">
          <section className="customer-self-service-panel">
            <div className="customer-self-service-panel-head">
              <div>
                <h3>Book Appointment</h3>
                <p>Choose your vehicle, service type, and preferred date.</p>
              </div>
            </div>

            <SecureForm
              className="customer-self-service-form"
              onSubmit={handleSubmit}
              includePassword={false}
            >
              <div className="customer-self-service-form-grid">
                <div>
                  <label className="form-label" htmlFor="appointment-vehicle">Vehicle</label>
                  <select
                    id="appointment-vehicle"
                    className="input-field"
                    value={appointment.vehicleId}
                    onChange={(event) =>
                      setAppointment((previous) => ({ ...previous, vehicleId: event.target.value }))
                    }
                    required
                    disabled={vehicles.length === 0}
                  >
                    <option value="">Select a vehicle</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.make} {vehicle.model} ({vehicle.year})
                        {vehicle.licensePlate ? ` - ${vehicle.licensePlate}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="appointment-date">Date and Time</label>
                  <input
                    id="appointment-date"
                    className="input-field"
                    type="datetime-local"
                    value={appointment.appointmentDate}
                    onChange={(event) =>
                      setAppointment((previous) => ({ ...previous, appointmentDate: event.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="service-type">Service Type</label>
                  <select
                    id="service-type"
                    className="input-field"
                    value={appointment.serviceType}
                    onChange={(event) =>
                      setAppointment((previous) => ({ ...previous, serviceType: event.target.value }))
                    }
                    required
                  >
                    <option value="">Select a service</option>
                    {serviceTypes.map((serviceType) => (
                      <option key={serviceType} value={serviceType}>
                        {serviceType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field-span-full">
                  <label className="form-label" htmlFor="appointment-description">Description</label>
                  <textarea
                    id="appointment-description"
                    className="input-field"
                    rows={4}
                    value={appointment.description}
                    onChange={(event) =>
                      setAppointment((previous) => ({ ...previous, description: event.target.value }))
                    }
                    placeholder="Optional notes for the service team"
                  />
                </div>

                <div className="customer-self-service-form-actions">
                  <button className="button button-primary feature-submit" type="submit" disabled={vehicles.length === 0}>
                    {vehicles.length === 0 ? 'Add a vehicle first' : 'Book Appointment'}
                  </button>
                </div>
              </div>
            </SecureForm>
          </section>

          <CustomerRequestHistoryTable
            title="Your appointments"
            emptyMessage="No appointments booked yet."
            columns={['Date', 'Vehicle', 'Service', 'Status']}
            rows={appointments}
            renderRow={(item) => (
              <tr key={item.id}>
                <td>{formatCustomerRequestDate(item.appointmentDate)}</td>
                <td>{getVehicleLabel(item.vehicle)}</td>
                <td>
                  <strong>{item.serviceType}</strong>
                  {item.description && <p className="table-note">{item.description}</p>}
                </td>
                <td>
                  <RequestStatusBadge status={item.status} />
                </td>
              </tr>
            )}
          />
        </div>
      )}
    </CustomerSelfServiceShell>
  );
}

export default CustomerAppointmentsPage;
