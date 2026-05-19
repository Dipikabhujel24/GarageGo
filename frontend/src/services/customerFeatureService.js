import { API_BASE } from '../config/api';
import { getStoredToken } from '../utils/authSession';

const API_BASE_URL = API_BASE;

async function request(path, options = {}) {
  const token = getStoredToken() || localStorage.getItem('token') || '';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.title || 'Request failed.');
  }

  return data;
}

export function searchCustomers(query) {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('query', query.trim());
  }

  return request(`/api/staff-customers/search?${params.toString()}`);
}

export function getCustomerDetails(customerId) {
  return request(`/api/staff-customers/${customerId}`);
}

export function getCustomerVehicles(customerId) {
  return request(`/api/customer-features/${customerId}/vehicles`);
}

export function getCustomerServiceHistory(customerId) {
  return request(`/api/customer-features/${customerId}/service-history`);
}

export function getServiceTypes() {
  return request('/api/customer-features/service-types');
}

export function getMyVehicles() {
  return request('/api/customers/vehicles');
}

export function bookAppointment(payload) {
  return request('/api/customer-features/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function requestUnavailablePart(payload) {
  return request('/api/customer-features/part-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function reviewService(payload) {
  return request('/api/customer-features/service-reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
