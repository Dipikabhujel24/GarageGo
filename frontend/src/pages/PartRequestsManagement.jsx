import React from 'react';
import { formatDate, useManagementRequests } from './AppointmentsManagement';

function PartRequestsManagement() {
  const { requests, isLoading, error } = useManagementRequests();

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
              {requests.partRequests.length === 0 ? (
                <tr>
                  <td className="empty-state" colSpan="5">No unavailable part requests submitted yet.</td>
                </tr>
              ) : (
                requests.partRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{formatDate(request.createdAt)}</td>
                    <td>{request.customerName || `Customer #${request.customerId}`}</td>
                    <td>
                      <strong>{request.partName}</strong>
                      {request.description && <p className="table-note">{request.description}</p>}
                    </td>
                    <td>{request.vehicleModel}</td>
                    <td>{request.status}</td>
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
