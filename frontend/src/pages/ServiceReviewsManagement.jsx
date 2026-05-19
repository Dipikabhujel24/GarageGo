import React, { useMemo, useState } from 'react';
import AdminDataToolbar from '../components/admin/AdminDataToolbar';
import { formatDate, useManagementRequests } from './AppointmentsManagement';
import { matchSearchFields, sortItems } from '../utils/adminFilters';

const reviewSearchGetters = {
  customer: (review) => review.customerName || `Customer #${review.customerId}`,
  keyword: (review) => review.comment,
};

function ServiceReviewsManagement() {
  const { requests, isLoading, error } = useManagementRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortValue, setSortValue] = useState('');

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim();
    let list = requests.serviceReviews.filter((review) => {
      const rating = Number(review.rating) || 0;

      if (ratingFilter === '5' && rating !== 5) {
        return false;
      }

      if (ratingFilter === '4' && rating !== 4) {
        return false;
      }

      if (ratingFilter === 'low' && rating > 3) {
        return false;
      }

      if (ratingFilter === 'recent') {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (new Date(review.createdAt || 0).getTime() < weekAgo) {
          return false;
        }
      }

      if (!query) {
        return true;
      }

      const fields = searchField === 'all' ? ['all'] : [searchField];
      return matchSearchFields(review, query, fields, reviewSearchGetters);
    });

    if (sortValue === 'rating-desc') {
      list = sortItems(list, 'desc-rating', (review) => Number(review.rating) || 0);
    } else if (sortValue === 'rating-asc') {
      list = sortItems(list, 'asc-rating', (review) => Number(review.rating) || 0);
    } else if (sortValue === 'recent') {
      list = sortItems(list, 'desc-date', (review) => new Date(review.createdAt || 0).getTime());
    }

    return list;
  }, [requests.serviceReviews, searchQuery, searchField, ratingFilter, sortValue]);

  const analytics = useMemo(() => {
    const ratings = filteredReviews.map((review) => Number(review.rating) || 0);
    const total = ratings.length;
    const average = total > 0 ? ratings.reduce((sum, value) => sum + value, 0) / total : 0;
    const fiveStar = ratings.filter((value) => value === 5).length;
    const lowRatings = ratings.filter((value) => value <= 3).length;

    return { total, average, fiveStar, lowRatings };
  }, [filteredReviews]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSearchField('all');
    setRatingFilter('all');
    setSortValue('');
  };

  return (
    <section className="appointments-management">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Service Reviews</h2>
        <p className="section-copy">Review customer service feedback.</p>
      </div>

      {error && <div className="message-banner error">{error}</div>}
      {isLoading && <div className="message-banner">Loading reviews...</div>}

      <section className="notifications-summary-grid" aria-label="Review analytics">
        <article className="notification-metric-card card">
          <span className="notification-metric-label">Average rating</span>
          <strong className="notification-metric-value">{analytics.average.toFixed(1)}</strong>
          <span className="notification-metric-caption">Across filtered reviews.</span>
        </article>
        <article className="notification-metric-card card">
          <span className="notification-metric-label">Total reviews</span>
          <strong className="notification-metric-value">{analytics.total}</strong>
          <span className="notification-metric-caption">Matching current search and filters.</span>
        </article>
        <article className="notification-metric-card card">
          <span className="notification-metric-label">5-star reviews</span>
          <strong className="notification-metric-value">{analytics.fiveStar}</strong>
          <span className="notification-metric-caption">Low ratings (3 or below): {analytics.lowRatings}</span>
        </article>
      </section>

      <AdminDataToolbar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search reviews..."
        searchField={searchField}
        onSearchFieldChange={setSearchField}
        searchFields={[
          { value: 'all', label: 'All fields' },
          { value: 'customer', label: 'Customer name' },
          { value: 'keyword', label: 'Review keyword' },
        ]}
        selects={[
          {
            id: 'rating',
            label: 'Rating',
            value: ratingFilter,
            onChange: setRatingFilter,
            options: [
              { value: 'all', label: 'All ratings' },
              { value: '5', label: '5 star' },
              { value: '4', label: '4 star' },
              { value: 'low', label: 'Low ratings' },
              { value: 'recent', label: 'Recent reviews' },
            ],
          },
        ]}
        sortValue={sortValue}
        onSortChange={setSortValue}
        sortOptions={[
          { value: '', label: 'Default order' },
          { value: 'rating-desc', label: 'Rating (high to low)' },
          { value: 'rating-asc', label: 'Rating (low to high)' },
          { value: 'recent', label: 'Most recent' },
        ]}
        onClear={handleClearFilters}
        resultText={`Showing ${filteredReviews.length} of ${requests.serviceReviews.length} reviews`}
      />

      {filteredReviews.length === 0 ? (
        <div className="placeholder-card card">
          <p className="placeholder-title">No service reviews match your filters.</p>
        </div>
      ) : (
        <div className="review-card-grid">
          {filteredReviews.map((review) => (
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
