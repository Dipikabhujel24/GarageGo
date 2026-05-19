import React from 'react';
import './AdminDataToolbar.css';

const STATUS_TONES = {
  pending: 'warning',
  approved: 'info',
  completed: 'success',
  cancelled: 'danger',
  active: 'success',
  disabled: 'danger',
  inactive: 'neutral',
  fulfilled: 'success',
  urgent: 'danger',
  read: 'neutral',
  unread: 'warning',
};

function resolveTone(status) {
  const key = String(status ?? '').trim().toLowerCase();
  return STATUS_TONES[key] || 'neutral';
}

function StatusChip({ label, tone }) {
  const resolvedTone = tone || resolveTone(label);

  return <span className={`admin-status-chip admin-status-chip--${resolvedTone}`}>{label}</span>;
}

export default StatusChip;
