import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  extractReportApiError,
  getMonthlyReports,
} from '../services/reportService';

// Convert API responses (array or single object) into a consistent chart row format
function normalizeReportPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.map((item) => ({
      label: item.period ?? item.Period ?? item.date ?? item.Date ?? '-',
      revenue: Number(item.revenue ?? item.Revenue ?? item.totalRevenue ?? item.TotalRevenue ?? 0),
      orders: Number(item.orders ?? item.Orders ?? item.totalOrders ?? item.TotalOrders ?? 0),
    }));
  }

  if (payload && typeof payload === 'object') {
    return [
      {
        label: 'Monthly',
        revenue: Number(payload.totalRevenue ?? payload.TotalRevenue ?? 0),
        orders: Number(payload.totalOrders ?? payload.TotalOrders ?? 0),
      },
    ];
  }

  return [];
}

// Format numeric value as currency string
function formatCurrency(value) {
  return `$${Number(value).toLocaleString()}`;
}

function Dashboard() {
  // --- component state ---
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Load monthly reports from the API on mount.
  // Uses a mounted flag to avoid state updates after unmount.
  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const monthlyReports = await getMonthlyReports();
        const normalizedRows = normalizeReportPayload(monthlyReports);

        if (isMounted) setChartData(normalizedRows);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            extractReportApiError(error, 'Failed to load dashboard data.')
          );
          setChartData([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, []);

  const derivedSummaryCards = useMemo(() => {
    const totalRevenue = chartData.reduce(
      (runningTotal, reportRow) => runningTotal + reportRow.revenue,
      0
    );
    const totalOrders = chartData.reduce(
      (runningTotal, reportRow) => runningTotal + reportRow.orders,
      0
    );
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return [
      { label: 'Total Revenue', value: formatCurrency(totalRevenue) },
      { label: 'Total Sales', value: totalOrders.toLocaleString() },
      { label: 'Average Sale Value', value: formatCurrency(averageOrderValue) },
    ];
  }, [chartData]);

  const chartSeries = chartData.map((item) => ({
    ...item,
    revenue: Number(item.revenue),
  }));

  function formatNumber(value) {
    return Number(value).toLocaleString();
  }

  const chartTooltipFormatter = (value) => [`$${formatNumber(value)}`, 'Revenue'];

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Admin Dashboard</h2>
        <p className="section-copy">
          Review revenue, sales, and operational performance from the GarageGo admin workspace.
        </p>
      </div>

      {errorMessage && <div className="message-banner error">{errorMessage}</div>}

      {isLoading ? (
        <p className="status-text">Loading...</p>
      ) : (
        <>
          <div className="stats-grid">
            {derivedSummaryCards.map((summaryCard) => (
              <article key={summaryCard.label} className="stat-card card">
                <p className="stat-label">{summaryCard.label}</p>
                <p className="stat-value">{summaryCard.value}</p>
              </article>
            ))}
          </div>

          <div className="dashboard-chart-section">
            <article className="chart-card card">
              <div className="chart-header">
                <h3 className="chart-title card-title">Revenue Overview</h3>
              </div>

              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={chartSeries}
                    margin={{ top: 10, right: 24, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#E3EAF5" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="label"
                      stroke="#1F2A44"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#1F2A44"
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={formatNumber}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E3EAF5',
                        borderRadius: '12px',
                        color: '#1F2A44',
                        boxShadow: '0 12px 24px rgba(42, 82, 152, 0.12)',
                      }}
                      labelStyle={{ color: '#1F2A44', fontWeight: 700 }}
                      formatter={chartTooltipFormatter}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#87A8DC"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#87A8DC', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#2A5298' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}

export default Dashboard;
