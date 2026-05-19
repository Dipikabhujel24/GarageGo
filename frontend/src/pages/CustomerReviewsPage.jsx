import React, { useMemo, useState } from 'react';
import SecureForm from '../components/SecureForm';
import CustomerSelfServiceShell from '../components/Customer/CustomerSelfServiceShell';
import CustomerRequestHistoryTable, {
  formatCustomerRequestDate,
} from '../components/Customer/CustomerRequestHistoryTable';
import StarRatingPicker from '../components/Customer/StarRatingPicker';
import { useMyCustomerRequests } from '../hooks/useMyCustomerRequests';
import { reviewService } from '../services/customerFeatureService';

const initialReview = {
  rating: 5,
  comment: '',
};

function renderStarDisplay(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return '★'.repeat(value) + '☆'.repeat(5 - value);
}

function CustomerReviewsPage() {
  const { requests, isLoading, error, setError, reload } = useMyCustomerRequests();
  const [review, setReview] = useState(initialReview);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await reviewService({
        rating: Number(review.rating),
        comment: review.comment,
      });
      setReview(initialReview);
      setMessage('Service review submitted successfully.');
      await reload();
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit service review.');
    }
  };

  const serviceReviews = useMemo(() => requests.serviceReviews || [], [requests.serviceReviews]);

  return (
    <CustomerSelfServiceShell
      pageIcon="reviews"
      title="Reviews & Ratings"
      subtitle="Share feedback about your GarageGo service experience."
      message={message}
      error={error}
      isLoading={isLoading}
      loadingLabel="Loading your reviews..."
    >
      {!isLoading && (
        <div className="customer-self-service-stack">
          <section className="customer-self-service-panel">
            <div className="customer-self-service-panel-head">
              <div>
                <h3>Review Service</h3>
                <p>Rate your recent service and leave a short comment.</p>
              </div>
            </div>

            <SecureForm
              className="customer-self-service-form"
              onSubmit={handleSubmit}
              includePassword={false}
            >
              <div className="customer-self-service-form-grid">
                <div className="form-field-span-full">
                  <label className="form-label">Rating</label>
                  <StarRatingPicker
                    value={review.rating}
                    onChange={(rating) => setReview((previous) => ({ ...previous, rating }))}
                  />
                </div>

                <div className="form-field-span-full">
                  <label className="form-label" htmlFor="review-comment">Comment</label>
                  <textarea
                    id="review-comment"
                    className="input-field"
                    rows={4}
                    value={review.comment}
                    onChange={(event) =>
                      setReview((previous) => ({ ...previous, comment: event.target.value }))
                    }
                    placeholder="What went well? Anything we can improve?"
                  />
                </div>

                <div className="customer-self-service-form-actions">
                  <button className="button button-primary feature-submit" type="submit">
                    Submit Review
                  </button>
                </div>
              </div>
            </SecureForm>
          </section>

          <CustomerRequestHistoryTable
            title="Your reviews"
            emptyMessage="No service reviews submitted yet."
            columns={['Submitted', 'Rating', 'Comment']}
            rows={serviceReviews}
            renderRow={(item) => (
              <tr key={item.id}>
                <td>{formatCustomerRequestDate(item.createdAt)}</td>
                <td>
                  <span className="review-stars-display" aria-label={`${item.rating} out of 5 stars`}>
                    {renderStarDisplay(item.rating)}
                  </span>
                  <span className="table-note">{item.rating} / 5</span>
                </td>
                <td>{item.comment || '—'}</td>
              </tr>
            )}
          />
        </div>
      )}
    </CustomerSelfServiceShell>
  );
}

export default CustomerReviewsPage;
