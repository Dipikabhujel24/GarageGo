import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import StatusChip from '../components/admin/StatusChip';
import { getNotificationsSummary } from '../services/api';
import {
  formatNotificationTime,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import { includesText } from '../utils/adminFilters';
import './Notifications.css';

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function getNotificationTypeLabel(type) {
  const key = String(type || '').toLowerCase();

  if (key.includes('low_stock')) {
    return 'Low stock';
  }

  if (key.includes('credit') || key.includes('overdue')) {
    return 'Credit';
  }

  if (key.includes('appointment')) {
    return 'Appointment';
  }

  if (key.includes('part_request')) {
    return 'Part request';
  }

  if (key.includes('ai') || key.includes('maintenance')) {
    return 'AI alert';
  }

  return 'General';
}

function Notifications() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [listError, setListError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadSummary = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await getNotificationsSummary();
      setSummary(response.data || null);
      setLastUpdated(new Date());
    } catch (error) {
      setSummary(null);
      setErrorMessage(error?.message || 'Failed to load notifications summary.');
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationItems = async () => {
    setListLoading(true);
    setListError('');

    try {
      const response = await getNotifications(80);
      setItems(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (error) {
      setItems([]);
      setListError(error?.message || 'Failed to load notification list.');
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
    loadNotificationItems();
  }, []);

  const priorityLevel = useMemo(() => {
    if (!summary) {
      return 'Idle';
    }

    if ((summary.overdueCredits || 0) > 0) {
      return 'Action required';
    }

    if ((summary.lowStockCount || 0) > 0) {
      return 'Monitor';
    }

    return 'Healthy';
  }, [summary]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim();

    return items.filter((item) => {
      const type = String(item.type || '').toLowerCase();

      if (readFilter === 'unread' && item.isRead) {
        return false;
      }

      if (readFilter === 'read' && !item.isRead) {
        return false;
      }

      if (typeFilter === 'low-stock' && !type.includes('low_stock')) {
        return false;
      }

      if (typeFilter === 'credit' && !type.includes('credit') && !type.includes('overdue')) {
        return false;
      }

      if (typeFilter === 'appointments' && !type.includes('appointment')) {
        return false;
      }

      if (typeFilter === 'ai' && !type.includes('ai') && !type.includes('maintenance')) {
        return false;
      }

      if (typeFilter === 'parts' && !type.includes('part_request')) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        includesText(item.title, query) ||
        includesText(item.message, query) ||
        includesText(item.type, query)
      );
    });
  }, [items, searchQuery, readFilter, typeFilter]);

  const nextActions = useMemo(() => {
    const actions = [];

    if ((summary?.lowStockCount || 0) > 0) {
      actions.push({
        label: 'Review inventory',
        description: 'Check parts below the configured threshold and restock before sales are blocked.',
        to: '/admin/inventory',
      });
    }

    if ((summary?.overdueCredits || 0) > 0) {
      actions.push({
        label: 'Check reports',
        description: 'Review overdue service credit records and follow up with the affected customers.',
        to: '/staff/reports',
      });
    }

    if (actions.length === 0) {
      actions.push({
        label: 'Open dashboard',
        description: 'No immediate alerts are pending. Use the dashboard for a broader operational view.',
        to: '/admin/dashboard',
      });
    }

    return actions;
  }, [summary]);

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    await loadNotificationItems();
    await loadSummary();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await loadNotificationItems();
    await loadSummary();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setReadFilter('all');
    setTypeFilter('all');
  };

  const handleRefreshAll = async () => {
    await Promise.all([loadSummary(), loadNotificationItems()]);
  };

  return (
    <section className="notifications-page">
      <div className="notifications-shell">
        <header className="notifications-hero card">
          <div className="notifications-hero-copy">
            <span className="notifications-eyebrow">GarageGo Admin</span>
            <h2>Notifications Center</h2>
            <p>
              Monitor low-stock parts and overdue credit reminders from one place.
              This screen surfaces the same operational signals that power the background worker.
            </p>
          </div>

          <div className="notifications-hero-status">
            <span className="notifications-status-label">Priority</span>
            <strong className="notifications-status-value">{priorityLevel}</strong>
            <span className="notifications-status-note">
              {loading ? 'Refreshing live data' : 'Synced from the live notifications endpoint'}
            </span>
          </div>
        </header>

        {errorMessage && <div className="message-banner error">{errorMessage}</div>}

        {loading ? (
          <div className="notifications-loading card">
            <p className="status-text">Loading notifications...</p>
          </div>
        ) : (
          <>
            <section className="notifications-summary-grid" aria-label="Notifications summary">
              <article className="notification-metric-card card">
                <span className="notification-metric-label">Low Stock Parts</span>
                <strong className="notification-metric-value">{formatCount(summary?.lowStockCount)}</strong>
                <span className="notification-metric-caption">Parts currently below the configured threshold.</span>
              </article>

              <article className="notification-metric-card card">
                <span className="notification-metric-label">Overdue Credits</span>
                <strong className="notification-metric-value">{formatCount(summary?.overdueCredits)}</strong>
                <span className="notification-metric-caption">Service records awaiting payment follow-up.</span>
              </article>

              <article className="notification-metric-card card">
                <span className="notification-metric-label">Status</span>
                <strong className="notification-metric-value">{priorityLevel}</strong>
                <span className="notification-metric-caption">Based on current low-stock and overdue-credit counts.</span>
              </article>
            </section>

            <section className="notifications-layout">
              <article className="notifications-panel card">
                <div className="panel-heading">
                  <h3>What needs attention</h3>
                  <button type="button" className="secondary-button" onClick={handleRefreshAll}>
                    Refresh
                  </button>
                </div>

                <div className="notification-list">
                  <div className={`notification-item ${((summary?.lowStockCount || 0) > 0) ? 'notification-item--warning' : 'notification-item--success'}`}>
                    <div>
                      <h4>Inventory alert</h4>
                      <p>
                        {summary?.lowStockCount > 0
                          ? `${summary.lowStockCount} part(s) need restocking to avoid service delays.`
                          : 'No parts are currently below the configured low-stock threshold.'}
                      </p>
                    </div>
                  </div>

                  <div className={`notification-item ${((summary?.overdueCredits || 0) > 0) ? 'notification-item--warning' : 'notification-item--success'}`}>
                    <div>
                      <h4>Billing follow-up</h4>
                      <p>
                        {summary?.overdueCredits > 0
                          ? `${summary.overdueCredits} credit record(s) are overdue and need customer follow-up.`
                          : 'No overdue credit reminders are currently pending.'}
                      </p>
                    </div>
                  </div>
                </div>
              </article>

              <aside className="notifications-panel card">
                <div className="panel-heading">
                  <h3>Quick actions</h3>
                </div>

                <div className="action-stack">
                  {nextActions.map((action) => (
                    <article key={action.to} className="action-card">
                      <div>
                        <h4>{action.label}</h4>
                        <p>{action.description}</p>
                      </div>
                      <Link className="primary-button action-link" to={action.to}>
                        Open
                      </Link>
                    </article>
                  ))}
                </div>

                <div className="notifications-footer-note">
                  <p>
                    Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Just now'}
                  </p>
                </div>
              </aside>
            </section>

            <article className="notifications-panel card">
              <div className="panel-heading">
                <h3>Notification inbox</h3>
                <button type="button" className="secondary-button" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              </div>

              <AdminDataToolbar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search notifications..."
                selects={[
                  {
                    id: 'read',
                    label: 'Read status',
                    value: readFilter,
                    onChange: setReadFilter,
                    options: [
                      { value: 'all', label: 'All' },
                      { value: 'unread', label: 'Unread' },
                      { value: 'read', label: 'Read' },
                    ],
                  },
                  {
                    id: 'type',
                    label: 'Type',
                    value: typeFilter,
                    onChange: setTypeFilter,
                    options: [
                      { value: 'all', label: 'All types' },
                      { value: 'low-stock', label: 'Low stock alerts' },
                      { value: 'credit', label: 'Credit reminders' },
                      { value: 'appointments', label: 'Appointments' },
                      { value: 'parts', label: 'Part requests' },
                      { value: 'ai', label: 'AI alerts' },
                    ],
                  },
                ]}
                onClear={handleClearFilters}
                resultText={`Showing ${filteredItems.length} of ${items.length} notifications`}
              />

              {listError && <div className="message-banner error">{listError}</div>}

              {listLoading ? (
                <p className="status-text">Loading notification list...</p>
              ) : (
                <div className="notification-inbox-list">
                  {filteredItems.length === 0 ? (
                    <p className="status-text">No notifications match your filters.</p>
                  ) : (
                    filteredItems.map((item) => (
                      <article
                        key={item.id}
                        className={`notification-inbox-item${item.isRead ? '' : ' notification-inbox-item--unread'}`}
                      >
                        <div className="notification-inbox-item__head">
                          <div>
                            <h4>{item.title}</h4>
                            <p>{item.message}</p>
                          </div>
                          <div className="notification-inbox-item__meta">
                            <StatusChip label={getNotificationTypeLabel(item.type)} tone="info" />
                            <StatusChip
                              label={item.isRead ? 'Read' : 'Unread'}
                              tone={item.isRead ? 'neutral' : 'warning'}
                            />
                            <span>{formatNotificationTime(item.createdAt)}</span>
                          </div>
                        </div>
                        <div className="notification-inbox-item__actions">
                          {item.linkUrl ? (
                            <Link className="secondary-button" to={item.linkUrl}>
                              Open
                            </Link>
                          ) : null}
                          {!item.isRead ? (
                            <button type="button" className="secondary-button" onClick={() => handleMarkRead(item.id)}>
                              Mark as read
                            </button>
                          ) : null}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </article>
          </>
        )}
      </div>
    </section>
  );
}

export default Notifications;
