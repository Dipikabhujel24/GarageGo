import { API_BASE, getApiErrorMessage, readApiResponse } from '../config/api';

export async function fetchMaintenancePredictions(customerId, token) {
  const response = await fetch(`${API_BASE}/api/ai/predict/${customerId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, 'Failed to load AI maintenance alerts.'));
  }

  return data;
}
