import { request } from './api';

export function getNotifications(limit = 40) {
  return request(`/notifications?limit=${limit}`);
}

export function getUnreadNotificationCount() {
  return request('/notifications/unread-count');
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'POST' });
}

export function dismissNotification(id) {
  return request(`/notifications/${id}/dismiss`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'POST' });
}

export function formatNotificationTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
