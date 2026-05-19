import React, { useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import StatusChip from '../components/admin/StatusChip';
import { formatDate, useManagementRequests } from './AppointmentsManagement';
import { matchSearchFields } from '../utils/adminFilters';

const partRequestSearchGetters = {
  customer: (request) => request.customerName || `Customer #${request.customerId}`,
  part: (request) => request.partName,
  vehicle: (request) => request.vehicleModel,
};

function isUrgentRequest(request) {
  const status = String(request.status || '').toLowerCase();
  if (status !== 'pending') {
    return false;
  }

  const createdAt = new Date(request.createdAt || 0);
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const description = String(request.description || '').toLowerCase();

  return createdAt.getTime() >= threeDaysAgo || description.includes('urgent');
}

function PartRequestsManagement() {
  const { requests, isLoading, error } = useManagementRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim();

    return requests.partRequests.filter((request) => {
      const status = String(request.status || '').toLowerCase();

      if (statusFilter === 'pending' && status !== 'pending') {
        return false;
      }

      if (statusFilter === 'fulfilled' && status !== 'fulfilled') {
        return false;
      }

      if (statusFilter === 'urgent' && !isUrgentRequest(request)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const fields = searchField === 'all' ? ['all'] : [searchField];
      return matchSearchFields(request, query, fields, partRequestSearchGetters);
    });
  }, [requests.partRequests, searchQuery, searchField, statusFilter]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setStatusFilter('all');
  };

  return (
    <section className="appointments-management">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Part Requests Management</h2>
        <p className="section-copy">Review unavailable part requests submitted by customers.</p>
      </div>

      {error && <div className="message-banner error">{error}</div>}
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
              label: 'Filter',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All requests' },
                { value: 'pending', label: 'Pending requests' },
                { value: 'fulfilled', label: 'Fulfilled requests' },
                { value: 'urgent', label: 'Urgent requests' },
              ],
            },
          ]}
          onClear={handleClearFilters}
          resultText={`Showing ${filteredRequests.length} of ${requests.partRequests.length} requests`}
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
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="5">No part requests match your filters.</td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{formatDate(request.createdAt)}</td>
                    <td>{request.customerName || `Customer #${request.customerId}`}</td>
                    <td>
                      <strong>{request.partName}</strong>
                      {request.description && <p className="table-note">{request.description}</p>}
                    </td>
                    <td>{request.vehicleModel}</td>
                    <td>
                      <StatusChip
                        label={isUrgentRequest(request) ? 'Urgent' : request.status || 'Pending'}
                        tone={isUrgentRequest(request) ? 'danger' : undefined}
                      />
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

export default PartRequestsManagement;
