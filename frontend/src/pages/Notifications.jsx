import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotificationsSummary } from '../services/api';
import './Notifications.css';

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function Notifications() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

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

  useEffect(() => {
    const run = async () => {
      try {
        await loadSummary();
      } catch {
        setErrorMessage('Failed to load notifications summary.');
      }
    };

    run();

    return () => {
    };
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
                  <button type="button" className="secondary-button" onClick={loadSummary}>
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
          </>
        )}
      </div>
    </section>
  );
}

export default Notifications;
