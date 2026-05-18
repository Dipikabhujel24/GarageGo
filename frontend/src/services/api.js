import { getApiErrorMessage, readApiResponse } from '../config/api';
import { getStoredToken } from '../utils/authSession';

const API_BASE_URL = 'http://localhost:5000/api';

const request = async (path, options = {}) => {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(data, `Request failed with status ${response.status}`)
    );
  }

  if (response.status === 204) {
    return { data: null };
  }

  return { data };
};

export const extractApiError = (error, fallbackMessage = 'Request failed') =>
  error?.message || fallbackMessage;

export const getVendors = () => request('/vendors');

export const createVendor = (data) =>
  request('/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateVendor = (id, data) =>
  request(`/vendors/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, id }),
  });

export const deleteVendor = (id) =>
  request(`/vendors/${id}`, {
    method: 'DELETE',
  });

export const getParts = () => request('/parts');

export const createPart = (data) =>
  request('/parts', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updatePart = (id, data) =>
  request(`/parts/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, id }),
  });

export const deletePart = (id) =>
  request(`/parts/${id}`, {
    method: 'DELETE',
  });

export const getSalesCatalog = () => request('/sales/catalog');

export const createSale = (data) =>
  request('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const sendInvoiceEmail = (payload) =>
  request('/sales/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
