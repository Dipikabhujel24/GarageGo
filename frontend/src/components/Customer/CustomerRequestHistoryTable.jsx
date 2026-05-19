import React from 'react';
import { formatCustomerRequestDate } from '../../hooks/useMyCustomerRequests';

function getVehicleLabel(vehicle) {
  if (!vehicle) {
    return '—';
  }

  const parts = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const plate = vehicle.licensePlate ? ` (${vehicle.licensePlate})` : '';
  return `${parts}${plate}`.trim() || '—';
}

function CustomerRequestHistoryTable({ title, emptyMessage, columns, rows, renderRow }) {
  return (
    <section className="table-card card customer-self-service-history">
      <h3 className="staff-card-title card-title">{title}</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="empty-state" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => renderRow(row))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { formatCustomerRequestDate, getVehicleLabel };
export default CustomerRequestHistoryTable;
