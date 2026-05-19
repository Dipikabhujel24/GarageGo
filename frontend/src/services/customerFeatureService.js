import { API_BASE } from '../config/api';
import { getStoredToken } from '../utils/authSession';

const API_BASE_URL = API_BASE;

async function request(path, options = {}) {
  const token = getStoredToken() || localStorage.getItem('token') || '';
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}. Please start or restart the backend server.`);
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const fallbackMessages = {
      401: 'Unauthorized. Please sign in again with an Admin or Staff account.',
      403: 'Access denied. Your account role cannot open this page.',
      404: 'API endpoint not found. Restart the backend so the latest routes are loaded.',
      500: 'Server error while loading data. Check the backend console or runtime log.',
    };

    throw new Error(data?.message || data?.title || fallbackMessages[response.status] || `Request failed with status ${response.status}.`);
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

export function getMyRequests() {
  return request('/api/customer-features/my-requests');
}

export function getAllRequests() {
  return request('/api/customer-features/all-requests');
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
