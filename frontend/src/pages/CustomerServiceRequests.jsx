import React, { useEffect, useMemo, useState } from 'react';
import {
  bookAppointment,
  getMyVehicles,
  getServiceTypes,
  requestUnavailablePart,
  reviewService,
} from '../services/customerFeatureService';
import { getStoredAuthUser } from '../utils/authSession';

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

function CustomerServiceRequests() {
  const customer = getStoredAuthUser();
  const customerName = customer?.name || 'Customer';
  const [vehicles, setVehicles] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appointment, setAppointment] = useState(initialAppointment);
  const [partRequest, setPartRequest] = useState(initialPartRequest);
  const [review, setReview] = useState(initialReview);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRequestOptions = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [loadedVehicles, loadedServiceTypes] = await Promise.all([
          getMyVehicles(),
          getServiceTypes(),
        ]);

        if (!isMounted) {
          return;
        }

        const normalizedVehicles = Array.isArray(loadedVehicles) ? loadedVehicles : [];
        const normalizedServiceTypes = Array.isArray(loadedServiceTypes) ? loadedServiceTypes : [];

        setVehicles(normalizedVehicles);
        setServiceTypes(normalizedServiceTypes);
        setAppointment((previous) => ({
          ...previous,
          vehicleId: previous.vehicleId || String(normalizedVehicles[0]?.id || ''),
          serviceType: previous.serviceType || normalizedServiceTypes[0] || '',
        }));
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || 'Unable to load request options.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRequestOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === appointment.vehicleId) || null,
    [appointment.vehicleId, vehicles]
  );

  const handleAppointmentSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await bookAppointment({
        vehicleId: Number(appointment.vehicleId),
        appointmentDate: appointment.appointmentDate,
        serviceType: appointment.serviceType,
        description: appointment.description,
      });

      setAppointment({
        ...initialAppointment,
        vehicleId: String(vehicles[0]?.id || ''),
        serviceType: serviceTypes[0] || '',
      });
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
        <h2 className="section-title card-title">Customer Requests</h2>
        <p className="section-copy">
          {customerName}, book appointments, request unavailable parts, and review completed services.
        </p>
      </div>

      {message && <div className="message-banner">{message}</div>}
      {error && <div className="message-banner error">{error}</div>}
      {isLoading && <div className="message-banner">Loading your request options...</div>}

      <div className="customer-request-grid">
        <form className="table-card card" onSubmit={handleAppointmentSubmit}>
          <h3 className="staff-card-title card-title">Book Appointment</h3>

          <label className="form-label" htmlFor="appointment-vehicle">Vehicle</label>
          <select
            id="appointment-vehicle"
            className="input-field"
            value={appointment.vehicleId}
            onChange={(event) =>
              setAppointment((previous) => ({ ...previous, vehicleId: event.target.value }))
            }
            required
            disabled={vehicles.length === 0}
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.make} {vehicle.model} ({vehicle.year}) {vehicle.licensePlate ? `- ${vehicle.licensePlate}` : ''}
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="appointment-date">Date and Time</label>
          <input
            id="appointment-date"
            className="input-field"
            type="datetime-local"
            value={appointment.appointmentDate}
            onChange={(event) =>
              setAppointment((previous) => ({ ...previous, appointmentDate: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="service-type">Service Type</label>
          <select
            id="service-type"
            className="input-field"
            value={appointment.serviceType}
            onChange={(event) =>
              setAppointment((previous) => ({ ...previous, serviceType: event.target.value }))
            }
            required
          >
            <option value="">Select a service</option>
            {serviceTypes.map((serviceType) => (
              <option key={serviceType} value={serviceType}>
                {serviceType}
              </option>
            ))}
          </select>

          <label className="form-label" htmlFor="appointment-description">Description</label>
          <textarea
            id="appointment-description"
            className="input-field"
            value={appointment.description}
            onChange={(event) =>
              setAppointment((previous) => ({ ...previous, description: event.target.value }))
            }
          />

          <button className="button button-primary feature-submit" type="submit" disabled={vehicles.length === 0}>
            {vehicles.length === 0 ? 'Add a vehicle first' : 'Book Appointment'}
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
              setPartRequest((previous) => ({ ...previous, partName: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="vehicle-model">Vehicle Model</label>
          <input
            id="vehicle-model"
            className="input-field"
            value={partRequest.vehicleModel}
            onChange={(event) =>
              setPartRequest((previous) => ({ ...previous, vehicleModel: event.target.value }))
            }
            placeholder={selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Enter vehicle model'}
            required
          />

          <label className="form-label" htmlFor="part-description">Description</label>
          <textarea
            id="part-description"
            className="input-field"
            value={partRequest.description}
            onChange={(event) =>
              setPartRequest((previous) => ({ ...previous, description: event.target.value }))
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
              setReview((previous) => ({ ...previous, rating: event.target.value }))
            }
            required
          />

          <label className="form-label" htmlFor="review-comment">Comment</label>
          <textarea
            id="review-comment"
            className="input-field"
            value={review.comment}
            onChange={(event) =>
              setReview((previous) => ({ ...previous, comment: event.target.value }))
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
