import React, { useEffect, useState } from 'react';
import StatusChip from './StatusChip';
import './RequestManagePanel.css';

function RequestManagePanel({
  title,
  record,
  statusOptions,
  onClose,
  onSave,
  isSaving,
  feedback,
  renderDetails,
}) {
  const [status, setStatus] = useState(record?.status || 'Pending');
  const [adminNotes, setAdminNotes] = useState(record?.adminNotes || '');

  useEffect(() => {
    setStatus(record?.status || 'Pending');
    setAdminNotes(record?.adminNotes || '');
  }, [record]);

  if (!record) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave?.({
      status,
      adminNotes,
    });
  };

  return (
    <div className="request-manage-overlay" role="presentation" onClick={onClose}>
      <aside
        className="request-manage-panel card"
        role="dialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="request-manage-panel__head">
          <div>
            <h3>{title}</h3>
            <p>Request #{record.id}</p>
          </div>
          <button type="button" className="button button-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {feedback ? (
          <div className={`message-banner ${feedback.type === 'error' ? 'error' : ''}`}>{feedback.message}</div>
        ) : null}

        <div className="request-manage-panel__meta">
          <StatusChip label={record.status || 'Pending'} />
          {record.statusUpdatedAt ? (
            <span className="request-manage-panel__timestamp">
              Updated {new Date(record.statusUpdatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        {renderDetails?.(record)}

        <form className="request-manage-panel__form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="request-status">
            Status
          </label>
          <select
            id="request-status"
            className="input-field"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={isSaving}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="request-admin-notes">
            Admin notes / comments
          </label>
          <textarea
            id="request-admin-notes"
            className="input-field"
            rows={4}
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            placeholder="Add internal notes or a message for the customer"
            disabled={isSaving}
          />

          <div className="request-manage-panel__quick-actions">
            {statusOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="button button-secondary request-manage-panel__quick-btn"
                onClick={() => setStatus(option)}
                disabled={isSaving}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="request-manage-panel__actions">
            <button className="button button-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
            <button className="button button-secondary" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

export default RequestManagePanel;
