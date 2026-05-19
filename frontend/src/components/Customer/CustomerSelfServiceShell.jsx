import React from 'react';
import { getStoredAuthUser } from '../../utils/authSession';
import './CustomerSelfService.css';

const pageIcons = {
  appointments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
    </svg>
  ),
  parts: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3 4 7v6l8 4 8-4V7l-8-4Z" strokeLinejoin="round" />
      <path d="M12 11v10M4 7l8 4 8-4" strokeLinejoin="round" />
    </svg>
  ),
  reviews: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m12 3 2.2 5.2 5.8.5-4.3 3.8 1.3 5.7L12 15.8 7 18.2l1.3-5.7L4 8.7l5.8-.5L12 3Z" strokeLinejoin="round" />
    </svg>
  ),
};

function CustomerSelfServiceShell({
  title,
  subtitle,
  pageIcon = 'appointments',
  message,
  error,
  isLoading,
  loadingLabel,
  children,
}) {
  const customer = getStoredAuthUser();
  const customerName = customer?.name || 'Customer';
  const icon = pageIcons[pageIcon] || pageIcons.appointments;

  return (
    <section className="customer-self-service customer-self-service-page">
      <header className="page-header-card card customer-self-service-header">
        <div className="customer-self-service-header-icon">{icon}</div>
        <div className="customer-self-service-header-copy">
          <span className="section-kicker">GarageGo customer</span>
          <h2 className="section-title card-title">{title}</h2>
          <p className="section-copy">
            {subtitle || `${customerName}, manage your GarageGo requests from this page.`}
          </p>
        </div>
      </header>

      {message && <div className="message-banner success-message">{message}</div>}
      {error && <div className="message-banner error-message">{error}</div>}
      {isLoading && <div className="message-banner">{loadingLabel || 'Loading...'}</div>}

      {children}
    </section>
  );
}

export default CustomerSelfServiceShell;
