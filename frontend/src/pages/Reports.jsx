import React, { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaShoppingCart, FaWallet, FaCalendar, FaChartBar } from 'react-icons/fa';
import ReportCards from '../components/ReportCards';
import ReportsChart from '../components/ReportsChart';
import ReportsTable from '../components/ReportsTable';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import {
  extractReportApiError,
  getDailyReports,
  getMonthlyReports,
  getTopSellingParts,
  getYearlyReports,
} from '../services/reportService';
import { isThisWeek, isWithinDateRange } from '../utils/adminFilters';

function normalizeReportRows(payload, selectedRange) {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({
      date: item.period ?? item.Period ?? '-',
      orders: Number(item.orders ?? item.Orders ?? 0),
      revenue: Number(item.revenue ?? item.Revenue ?? 0),
      purchases: Number(item.purchases ?? item.Purchases ?? item.totalPurchases ?? item.TotalPurchases ?? 0),
      profitLoss: Number(item.profitLoss ?? item.ProfitLoss ?? 0),
    }));
  }

  if (payload && typeof payload === 'object') {
    return [
      {
        date: payload.period ?? payload.Period ?? selectedRange,
        orders: Number(payload.orders ?? payload.Orders ?? payload.totalOrders ?? payload.TotalOrders ?? 0),
        revenue: Number(payload.revenue ?? payload.Revenue ?? payload.totalRevenue ?? payload.TotalRevenue ?? 0),
        purchases: Number(payload.purchases ?? payload.Purchases ?? payload.totalPurchases ?? payload.TotalPurchases ?? 0),
        profitLoss: Number(payload.profitLoss ?? payload.ProfitLoss ?? 0),
      },
    ];
  }

  return [];
}

function getReportFetcher(range) {
  if (range === 'Daily' || range === 'Weekly') {
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
  const [topSellingParts, setTopSellingParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadReportData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const fetchReportsByRange = getReportFetcher(selectedRange);
        const [reportsResponse, topPartsResponse] = await Promise.all([
          fetchReportsByRange(),
          getTopSellingParts(),
        ]);
        if (isMounted) {
          setReportData(normalizeReportRows(reportsResponse, selectedRange));
          setTopSellingParts(topPartsResponse || []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            extractReportApiError(error, 'Failed to load reports data.')
          );
          setReportData([]);
          setTopSellingParts([]);
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

  const filteredReportData = useMemo(() => {
    let rows = [...reportData];

    if (selectedRange === 'Weekly') {
      rows = rows.filter((row) => isThisWeek(row.date));
    }

    if (dateFrom || dateTo) {
      rows = rows.filter((row) => isWithinDateRange(row.date, dateFrom, dateTo));
    }

    return rows;
  }, [reportData, selectedRange, dateFrom, dateTo]);

  const handleClearReportFilters = () => {
    setDateFrom('');
    setDateTo('');
  };

  const summaryCards = useMemo(() => {
    const totalRevenue = filteredReportData.reduce(
      (currentTotal, reportRow) => currentTotal + reportRow.revenue,
      0
    );
    const totalOrders = filteredReportData.reduce(
      (currentTotal, reportRow) => currentTotal + reportRow.orders,
      0
    );
    const totalPurchases = filteredReportData.reduce(
      (currentTotal, reportRow) => currentTotal + reportRow.purchases,
      0
    );
    const profitLoss = filteredReportData.reduce(
      (currentTotal, reportRow) => currentTotal + reportRow.profitLoss,
      0
    );

    return [
      {
        label: 'Total Revenue',
        value: `Rs${totalRevenue.toLocaleString()}`,
        description: 'Aggregated across the selected report range.',
        icon: <FaWallet />,
        variant: 'revenue',
      },
      {
        label: 'Total Orders',
        value: totalOrders.toLocaleString(),
        description: 'Number of orders captured in the current range.',
        icon: <FaShoppingCart />,
        variant: 'orders',
      },
      {
        label: 'Profit / Loss',
        value: `Rs${profitLoss.toLocaleString()}`,
        description: `Purchases: Rs${totalPurchases.toLocaleString()}`,
        icon: <FaChartLine />,
        variant: 'trend',
      },
    ];
  }, [filteredReportData]);

  const chartData = useMemo(
    () =>
      filteredReportData.map((reportRow) => ({
        label: reportRow.date,
        revenue: reportRow.revenue,
      })),
    [filteredReportData]
  );

  return (
    <section className="container">
      {/* Modern Report Header */}
      <div className="report-header-section">
        <div className="report-header-content">
          <div className="report-header-text">
            <span className="report-header-eyebrow">Analytics & Performance</span>
            <h2 className="report-header-title">Reports Dashboard</h2>
            <p className="report-header-description">
              Monitor your business performance with key metrics, revenue trends, and sales insights across your selected time range.
            </p>
          </div>
        </div>
      </div>

      <div className="reports-layout">
        {/* Filter Section with Modern Styling */}
        <div className="report-filter-section">
          <div className="report-filter-content">
            <div className="report-filter-group">
              <div className="filter-icon-wrapper">
                <FaCalendar className="filter-icon" />
              </div>
              <div className="filter-input-wrapper">
                <label className="form-label" htmlFor="report-range">
                  Report Range
                </label>
                <select
                  id="report-range"
                  className="report-range-select"
                  value={selectedRange}
                  onChange={(event) => setSelectedRange(event.target.value)}
                >
                  <option value="Daily">Daily</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div className="filter-badge">
              <FaChartBar className="badge-icon" />
              <span>{selectedRange} Report</span>
            </div>
          </div>
        </div>

        {/* Summary Cards Grid */}
        <ReportCards cards={summaryCards} />

        {errorMessage && <div className="message-banner error">{errorMessage}</div>}

        {isLoading ? (
          <div className="report-loading-panel card">
            <div className="loading-spinner"></div>
            <p className="status-text">Loading reports data...</p>
          </div>
        ) : (
          <>
            {/* Charts Section */}
            <div className="report-charts-section">
              <ReportsChart data={chartData} />
            </div>

            {/* Report Details Table */}
            <ReportsTable rows={filteredReportData} />

            {/* Top Selling Parts Section */}
            <article className="report-top-parts-card card">
              <div className="report-section-header">
                <div className="report-section-title-group">
                  <h3 className="report-section-title">Top Selling Parts</h3>
                  <p className="report-section-subtitle">
                    Parts ranked by quantity sold across all recorded sales in this period.
                  </p>
                </div>
                <div className="report-section-badge">
                  <span>{topSellingParts.length}</span> Parts
                </div>
              </div>

              <div className="table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Part Name</th>
                      <th>Quantity Sold</th>
                      <th>Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellingParts.length === 0 ? (
                      <tr>
                        <td className="empty-state" colSpan="3">
                          No part sales found in this period.
                        </td>
                      </tr>
                    ) : (
                      topSellingParts.map((part) => (
                        <tr key={part.partId} className="report-table-row">
                          <td className="part-name-cell">
                            <span className="part-name-badge">{part.partName}</span>
                          </td>
                          <td className="quantity-cell">
                            <span className="quantity-value">{part.quantitySold}</span>
                          </td>
                          <td className="revenue-cell">
                            <strong>Rs{Number(part.revenue || 0).toLocaleString()}</strong>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </>
        )}
      </div>
    </section>
  );
}

export default Reports;
