import React from 'react';

function RequestStatusBadge({ status }) {
  const label = status || 'Unknown';
  const slug = label.toLowerCase().replace(/\s+/g, '-');

  return <span className={`request-status-badge request-status-badge--${slug}`}>{label}</span>;
}

export default RequestStatusBadge;
