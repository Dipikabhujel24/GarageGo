import { getStoredToken } from '../utils/authSession';
import { API_BASE } from '../config/api';

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
    throw new Error(`Cannot connect to backend at ${API_BASE_URL}.`);
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
    throw new Error(data?.message || data?.title || `Request failed with status ${response.status}.`);
  }

  return data;
}

export const APPOINTMENT_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'In Progress',
  'Completed',
  'Cancelled',
];

export const PART_REQUEST_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Ordered',
  'Available',
  'Fulfilled',
];

export function getAdminAppointments() {
  return request('/api/admin/appointments');
}

export function updateAppointmentStatus(id, payload) {
  return request(`/api/admin/appointments/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getAdminPartRequests() {
  return request('/api/admin/part-requests');
}

export function updatePartRequestStatus(id, payload) {
  return request(`/api/admin/part-requests/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getCustomerAppointments() {
  return request('/api/customer/appointments');
}

export function getCustomerPartRequests() {
  return request('/api/customer/part-requests');
}
