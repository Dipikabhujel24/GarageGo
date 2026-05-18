import { getStoredToken } from '../utils/authSession';

const API_BASE_URL =
  process.env.REACT_APP_API_URL?.trim() || 'http://localhost:5000';

async function request(path, options = {}) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
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

export function getLoggedInCustomerServiceHistory() {
  return request('/api/customers/service-history');
}

export async function downloadCustomerHistoryPdf(historyId) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/api/customers/service-history/${historyId}/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const blob = await response.blob();

  if (!response.ok) {
    const errorText = await blob.text();
    let message = 'Failed to download PDF.';

    try {
      const data = errorText ? JSON.parse(errorText) : null;
      message = data?.message || message;
    } catch {
      if (errorText) {
        message = errorText;
      }
    }

    throw new Error(message);
  }

  return blob;
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
