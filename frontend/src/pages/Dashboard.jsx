import React, { useEffect, useMemo, useState } from 'react';
import {
  FaArrowUp,
  FaBoxOpen,
  FaCalendarAlt,
  FaChartLine,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaTools,
  FaTruck,
  FaUserShield,
  FaUsers,
  FaWarehouse,
} from 'react-icons/fa';
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
  getDashboardMetrics,
  getMonthlyReports,
} from '../services/reportService';
import { getParts } from '../services/api';
import { getStoredAuthUser } from '../utils/authSession';

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
  return `Rs${Number(value).toLocaleString()}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

const metricIconMap = {
  'Total Sales': FaFileInvoiceDollar,
  'Monthly Revenue': FaArrowUp,
  'Total Customers': FaUsers,
  'Total Staff': FaUserShield,
  'Total Vendors': FaTruck,
  'Total Parts': FaWarehouse,
  'Low Stock Items': FaExclamationTriangle,
  'Pending Credits': FaClipboardCheck,
  'Total Revenue': FaChartLine,
  'Average Sale Value': FaFileInvoiceDollar,
};

function Dashboard() {
  const [chartData, setChartData] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [parts, setParts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const user = getStoredAuthUser();

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [monthlyReports, dashboardMetrics, partsResponse] = await Promise.all([
          getMonthlyReports(),
          getDashboardMetrics(),
          getParts(),
        ]);
        const normalizedRows = normalizeReportPayload(monthlyReports);

        if (isMounted) {
          setChartData(normalizedRows);
          setMetrics(dashboardMetrics);
          setParts(partsResponse.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            extractReportApiError(error, 'Failed to load dashboard data.')
          );
          setChartData([]);
          setMetrics(null);
          setParts([]);
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

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 60000);

    return () => window.clearInterval(timerId);
  }, []);

  const derivedSummaryCards = useMemo(() => {
    if (metrics) {
      return [
        { label: 'Total Sales', value: formatCurrency(metrics.totalSales ?? 0), tone: 'revenue' },
        { label: 'Monthly Revenue', value: formatCurrency(metrics.monthlyRevenue ?? 0), tone: 'growth' },
        { label: 'Total Customers', value: formatNumber(metrics.totalCustomers), tone: 'people' },
        { label: 'Total Staff', value: formatNumber(metrics.totalStaff), tone: 'staff' },
        { label: 'Total Vendors', value: formatNumber(metrics.totalVendors), tone: 'vendor' },
        { label: 'Total Parts', value: formatNumber(metrics.totalParts), tone: 'parts' },
        { label: 'Low Stock Items', value: formatNumber(metrics.lowStockItems), tone: 'warning' },
        { label: 'Pending Credits', value: formatCurrency(metrics.pendingCredits ?? 0), tone: 'credit' },
      ];
    }

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
      { label: 'Total Revenue', value: formatCurrency(totalRevenue), tone: 'revenue' },
      { label: 'Total Sales', value: totalOrders.toLocaleString(), tone: 'growth' },
      { label: 'Average Sale Value', value: formatCurrency(averageOrderValue), tone: 'credit' },
    ];
  }, [chartData, metrics]);

  const chartSeries = useMemo(
    () =>
      chartData.map((item) => ({
        ...item,
        revenue: Number(item.revenue),
      })),
    [chartData]
  );

  const lowStockParts = useMemo(
    () =>
      parts
        .filter((part) => Number(part.quantity || 0) < 10)
        .sort((first, second) => Number(first.quantity || 0) - Number(second.quantity || 0))
        .slice(0, 4),
    [parts]
  );

  const quickStats = useMemo(
    () => [
      {
        label: 'Monthly orders',
        value: formatNumber(chartData.reduce((total, item) => total + Number(item.orders || 0), 0)),
      },
      {
        label: 'Inventory health',
        value: `${Math.max(0, parts.length - lowStockParts.length)}/${parts.length || 0}`,
      },
      {
        label: 'Avg sale value',
        value:
          chartData.reduce((total, item) => total + Number(item.orders || 0), 0) > 0
            ? formatCurrency(
                chartData.reduce((total, item) => total + Number(item.revenue || 0), 0) /
                  chartData.reduce((total, item) => total + Number(item.orders || 0), 0)
              )
            : formatCurrency(0),
      },
    ],
    [chartData, lowStockParts.length, parts.length]
  );

  const activityItems = useMemo(
    () => [
      {
        title: 'Revenue data refreshed',
        description: `${chartData.length || 0} report period${chartData.length === 1 ? '' : 's'} loaded`,
      },
      {
        title: 'Inventory scan complete',
        description: `${lowStockParts.length} low stock item${lowStockParts.length === 1 ? '' : 's'} flagged`,
      },
      {
        title: 'Admin workspace ready',
        description: 'Dashboard metrics are synced with the backend API',
      },
    ],
    [chartData.length, lowStockParts.length]
  );

  const chartTooltipFormatter = (value) => [`Rs${formatNumber(value)}`, 'Revenue'];

  return (
    <section className="container admin-dashboard">
      <header className="admin-dashboard-hero">
        <div className="admin-dashboard-hero-copy">
          <span className="admin-dashboard-kicker">GarageGo Admin</span>
          <h2>{user?.name || 'GarageGo Administrator'}</h2>
          <p>
            Monitor revenue, stock, customers, and staff operations from one polished workspace.
          </p>
        </div>

        <div className="admin-profile-card" aria-label="Admin profile summary">
          <div className="admin-profile-avatar">{(user?.name || 'Admin').slice(0, 2).toUpperCase()}</div>
          <div>
            <strong>{user?.name || 'GarageGo Admin'}</strong>
            <span>{user?.role || 'Admin'}</span>
          </div>
          <div className="admin-profile-time">
            <FaCalendarAlt />
            <span>{formatDateTime(currentTime)}</span>
          </div>
        </div>
      </header>

      {errorMessage && <div className="message-banner error">{errorMessage}</div>}

      {isLoading ? (
        <div className="admin-dashboard-loading card">
          <p className="status-text">Loading admin dashboard...</p>
        </div>
      ) : (
        <>
          <section className="admin-metric-grid" aria-label="Admin overview metrics">
            {derivedSummaryCards.map((summaryCard, index) => {
              const Icon = metricIconMap[summaryCard.label] || FaChartLine;

              return (
                <article
                  key={summaryCard.label}
                  className={`admin-metric-card admin-metric-card--${summaryCard.tone || 'default'}`}
                  style={{ '--metric-index': index }}
                >
                  <div className="admin-metric-icon">
                    <Icon />
                  </div>
                  <div>
                    <p>{summaryCard.label}</p>
                    <strong>{summaryCard.value}</strong>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="admin-dashboard-main-grid">
            <article className="admin-chart-card card">
              <div className="admin-widget-header">
                <div>
                  <span className="admin-dashboard-kicker">Analytics</span>
                  <h3>Revenue Overview</h3>
                  <p>Track revenue movement across the current report range.</p>
                </div>
                <div className="admin-chart-badge">
                  <FaChartLine />
                  <span>Live API</span>
                </div>
              </div>

              <div className="admin-chart-wrap">
                <ResponsiveContainer width="100%" height={330}>
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
                        border: '1px solid #D9E6F8',
                        borderRadius: '14px',
                        color: '#1F2A44',
                        boxShadow: '0 18px 36px rgba(42, 82, 152, 0.16)',
                      }}
                      labelStyle={{ color: '#1F2A44', fontWeight: 800 }}
                      formatter={chartTooltipFormatter}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2A5298"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#87A8DC', strokeWidth: 0 }}
                      activeDot={{ r: 7, fill: '#1E3C72', stroke: '#FFFFFF', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <aside className="admin-side-widgets">
              <article className="admin-widget-card card">
                <div className="admin-widget-header compact">
                  <div>
                    <span className="admin-dashboard-kicker">Quick Stats</span>
                    <h3>Today at a glance</h3>
                  </div>
                  <FaTools />
                </div>
                <div className="admin-quick-stat-list">
                  {quickStats.map((item) => (
                    <div key={item.label} className="admin-quick-stat">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="admin-widget-card card">
                <div className="admin-widget-header compact">
                  <div>
                    <span className="admin-dashboard-kicker">System Summary</span>
                    <h3>Operations health</h3>
                  </div>
                  <FaBoxOpen />
                </div>
                <div className="admin-system-summary">
                  <div>
                    <span>Inventory records</span>
                    <strong>{formatNumber(parts.length)}</strong>
                  </div>
                  <div>
                    <span>Stock alerts</span>
                    <strong>{formatNumber(lowStockParts.length)}</strong>
                  </div>
                  <div>
                    <span>Pending credits</span>
                    <strong>{formatCurrency(metrics?.pendingCredits ?? 0)}</strong>
                  </div>
                </div>
              </article>
            </aside>
          </section>

          <section className="admin-dashboard-widget-grid">
            <article className="admin-widget-card card">
              <div className="admin-widget-header">
                <div>
                  <span className="admin-dashboard-kicker">Inventory</span>
                  <h3>Low Stock Warnings</h3>
                  <p>Parts below 10 units are highlighted for follow-up.</p>
                </div>
                <FaExclamationTriangle />
              </div>

              {lowStockParts.length === 0 ? (
                <p className="admin-empty-note">Inventory levels look healthy right now.</p>
              ) : (
                <div className="admin-low-stock-list">
                  {lowStockParts.map((part) => (
                    <div key={part.id} className="admin-low-stock-item">
                      <div>
                        <strong>{part.partName}</strong>
                        <span>{part.category || 'Inventory part'}</span>
                      </div>
                      <em>{part.quantity}</em>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="admin-widget-card card">
              <div className="admin-widget-header">
                <div>
                  <span className="admin-dashboard-kicker">Activity</span>
                  <h3>Recent Admin Signals</h3>
                  <p>Operational events generated from current dashboard data.</p>
                </div>
                <FaClipboardCheck />
              </div>
              <div className="admin-activity-list">
                {activityItems.map((item) => (
                  <div key={item.title} className="admin-activity-item">
                    <span />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-widget-card admin-mini-analytics-card card">
              <div className="admin-widget-header">
                <div>
                  <span className="admin-dashboard-kicker">Mini Analytics</span>
                  <h3>Performance Snapshot</h3>
                  <p>Compact view of sales, stock, and service attention.</p>
                </div>
                <FaChartLine />
              </div>
              <div className="admin-mini-analytics">
                <div>
                  <span>Revenue periods</span>
                  <strong>{formatNumber(chartSeries.length)}</strong>
                </div>
                <div>
                  <span>Low stock rate</span>
                  <strong>{parts.length ? `${Math.round((lowStockParts.length / parts.length) * 100)}%` : '0%'}</strong>
                </div>
                <div>
                  <span>Active modules</span>
                  <strong>8</strong>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </section>
  );
}

export default Dashboard;
