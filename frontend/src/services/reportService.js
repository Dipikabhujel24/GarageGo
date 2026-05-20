import axios from 'axios';
import { API_BASE } from '../config/api';
import { getStoredToken } from '../utils/authSession';

const REPORTS_API_BASE_URL = API_BASE;

const reportsApi = axios.create({
  baseURL: `${REPORTS_API_BASE_URL}/api/reports`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

reportsApi.interceptors.request.use((config) => {
  const token = getStoredToken() || localStorage.getItem('token') || '';

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

export async function getRegularCustomerReports() {
  const response = await reportsApi.get('/customers/regulars');
  return response.data;
}

export async function getHighSpenderCustomerReports() {
  const response = await reportsApi.get('/customers/high-spenders');
  return response.data;
}

export async function getPendingCreditCustomerReports() {
  const response = await reportsApi.get('/customers/pending-credits');
  return response.data;
}

export async function getCustomerReportsSummary() {
  const response = await reportsApi.get('/customers/summary');
  return response.data;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportPendingCreditsCsv() {
  const response = await reportsApi.get('/customers/pending-credits/export/csv', {
    responseType: 'blob',
  });
  downloadBlob(response.data, 'pending-credits.csv');
}

export async function exportPendingCreditsPdf() {
  const response = await reportsApi.get('/customers/pending-credits/export/pdf', {
    responseType: 'blob',
  });
  downloadBlob(response.data, 'pending-credits.pdf');
}
