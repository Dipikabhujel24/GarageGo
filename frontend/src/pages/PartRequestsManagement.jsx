import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import RequestManagePanel from '../components/admin/RequestManagePanel';
import StatusChip from '../components/admin/StatusChip';
import {
  PART_REQUEST_STATUSES,
  getAdminPartRequests,
  updatePartRequestStatus,
} from '../services/adminRequestService';
import { formatDate } from './AppointmentsManagement';
import { matchSearchFields } from '../utils/adminFilters';
import { statusMatchesFilter } from '../utils/statusHelpers';

const partRequestSearchGetters = {
  customer: (request) => request.customerName || `Customer #${request.customerId}`,
  part: (request) => request.partName,
  vehicle: (request) => request.vehicleModel,
};

function PartRequestsManagement() {
  const [partRequests, setPartRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [panelFeedback, setPanelFeedback] = useState(null);

  const loadPartRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getAdminPartRequests();
      setPartRequests(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load part requests.');
      setPartRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartRequests();
  }, [loadPartRequests]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim();

    return partRequests.filter((request) => {
      if (!statusMatchesFilter(request.status, statusFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const fields = searchField === 'all' ? ['all'] : [searchField];
      return matchSearchFields(request, query, fields, partRequestSearchGetters);
    });
  }, [partRequests, searchQuery, searchField, statusFilter]);

  const handleSaveRequest = async ({ status, adminNotes }) => {
    if (!selectedRequest) {
      return;
    }

    setIsSaving(true);
    setPanelFeedback(null);

    try {
      const requestId = selectedRequest.id;
      await updatePartRequestStatus(requestId, { status, adminNotes });
      setSelectedRequest(null);
      await loadPartRequests();
      setPanelFeedback({ type: 'success', message: `Part request #${requestId} updated to ${status}.` });
    } catch (saveError) {
      setPanelFeedback({ type: 'error', message: saveError.message || 'Unable to update part request.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setStatusFilter('all');
  };

  return (
    <section className="appointments-management">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Part Requests Management</h2>
        <p className="section-copy">Approve, order, and fulfill unavailable part requests from customers.</p>
      </div>

      {error && <div className="message-banner error">{error}</div>}
      {panelFeedback && !selectedRequest ? (
        <div className={`message-banner ${panelFeedback.type === 'error' ? 'error' : ''}`}>{panelFeedback.message}</div>
      ) : null}
      {isLoading && <div className="message-banner">Loading part requests...</div>}

      <section className="table-card card">
        <h3 className="staff-card-title card-title">Unavailable Part Requests</h3>

        <AdminDataToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search part requests..."
          searchField={searchField}
          onSearchFieldChange={setSearchField}
          searchFields={[
            { value: 'all', label: 'All fields' },
            { value: 'customer', label: 'Customer name' },
            { value: 'part', label: 'Part name' },
            { value: 'vehicle', label: 'Vehicle model' },
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
                { value: 'ordered', label: 'Ordered' },
                { value: 'available', label: 'Available' },
                { value: 'fulfilled', label: 'Fulfilled' },
              ],
            },
          ]}
          onClear={handleClearFilters}
          resultText={`Showing ${filteredRequests.length} of ${partRequests.length} requests`}
        />

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Customer</th>
                <th>Part</th>
                <th>Vehicle Model</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="6">No part requests match your filters.</td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{formatDate(request.createdAt)}</td>
                    <td>
                      <strong>{request.customerName || `Customer #${request.customerId}`}</strong>
                      {request.customerPhone && <p className="table-note">{request.customerPhone}</p>}
                    </td>
                    <td>
                      <strong>{request.partName}</strong>
                      {request.description && <p className="table-note">{request.description}</p>}
                      {request.adminNotes && (
                        <p className="table-note table-note--admin">Admin: {request.adminNotes}</p>
                      )}
                    </td>
                    <td>{request.vehicleModel}</td>
                    <td>
                      <StatusChip label={request.status || 'Pending'} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button button-primary inventory-action-button"
                        onClick={() => {
                          setPanelFeedback(null);
                          setSelectedRequest(request);
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
        title="Manage part request"
        record={selectedRequest}
        statusOptions={PART_REQUEST_STATUSES}
        isSaving={isSaving}
        feedback={panelFeedback && selectedRequest ? panelFeedback : null}
        onClose={() => setSelectedRequest(null)}
        onSave={handleSaveRequest}
        renderDetails={(record) => (
          <div className="request-manage-panel__details">
            <p><strong>Customer:</strong> {record.customerName}</p>
            <p><strong>Email:</strong> {record.customerEmail || '—'}</p>
            <p><strong>Part:</strong> {record.partName}</p>
            <p><strong>Vehicle:</strong> {record.vehicleModel}</p>
            {record.description ? <p><strong>Customer notes:</strong> {record.description}</p> : null}
          </div>
        )}
      />
    </section>
  );
}

export default PartRequestsManagement;
