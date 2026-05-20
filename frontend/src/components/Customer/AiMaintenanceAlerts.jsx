import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchMaintenancePredictions } from '../../services/aiMaintenanceService';
import { getStoredAuthUser, getStoredToken } from '../../utils/authSession';
import './AiMaintenanceTheme.css';

const emptySections = {
  predictedFailures: [],
  maintenanceAlerts: [],
  recommendations: [],
  partReplacementSuggestions: [],
};

const SECTION_CONFIG = [
  {
    key: 'predictedFailures',
    title: 'Possible future failures',
    variant: 'failure',
    icon: '⚠',
    description: 'Issues that may appear based on age, mileage, and service patterns.',
  },
  {
    key: 'maintenanceAlerts',
    title: 'Maintenance alerts',
    variant: 'alert',
    icon: '🔔',
    description: 'Time-sensitive reminders for your vehicles.',
  },
  {
    key: 'recommendations',
    title: 'Service recommendations',
    variant: 'recommend',
    icon: '🔧',
    description: 'Suggested services to keep your vehicle reliable.',
  },
  {
    key: 'partReplacementSuggestions',
    title: 'Part replacement suggestions',
    variant: 'parts',
    icon: '⚙',
    description: 'Parts that may need inspection or replacement soon.',
  },
];

function AlertList({ title, items, variant, icon, description }) {
  if (!items?.length) {
    return null;
  }

  return (
    <article className={`ai-modal-section ai-modal-section--${variant}`}>
      <header className="ai-modal-section__header">
        <span className="ai-modal-section__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
      </header>
      <ul className="ai-modal-section__list">
        {items.map((item) => (
          <li key={`${variant}-${item}`}>
            <span className="ai-modal-section__bullet" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function AiPredictionModal({ isOpen, onClose, prediction, sections, hasAnyAlerts }) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="ai-theme-scope ai-modal-root" role="presentation" onClick={onClose}>
      <div
        className="ai-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ai-modal-panel__glow" aria-hidden="true" />

        <header className="ai-modal-panel__header">
          <div className="ai-modal-panel__header-copy">
            <span className="ai-modal-panel__badge">GarageGo AI</span>
            <h2 id="ai-modal-title">Maintenance insights</h2>
            <p>
              Personalized predictions from your vehicles, service history, and parts purchases.
            </p>
          </div>
          <button
            type="button"
            className="ai-modal-close"
            onClick={onClose}
            aria-label="Close maintenance insights"
          >
            ×
          </button>
        </header>

        <div className="ai-modal-panel__body">
          {prediction?.message && (
            <p className="ai-modal-panel__note">{prediction.message}</p>
          )}

          {!hasAnyAlerts ? (
            <div className="ai-modal-empty">
              <span className="ai-modal-empty__icon" aria-hidden="true">
                ✓
              </span>
              <h3>All clear for now</h3>
              <p>
                No specific alerts right now. Keep your service history up to date for better predictions.
              </p>
            </div>
          ) : (
            <div className="ai-modal-sections">
              {SECTION_CONFIG.map((section) => (
                <AlertList
                  key={section.key}
                  title={section.title}
                  items={sections[section.key]}
                  variant={section.variant}
                  icon={section.icon}
                  description={section.description}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="ai-modal-panel__footer">
          <button type="button" className="primary-btn" onClick={onClose}>
            Got it
          </button>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function AiMaintenanceAlerts({ compact = false }) {
  const customer = getStoredAuthUser();
  const customerId = customer?.id;
  const token = getStoredToken();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadPredictions = useCallback(async () => {
    if (!token || !customerId) {
      setLoading(false);
      setError('Sign in to view AI maintenance alerts.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchMaintenancePredictions(customerId, token);
      setPrediction(data);
    } catch (err) {
      setPrediction(null);
      setError(err.message || 'Could not load AI maintenance alerts.');
    } finally {
      setLoading(false);
    }
  }, [customerId, token]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const sections = prediction
    ? {
        predictedFailures: prediction.predictedFailures || [],
        maintenanceAlerts: prediction.maintenanceAlerts || [],
        recommendations: prediction.recommendations || [],
        partReplacementSuggestions: prediction.partReplacementSuggestions || [],
      }
    : emptySections;

  const hasAnyAlerts = Object.values(sections).some((items) => items.length > 0);
  const totalAlertCount = Object.values(sections).reduce((sum, items) => sum + items.length, 0);
  const canOpenModal = !loading && !error && prediction?.aiAvailable;
  const wrapperClass = compact
    ? 'ai-maintenance-card ai-maintenance-card--compact'
    : 'ai-maintenance-card ai-maintenance-card--teaser';

  const openModal = () => {
    if (canOpenModal) {
      setModalOpen(true);
    }
  };

  return (
    <>
      <section className={`ai-theme-scope ${wrapperClass}`} aria-label="AI Maintenance Alerts">
        <div className="ai-teaser">
          <div className="ai-teaser__icon-wrap" aria-hidden="true">
            <span className="ai-teaser__icon">✦</span>
          </div>

          <div className="ai-teaser__copy">
            <span className="section-kicker">Predictive maintenance</span>
            <h3>AI Maintenance Alerts</h3>
            {!compact && (
              <p>Smart insights from your vehicle data — open the report when you are ready.</p>
            )}
          </div>

          <div className="ai-teaser__actions">
            {loading && (
              <div className="ai-teaser__loading" role="status">
                <span className="loading-spinner" aria-hidden="true" />
                <span>Analyzing…</span>
              </div>
            )}

            {!loading && error && (
              <div className="ai-teaser__status ai-teaser__status--error" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && prediction && !prediction.aiAvailable && (
              <div className="ai-teaser__status">
                {prediction.message || 'AI predictions are currently unavailable.'}
              </div>
            )}

            {canOpenModal && (
              <>
                {hasAnyAlerts ? (
                  <div className="ai-teaser__chips" aria-label="Alert summary">
                    {sections.predictedFailures.length > 0 && (
                      <span className="ai-teaser-chip ai-teaser-chip--failure">
                        {sections.predictedFailures.length} risk
                      </span>
                    )}
                    {sections.maintenanceAlerts.length > 0 && (
                      <span className="ai-teaser-chip ai-teaser-chip--alert">
                        {sections.maintenanceAlerts.length} alert
                      </span>
                    )}
                    {sections.recommendations.length > 0 && (
                      <span className="ai-teaser-chip ai-teaser-chip--recommend">
                        {sections.recommendations.length} tip
                      </span>
                    )}
                    {sections.partReplacementSuggestions.length > 0 && (
                      <span className="ai-teaser-chip ai-teaser-chip--parts">
                        {sections.partReplacementSuggestions.length} part
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="ai-teaser__status">No alerts right now — your vehicles look good.</p>
                )}

                <button type="button" className="primary-btn ai-teaser__open-btn" onClick={openModal}>
                  {hasAnyAlerts
                    ? `View ${totalAlertCount} AI insight${totalAlertCount === 1 ? '' : 's'}`
                    : 'View AI report'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <AiPredictionModal
        isOpen={modalOpen && canOpenModal}
        onClose={() => setModalOpen(false)}
        prediction={prediction}
        sections={sections}
        hasAnyAlerts={hasAnyAlerts}
      />
    </>
  );
}

export default AiMaintenanceAlerts;
