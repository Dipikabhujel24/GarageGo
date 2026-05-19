import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  extractReportApiError,
  getHighSpenderCustomerReports,
  getPendingCreditCustomerReports,
  getRegularCustomerReports,
} from '../services/reportService';

const reportTabs = [
  {
    key: 'regulars',
    label: 'Regular Customers',
    emptyMessage: 'No regular customer activity found yet.',
    fetchData: getRegularCustomerReports,
    columns: [
      { key: 'name', label: 'Customer' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'totalVisitsServices', label: 'Total Activity' },
    ],
  },
  {
    key: 'highSpenders',
    label: 'High Spenders',
    emptyMessage: 'No spending records found yet.',
    fetchData: getHighSpenderCustomerReports,
    columns: [
      { key: 'name', label: 'Customer' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'totalSpent', label: 'Total Spent', type: 'currency' },
    ],
  },
  {
    key: 'pendingCredits',
    label: 'Pending Credits',
    emptyMessage: 'No pending credits found.',
    fetchData: getPendingCreditCustomerReports,
    columns: [
      { key: 'name', label: 'Customer' },
      { key: 'phone', label: 'Phone' },
      { key: 'email', label: 'Email' },
      { key: 'pendingAmount', label: 'Pending Amount', type: 'currency' },
      { key: 'lastPaymentDate', label: 'Last Payment Date', type: 'date' },
      { key: 'status', label: 'Status' },
    ],
  },
];

function getRowValue(row, column) {
  const value = row[column.key] ?? row[column.key.charAt(0).toUpperCase() + column.key.slice(1)];

  if (column.type === 'currency') {
    return `Rs ${Number(value || 0).toFixed(2)}`;
  }

  if (column.type === 'date') {
    return value ? new Date(value).toLocaleDateString() : '-';
  }

  return value || '-';
}

function CustomerReports() {
  const [activeTab, setActiveTab] = useState(reportTabs[0].key);
  const [reportRows, setReportRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeReport = useMemo(
    () => reportTabs.find((tab) => tab.key === activeTab) || reportTabs[0],
    [activeTab]
  );

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await activeReport.fetchData();
      setReportRows(Array.isArray(response) ? response : []);
    } catch (error) {
      setReportRows([]);
      setErrorMessage(
        extractReportApiError(error, 'Failed to load customer report.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeReport]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <section className="container">
      <div className="page-header-card card customer-report-header">
        <div>
          <h2 className="section-title card-title">Customer Reports</h2>
          <p className="section-copy">
            Review regular customers, top spenders, and customer credit follow-ups.
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={loadReport}
          disabled={isLoading}
        >
          Refresh
        </button>
      </div>

      <div className="customer-report-tabs" role="tablist" aria-label="Customer report types">
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            className={`customer-report-tab ${activeTab === tab.key ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage && <div className="message-banner error">{errorMessage}</div>}

      <div className="table-card card">
        <h3 className="staff-card-title card-title">{activeReport.label}</h3>

        {isLoading ? (
          <p className="status-text">Loading customer report...</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  {activeReport.columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportRows.length === 0 ? (
                  <tr>
                    <td className="empty-state" colSpan={activeReport.columns.length}>
                      {activeReport.emptyMessage}
                    </td>
                  </tr>
                ) : (
                  reportRows.map((row) => (
                    <tr key={row.customerId || row.CustomerId}>
                      {activeReport.columns.map((column) => (
                        <td key={column.key}>{getRowValue(row, column)}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default CustomerReports;
