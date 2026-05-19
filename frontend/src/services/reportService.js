import axios from 'axios';

const REPORTS_API_BASE_URL =
  process.env.REACT_APP_API_URL?.trim() || 'http://localhost:5000';

const reportsApi = axios.create({
  baseURL: `${REPORTS_API_BASE_URL}/api/reports`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

reportsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function extractReportApiError(error, fallbackMessage) {
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Please verify the backend server is running.';
  }

  if (error?.code === 'ERR_NETWORK') {
    return `Network error. Confirm the API is reachable at ${REPORTS_API_BASE_URL}.`;
  }

  return (
    error?.response?.data?.message ||
    error?.response?.data?.title ||
    error?.message ||
    fallbackMessage
  );
}

export async function getDailyReports() {
  const response = await reportsApi.get('/daily');
  return response.data;
}

export async function getMonthlyReports() {
  const response = await reportsApi.get('/monthly');
  return response.data;
}

export async function getYearlyReports() {
  const response = await reportsApi.get('/yearly');
  return response.data;
}

export async function getSalesTrends() {
  const response = await reportsApi.get('/sales-trends');
  return response.data;
}

export async function getTopSellingParts() {
  const response = await reportsApi.get('/top-selling-parts');
  return response.data;
}

export async function getDashboardMetrics() {
  const response = await reportsApi.get('/dashboard-metrics');
  return response.data;
}
