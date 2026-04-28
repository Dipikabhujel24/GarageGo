import React, { useState } from 'react';
import {
  bookAppointment,
  requestUnavailablePart,
  reviewService,
} from '../services/customerFeatureService';

const initialAppointment = {
  vehicleId: '',
  appointmentDate: '',
  serviceType: '',
  description: '',
};

const initialPartRequest = {
  partName: '',
  vehicleModel: '',
  description: '',
};

const initialReview = {
  rating: 5,
  comment: '',
};

function getStoredCustomerId() {
  try {
    const customer = JSON.parse(localStorage.getItem('customer') || '{}');
    return customer.id ? String(customer.id) : '';
  } catch {
    return '';
  }
}

function CustomerServiceRequests() {
  const [customerId, setCustomerId] = useState(getStoredCustomerId());
  const [appointment, setAppointment] = useState(initialAppointment);
  const [partRequest, setPartRequest] = useState(initialPartRequest);
  const [review, setReview] = useState(initialReview);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCustomerLoad = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
  };

  const handleAppointmentSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await bookAppointment({
        customerId: Number(customerId),
        vehicleId: Number(appointment.vehicleId),
        appointmentDate: appointment.appointmentDate,
        serviceType: appointment.serviceType,
        description: appointment.description,
      });
      setAppointment(initialAppointment);
      setMessage('Appointment booked successfully.');
    } catch (submitError) {
      setError(submitError.message || 'Unable to book appointment.');
    }
  };

  const handlePartRequestSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await requestUnavailablePart({
        customerId: Number(customerId),
        partName: partRequest.partName,
        vehicleModel: partRequest.vehicleModel,
        description: partRequest.description,
      });
      setPartRequest(initialPartRequest);
      setMessage('Unavailable part request submitted successfully.');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit part request.');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await reviewService({
        customerId: Number(customerId),
        rating: Number(review.rating),
        comment: review.comment,
      });
      setReview(initialReview);
      setMessage('Service review submitted successfully.');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit service review.');
    }
  };

  return (
    <section className="customer-self-service">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Customer Service Requests</h2>
        <p className="section-copy">
          Book appointments, request unavailable parts, and review completed services.
        </p>
      </div>

      <form className="feature-search-card card" onSubmit={handleCustomerLoad}>
        <label className="form-label" htmlFor="customer-id">
          Customer ID
        </label>
        <div className="feature-search-row">
          <input
            id="customer-id"
            className="input-field"
            type="number"
            min="1"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            required
          />
          <button className="button button-primary" type="submit">
            Load
          </button>
        </div>
      </form>

      {message && <div className="message-banner">{message}</div>}
      {error && <div className="message-banner error">{error}</div>}

      <div className="customer-request-grid">
        <form className="table-card card" onSubmit={handleAppointmentSubmit}>
          <h3 className="staff-card-title card-title">Book Appointment</h3>
          <label className="form-label" htmlFor="appointment-vehicle">Vehicle ID</label>
          <input
            id="appointment-vehicle"
            className="input-field"
            type="number"
            min="1"
            value={appointment.vehicleId}
            onChange={(event) =>
              setAppointment((prev) => ({ ...prev, vehicleId: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="appointment-date">Date and Time</label>
          <input
            id="appointment-date"
            className="input-field"
            type="datetime-local"
            value={appointment.appointmentDate}
            onChange={(event) =>
              setAppointment((prev) => ({ ...prev, appointmentDate: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="service-type">Service Type</label>
          <input
            id="service-type"
            className="input-field"
            value={appointment.serviceType}
            onChange={(event) =>
              setAppointment((prev) => ({ ...prev, serviceType: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="appointment-description">Description</label>
          <textarea
            id="appointment-description"
            className="input-field"
            value={appointment.description}
            onChange={(event) =>
              setAppointment((prev) => ({ ...prev, description: event.target.value }))
            }
          />

          <button className="button button-primary feature-submit" type="submit">
            Book Appointment
          </button>
        </form>

        <form className="table-card card" onSubmit={handlePartRequestSubmit}>
          <h3 className="staff-card-title card-title">Request Unavailable Part</h3>
          <label className="form-label" htmlFor="part-name">Part Name</label>
          <input
            id="part-name"
            className="input-field"
            value={partRequest.partName}
            onChange={(event) =>
              setPartRequest((prev) => ({ ...prev, partName: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="vehicle-model">Vehicle Model</label>
          <input
            id="vehicle-model"
            className="input-field"
            value={partRequest.vehicleModel}
            onChange={(event) =>
              setPartRequest((prev) => ({ ...prev, vehicleModel: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="part-description">Description</label>
          <textarea
            id="part-description"
            className="input-field"
            value={partRequest.description}
            onChange={(event) =>
              setPartRequest((prev) => ({ ...prev, description: event.target.value }))
            }
          />

          <button className="button button-primary feature-submit" type="submit">
            Submit Request
          </button>
        </form>

        <form className="table-card card" onSubmit={handleReviewSubmit}>
          <h3 className="staff-card-title card-title">Review Service</h3>
          <label className="form-label" htmlFor="rating">Rating</label>
          <input
            id="rating"
            className="input-field"
            type="number"
            min="1"
            max="5"
            value={review.rating}
            onChange={(event) =>
              setReview((prev) => ({ ...prev, rating: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="review-comment">Comment</label>
          <textarea
            id="review-comment"
            className="input-field"
            value={review.comment}
            onChange={(event) =>
              setReview((prev) => ({ ...prev, comment: event.target.value }))
            }
          />

          <button className="button button-primary feature-submit" type="submit">
            Submit Review
          </button>
        </form>
      </div>
    </section>
  );
}

export default CustomerServiceRequests;
