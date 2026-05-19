import axios from 'axios';

const STAFF_API_BASE_URL =
  process.env.REACT_APP_API_URL?.trim() || 'http://localhost:5000';

const staffApi = axios.create({
  baseURL: `${STAFF_API_BASE_URL}/api/staff`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

staffApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function extractApiErrorMessage(error, fallbackMessage) {
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Please verify the backend server is running.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return `Network error. Confirm the API is reachable at ${STAFF_API_BASE_URL} and CORS is enabled.`;
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    fallbackMessage
  );
}

export async function getStaff() {
  const response = await staffApi.get('/');
  return response.data;
}

export async function addStaff(payload) {
  const response = await staffApi.post('/', payload);
  return response.data;
}

export async function updateStaff(staffId, payload) {
  const response = await staffApi.put(`/${staffId}`, payload);
  return response.data;
}

export async function updateStaffStatus(staffId, status) {
  const response = await staffApi.patch(`/${staffId}/status`, { status });
  return response.data;
}

export async function getStaffActivity() {
  const response = await staffApi.get('/activity');
  return response.data;
}

export async function deleteStaff(staffId) {
  await staffApi.delete(`/${staffId}`);
}
