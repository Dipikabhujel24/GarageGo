import React, { useEffect, useState } from 'react';
import RevenueChart from '../components/RevenueChart';
import { fetchDashboardSummary } from '../services/dashboardService';

function Dashboard() {
  const [summaryCards, setSummaryCards] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadSummaryCards = async () => {
      const dashboardSummary = await fetchDashboardSummary();
      if (isMounted) {
        setSummaryCards(dashboardSummary);
      }
    };

    loadSummaryCards();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Overview</h2>
        <p className="section-copy">
          Welcome to the GarageGo admin dashboard. This area gives you a quick
          snapshot of your operations.
        </p>
      </div>

      <div className="stats-grid">
        {summaryCards.map((summaryCard) => (
          <article key={summaryCard.label} className="stat-card card">
            <p className="stat-label">{summaryCard.label}</p>
            <p className="stat-value">{summaryCard.value}</p>
          </article>
        ))}
      </div>

      <div className="dashboard-chart-section">
        <RevenueChart />
      </div>
    </section>
  );
}

export default Dashboard;
