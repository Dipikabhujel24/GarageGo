import React from 'react';

function ReportCards({ cards }) {
  return (
    <div className="report-cards-grid">
      {cards.map((summaryCard) => (
        <article key={summaryCard.label} className="report-summary-card card">
          <p className="card-label">{summaryCard.label}</p>
          <p className="card-value">{summaryCard.value}</p>
        </article>
      ))}
    </div>
  );
}

export default ReportCards;
