import React from 'react';
import { FaChartLine } from 'react-icons/fa';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatNumber(value) {
  return Number(value).toLocaleString();
}

function ReportsChart({ data }) {
  const chartData = data.map((item) => ({
    ...item,
    revenue: Number(item.revenue),
  }));

  return (
    <article className="report-chart-card card">
      {/* Chart Header Section */}
      <div className="report-chart-header">
        <div className="report-chart-title-group">
          <div className="report-chart-icon">
            <FaChartLine />
          </div>
          <div className="report-chart-text">
            <h3 className="report-chart-title">Revenue Overview</h3>
            <p className="report-chart-subtitle">
              Track revenue movement across the selected report range to identify trends and patterns.
            </p>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="report-chart-container">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 24, left: -10, bottom: 0 }}
          >
            <CartesianGrid stroke="#E8E2F0" strokeDasharray="4 4" />
            <XAxis 
              dataKey="label" 
              stroke="#1F1F1F" 
              tickLine={false} 
              axisLine={false}
              style={{ fontSize: '0.85rem' }}
            />
            <YAxis
              stroke="#1F1F1F"
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={formatNumber}
              style={{ fontSize: '0.85rem' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E2F0',
                borderRadius: '12px',
                color: '#1A1429',
                boxShadow: '0 12px 24px rgba(44, 36, 71, 0.12)',
              }}
              labelStyle={{ color: '#1A1429', fontWeight: 700 }}
              formatter={(value) => [`Rs${formatNumber(value)}`, 'Revenue']}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3F2F66"
              strokeWidth={3}
              dot={{ r: 5, fill: '#EC6B9A', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7, fill: '#1A1429' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export default ReportsChart;
