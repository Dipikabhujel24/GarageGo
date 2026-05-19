import React, { useMemo, useState } from 'react';
import SecureForm from '../components/SecureForm';
import CustomerSelfServiceShell from '../components/Customer/CustomerSelfServiceShell';
import CustomerRequestHistoryTable, {
  formatCustomerRequestDate,
} from '../components/Customer/CustomerRequestHistoryTable';
import RequestStatusBadge from '../components/Customer/RequestStatusBadge';
import { useMyCustomerRequests } from '../hooks/useMyCustomerRequests';
import { requestUnavailablePart } from '../services/customerFeatureService';

const initialPartRequest = {
  partName: '',
  vehicleModel: '',
  description: '',
};

function CustomerPartRequestsPage() {
  const { requests, vehicles, isLoading, error, setError, reload } = useMyCustomerRequests({
    loadVehicles: true,
  });
  const [partRequest, setPartRequest] = useState(initialPartRequest);
  const [message, setMessage] = useState('');

  const vehiclePlaceholder = useMemo(() => {
    const first = vehicles[0];
    if (!first) {
      return 'Enter vehicle model';
    }
    return `${first.make} ${first.model}`;
  }, [vehicles]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await requestUnavailablePart({
        partName: partRequest.partName,
        vehicleModel: partRequest.vehicleModel,
        description: partRequest.description,
      });
      setPartRequest(initialPartRequest);
      setMessage('Unavailable part request submitted successfully.');
      await reload();
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit part request.');
    }
  };

  const partRequests = useMemo(() => requests.partRequests || [], [requests.partRequests]);

  return (
    <CustomerSelfServiceShell
      pageIcon="parts"
      title="Request Unavailable Part"
      subtitle="Tell us which part you need and we will follow up when it becomes available."
      message={message}
      error={error}
      isLoading={isLoading}
      loadingLabel="Loading your part requests..."
    >
      {!isLoading && (
        <div className="customer-self-service-stack">
          <section className="customer-self-service-panel">
            <div className="customer-self-service-panel-head">
              <div>
                <h3>Request Unavailable Part</h3>
                <p>Share the part details and vehicle model for your request.</p>
              </div>
            </div>

            <SecureForm
              className="customer-self-service-form"
              onSubmit={handleSubmit}
              includePassword={false}
            >
              <div className="customer-self-service-form-grid">
                <div>
                  <label className="form-label" htmlFor="part-name">Part Name</label>
                  <input
                    id="part-name"
                    className="input-field"
                    value={partRequest.partName}
                    onChange={(event) =>
                      setPartRequest((previous) => ({ ...previous, partName: event.target.value }))
                    }
                    placeholder="e.g. Brake pads, oil filter"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="vehicle-model">Vehicle Model</label>
                  <input
                    id="vehicle-model"
                    className="input-field"
                    value={partRequest.vehicleModel}
                    onChange={(event) =>
                      setPartRequest((previous) => ({ ...previous, vehicleModel: event.target.value }))
                    }
                    placeholder={vehiclePlaceholder}
                    required
                  />
                </div>

                <div className="form-field-span-full">
                  <label className="form-label" htmlFor="part-description">Description</label>
                  <textarea
                    id="part-description"
                    className="input-field"
                    rows={4}
                    value={partRequest.description}
                    onChange={(event) =>
                      setPartRequest((previous) => ({ ...previous, description: event.target.value }))
                    }
                    placeholder="Part number, brand preference, or urgency notes"
                  />
                </div>

                <div className="customer-self-service-form-actions">
                  <button className="button button-primary feature-submit" type="submit">
                    Submit Request
                  </button>
                </div>
              </div>
            </SecureForm>
          </section>

          <CustomerRequestHistoryTable
            title="Your part requests"
            emptyMessage="No unavailable part requests submitted yet."
            columns={['Submitted', 'Part', 'Vehicle', 'Status']}
            rows={partRequests}
            renderRow={(item) => (
              <tr key={item.id}>
                <td>{formatCustomerRequestDate(item.createdAt)}</td>
                <td>
                  <strong>{item.partName}</strong>
                  {item.description && <p className="table-note">{item.description}</p>}
                </td>
                <td>{item.vehicleModel}</td>
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

export default CustomerPartRequestsPage;
