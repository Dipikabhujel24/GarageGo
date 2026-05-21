import React from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 2000 },
  { month: 'Feb', revenue: 4000 },
  { month: 'Mar', revenue: 3000 },
  { month: 'Apr', revenue: 5800 },
  { month: 'May', revenue: 7000 },
];

function formatNumber(value) {
  return Number(value).toLocaleString();
}

function RevenueChart() {
  const chartData = revenueData.map((item) => ({
    ...item,
    revenue: Number(item.revenue),
  }));

  return (
    <article className="chart-card card">
      <div className="chart-header">
        <h3 className="chart-title card-title">Revenue Overview</h3>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 24, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#E8E2F0" strokeDasharray="4 4" />
            <XAxis dataKey="month" stroke="#1F1F1F" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#1F1F1F"
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={formatNumber}
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
              dot={{ r: 4, fill: '#EC6B9A', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#1A1429' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

export default RevenueChart;
