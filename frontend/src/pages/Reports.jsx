import React, { useEffect, useMemo, useState } from 'react';
import ReportCards from '../components/ReportCards';
import ReportsChart from '../components/ReportsChart';
import ReportsTable from '../components/ReportsTable';
import {
  extractReportApiError,
  getDailyReports,
  getMonthlyReports,
  getYearlyReports,
} from '../services/reportService';

function normalizeReportRows(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((item) => ({
    date: item.period ?? item.Period ?? '-',
    orders: Number(item.orders ?? item.Orders ?? 0),
    revenue: Number(item.revenue ?? item.Revenue ?? 0),
  }));
}

function getReportFetcher(range) {
  if (range === 'Daily') {
    return getDailyReports;
  }

  if (range === 'Yearly') {
    return getYearlyReports;
  }

  return getMonthlyReports;
}

function Reports() {
  const [selectedRange, setSelectedRange] = useState('Monthly');
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadReportData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const fetchReportsByRange = getReportFetcher(selectedRange);
        const reportsResponse = await fetchReportsByRange();
        if (isMounted) {
          setReportData(normalizeReportRows(reportsResponse));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            extractReportApiError(error, 'Failed to load reports data.')
          );
          setReportData([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadReportData();

    return () => {
      isMounted = false;
    };
  }, [selectedRange]);

  const summaryCards = useMemo(() => {
    const totalRevenue = reportData.reduce(
      (currentTotal, reportRow) => currentTotal + reportRow.revenue,
      0
    );
    const totalOrders = reportData.reduce(
      (currentTotal, reportRow) => currentTotal + reportRow.orders,
      0
    );

    return [
      { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}` },
      { label: 'Total Orders', value: totalOrders.toLocaleString() },
    ];
  }, [reportData]);

  const chartData = useMemo(
    () =>
      reportData.map((reportRow) => ({
        label: reportRow.date,
        revenue: reportRow.revenue,
      })),
    [reportData]
  );

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Reports</h2>
        <p className="section-copy">
          View performance metrics, service trends, and financial summaries.
        </p>
      </div>

      <div className="reports-layout">
        <div className="reports-filter-card card">
          <label className="form-label" htmlFor="report-range">
            Report Range
          </label>
          <select
            id="report-range"
            className="input-field"
            value={selectedRange}
            onChange={(event) => setSelectedRange(event.target.value)}
          >
            <option value="Daily">Daily</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>

        <ReportCards cards={summaryCards} />

        {errorMessage && <div className="message-banner error">{errorMessage}</div>}

        {isLoading ? (
          <p className="status-text">Loading reports data...</p>
        ) : (
          <>
            <ReportsChart data={chartData} />
            <ReportsTable rows={reportData} />
          </>
        )}
      </div>
    </section>
  );
}

export default Reports;
