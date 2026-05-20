import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  extractReportApiError,
  exportPendingCreditsCsv,
  exportPendingCreditsPdf,
  getCustomerReportsSummary,
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
      { key: 'totalOrders', label: 'Orders' },
      { key: 'totalVisits', label: 'Visits' },
      { key: 'lastPurchaseDate', label: 'Last Purchase', type: 'date' },
      { key: 'totalSpent', label: 'Total Spent', type: 'currency' },
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
      { key: 'totalPurchases', label: 'Purchases' },
      { key: 'loyaltyPoints', label: 'Loyalty Points' },
    ],
  },
  {
    key: 'pendingCredits',
    label: 'Pending Credits',
    emptyMessage: 'No pending credits found.',
    fetchData: getPendingCreditCustomerReports,
    columns: [
      { key: 'customerName', label: 'Customer' },
      { key: 'invoiceNumber', label: 'Invoice' },
      { key: 'remainingAmount', label: 'Balance', type: 'currency' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'daysOverdue', label: 'Days Overdue' },
      { key: 'paymentStatus', label: 'Status', type: 'status' },
      { key: 'reminderCount', label: 'Reminders' },
    ],
  },
];

function getRowValue(row, column) {
  const camel = column.key;
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  const value = row[camel] ?? row[pascal];

  if (column.type === 'currency') {
    return `Rs ${Number(value || 0).toFixed(2)}`;
  }

  if (column.type === 'date') {
    return value ? new Date(value).toLocaleDateString() : '-';
  }

  if (column.type === 'status') {
    return value || '-';
  }

  return value ?? '-';
}

function paymentStatusClass(status, isOverdue) {
  const normalized = String(status || '').toLowerCase();
  if (isOverdue) {
    return 'status-badge status-badge--overdue';
  }

  if (normalized === 'paid') {
    return 'status-badge status-badge--paid';
  }

  if (normalized === 'partial') {
    return 'status-badge status-badge--partial';
  }

  return 'status-badge status-badge--credit';
}

function CustomerReports() {
  const [activeTab, setActiveTab] = useState(reportTabs[0].key);
  const [reportRows, setReportRows] = useState([]);
  const [summary, setSummary] = useState(null);
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
      const [response, summaryResponse] = await Promise.all([
        activeReport.fetchData(),
        getCustomerReportsSummary().catch(() => null),
      ]);
      setReportRows(Array.isArray(response) ? response : []);
      setSummary(summaryResponse);
    } catch (error) {
      setReportRows([]);
      setSummary(null);
      setErrorMessage(extractReportApiError(error, 'Failed to load customer report.'));
    } finally {
      setIsLoading(false);
    }
  }, [activeReport]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExportCsv = async () => {
    try {
      await exportPendingCreditsCsv();
    } catch (error) {
      setErrorMessage(extractReportApiError(error, 'CSV export failed.'));
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportPendingCreditsPdf();
    } catch (error) {
      setErrorMessage(extractReportApiError(error, 'PDF export failed.'));
    }
  };

  return (
    <section className="container">
      <div className="page-header-card card customer-report-header">
        <div>
          <h2 className="section-title card-title">Customer Reports</h2>
          <p className="section-copy">
            Review regular customers, top spenders, and open credit balances.
          </p>
        </div>
        <button className="button button-primary" type="button" onClick={loadReport} disabled={isLoading}>
          Refresh
        </button>
      </div>

      {summary && (
        <div className="customer-report-summary-grid">
          <article className="summary-card">
            <span>Pending Credit</span>
            <strong>Rs {Number(summary.totalPendingCredit || 0).toFixed(2)}</strong>
          </article>
          <article className="summary-card">
            <span>Credit Invoices</span>
            <strong>{summary.totalCreditInvoices ?? 0}</strong>
          </article>
          <article className="summary-card">
            <span>Overdue Customers</span>
            <strong>{summary.totalOverdueCustomers ?? 0}</strong>
          </article>
          <article className="summary-card">
            <span>Top Customer</span>
            <strong>{summary.topCustomerName || '—'}</strong>
          </article>
          <article className="summary-card">
            <span>Monthly Revenue</span>
            <strong>Rs {Number(summary.monthlyRevenue || 0).toFixed(2)}</strong>
          </article>
        </div>
      )}

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

      {activeTab === 'pendingCredits' && (
        <div className="customer-report-export-actions">
          <button className="button button-secondary" type="button" onClick={handleExportCsv}>
            Export CSV
          </button>
          <button className="button button-secondary" type="button" onClick={handleExportPdf}>
            Export PDF
          </button>
        </div>
      )}

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
                  reportRows.map((row) => {
                    const rowKey = row.saleId || row.customerId || row.CustomerId;
                    const isOverdue = row.isOverdue || row.IsOverdue;

                    return (
                      <tr key={rowKey} className={isOverdue ? 'row-overdue' : ''}>
                        {activeReport.columns.map((column) => (
                          <td key={column.key}>
                            {column.type === 'status' ? (
                              <span className={paymentStatusClass(getRowValue(row, column), isOverdue)}>
                                {getRowValue(row, column)}
                              </span>
                            ) : (
                              getRowValue(row, column)
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
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
