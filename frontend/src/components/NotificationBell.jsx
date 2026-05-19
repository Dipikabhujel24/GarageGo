import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  dismissNotification,
  formatNotificationTime,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationService';
import './NotificationBell.css';

function NotificationBell() {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState(null);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const updatePanelPosition = useCallback(() => {
    if (!buttonRef.current) {
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const panelWidth = Math.min(380, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, rect.right - panelWidth),
      window.innerWidth - panelWidth - 12
    );
    const top = rect.bottom + 10;

    setPanelStyle({
      top: `${top}px`,
      left: `${left}px`,
      width: `${panelWidth}px`,
    });
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const { data } = await getUnreadNotificationCount();
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch {
      // Ignore polling errors for badge count
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data } = await getNotifications();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 60000);
    return () => window.clearInterval(intervalId);
  }, [loadUnreadCount]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    loadNotifications();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loadNotifications]);

  const handleOpen = () => {
    setIsOpen((previous) => {
      const next = !previous;
      if (next) {
        updatePanelPosition();
      }
      return next;
    });
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (markError) {
      setError(markError.message || 'Unable to mark notification as read.');
    }
  };

  const handleDismiss = async (id) => {
    try {
      await dismissNotification(id);
      await loadNotifications();
      await loadUnreadCount();
    } catch (dismissError) {
      setError(dismissError.message || 'Unable to dismiss notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      await loadNotifications();
      await loadUnreadCount();
    } catch (markAllError) {
      setError(markAllError.message || 'Unable to mark all as read.');
    }
  };

  const handleNavigate = async (item) => {
    if (!item.isRead) {
      await handleMarkRead(item.id);
    }

    if (item.linkUrl) {
      navigate(item.linkUrl);
      setIsOpen(false);
    }
  };

  const panel = isOpen && panelStyle
    ? createPortal(
        <>
          <button
            type="button"
            className="notification-bell-backdrop"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="notification-bell-panel notification-bell-panel--portal"
            style={panelStyle}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="notification-bell-panel-head">
              <h3>Notifications</h3>
              <div className="notification-bell-panel-actions">
                <button type="button" onClick={handleMarkAllRead}>
                  Mark all read
                </button>
                <button type="button" onClick={() => setIsOpen(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="notification-bell-list">
              {isLoading && <p className="notification-bell-loading">Loading notifications...</p>}
              {!isLoading && error && <p className="notification-bell-error">{error}</p>}
              {!isLoading && !error && items.length === 0 && (
                <p className="notification-bell-empty">No notifications right now.</p>
              )}
              {!isLoading &&
                !error &&
                items.map((item) => (
                  <article
                    key={item.id}
                    className={`notification-bell-item${item.isRead ? '' : ' is-unread'}`}
                  >
                    <div className="notification-bell-item-head">
                      <h4 className="notification-bell-item-title">{item.title}</h4>
                      <span className="notification-bell-item-time">
                        {formatNotificationTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="notification-bell-item-message">{item.message}</p>
                    <div className="notification-bell-item-actions">
                      {item.linkUrl && (
                        <button type="button" onClick={() => handleNavigate(item)}>
                          Open
                        </button>
                      )}
                      {!item.isRead && (
                        <button type="button" onClick={() => handleMarkRead(item.id)}>
                          Mark read
                        </button>
                      )}
                      <button type="button" onClick={() => handleDismiss(item.id)}>
                        Dismiss
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notification-bell-button"
        aria-label="Open notifications"
        aria-expanded={isOpen}
        onClick={handleOpen}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 4a4 4 0 0 0-4 4v2.5c0 .8-.3 1.6-.8 2.2L5 15h14l-2.2-2.3c-.5-.6-.8-1.4-.8-2.2V8a4 4 0 0 0-4-4Z" strokeLinejoin="round" />
          <path d="M10 18a2 2 0 0 0 4 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {panel}
    </div>
  );
}

export default NotificationBell;
