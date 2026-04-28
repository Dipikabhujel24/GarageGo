import React from 'react';

function ReportCards({ cards }) {
  return (
    <div className="report-cards-grid">
      {cards.map((summaryCard) => (
        <article key={summaryCard.label} className="report-summary-card card">
          <div className="report-summary-header">
            <div className={`report-icon report-icon-${summaryCard.variant ?? 'default'}`}>
              {summaryCard.icon}
            </div>
            <p className="card-label">{summaryCard.label}</p>
          </div>
          <p className="card-value">{summaryCard.value}</p>
          {summaryCard.description ? (
            <p className="card-description">{summaryCard.description}</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

export default ReportCards;
