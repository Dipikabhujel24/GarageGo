import React from 'react';

function ReportsTable({ rows }) {
  return (
    <article className="table-card card">
      <div className="chart-header">
        <h3 className="chart-title card-title">Report Details</h3>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="3" className="empty-state">
                  No report data found.
                </td>
              </tr>
            ) : (
              rows.map((reportRow) => (
                <tr key={reportRow.date}>
                  <td>{reportRow.date}</td>
                  <td>{reportRow.orders}</td>
                  <td>${reportRow.revenue.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default ReportsTable;
