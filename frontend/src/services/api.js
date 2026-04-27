const API_BASE_URL = 'http://localhost:5000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return { data: null };
  }

  return { data: await response.json() };
};

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
