import React from 'react';
import { formatDate, useManagementRequests } from './AppointmentsManagement';

function ServiceReviewsManagement() {
  const { requests, isLoading, error } = useManagementRequests();

  return (
    <section className="appointments-management">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Service Reviews</h2>
        <p className="section-copy">Review customer service feedback.</p>
      </div>

      {error && <div className="message-banner error">{error}</div>}
      {isLoading && <div className="message-banner">Loading reviews...</div>}

      {requests.serviceReviews.length === 0 ? (
        <div className="placeholder-card card">
          <p className="placeholder-title">No service reviews submitted yet.</p>
        </div>
      ) : (
        <div className="review-card-grid">
          {requests.serviceReviews.map((review) => (
            <article className="review-card card" key={review.id}>
              <div className="review-card-header">
                <div>
                  <p className="review-customer">{review.customerName || `Customer #${review.customerId}`}</p>
                  <p className="review-date">{formatDate(review.createdAt)}</p>
                </div>
                <span className="review-rating">{review.rating} / 5</span>
              </div>
              <p className="review-comment">{review.comment || 'No comment added.'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ServiceReviewsManagement;
