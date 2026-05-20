import React from 'react';
import { FaTable } from 'react-icons/fa';

function ReportsTable({ rows }) {
  return (
    <article className="report-details-card card">
      {/* Table Header Section */}
      <div className="report-table-header">
        <div className="report-table-title-group">
          <div className="report-table-icon">
            <FaTable />
          </div>
          <div className="report-table-text">
            <h3 className="report-table-title">Report Details</h3>
            <p className="report-table-subtitle">
              Detailed breakdown of metrics including orders, revenue, purchases, and profit/loss.
            </p>
          </div>
        </div>
        <div className="report-table-count">
          <span className="count-badge">{rows.length}</span> Records
        </div>
      </div>

      {/* Table Container */}
      <div className="report-table-container">
        <table className="report-table report-detail-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Purchases</th>
              <th>Profit / Loss</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">
                  No report data found for the selected period.
                </td>
              </tr>
            ) : (
              rows.map((reportRow) => (
                <tr key={reportRow.date} className="report-table-row">
                  <td className="date-cell"><strong>{reportRow.date}</strong></td>
                  <td className="orders-cell">{reportRow.orders}</td>
                  <td className="revenue-cell"><strong>Rs{reportRow.revenue.toLocaleString()}</strong></td>
                  <td className="purchases-cell">Rs{Number(reportRow.purchases || 0).toLocaleString()}</td>
                  <td className={`profit-cell ${Number(reportRow.profitLoss || 0) >= 0 ? 'positive' : 'negative'}`}>
                    <strong>Rs{Number(reportRow.profitLoss || 0).toLocaleString()}</strong>
                  </td>
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
