import React from 'react';

function ReportCards({ cards }) {
  return (
    <div className="report-cards-container">
      <div className="report-cards-grid">
        {cards.map((summaryCard) => (
          <article 
            key={summaryCard.label} 
            className={`report-summary-card report-card-${summaryCard.variant ?? 'default'}`}
          >
            {/* Card Background Accent */}
            <div className="report-card-accent"></div>

            {/* Card Content */}
            <div className="report-card-content">
              {/* Icon Section */}
              <div className={`report-icon-wrapper report-icon-${summaryCard.variant ?? 'default'}`}>
                <div className="report-icon-background">
                  {summaryCard.icon}
                </div>
              </div>

              {/* Text Content */}
              <div className="report-card-text">
                <p className="report-card-label">{summaryCard.label}</p>
                <p className="report-card-value">{summaryCard.value}</p>
                {summaryCard.description ? (
                  <p className="report-card-description">{summaryCard.description}</p>
                ) : null}
              </div>
            </div>

            {/* Hover Effect Border */}
            <div className="report-card-border"></div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default ReportCards;
