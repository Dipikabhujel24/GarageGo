import { useCallback, useEffect, useState } from 'react';
import { getMyRequests, getMyVehicles, getServiceTypes } from '../services/customerFeatureService';

function normalizeMyRequests(data) {
  if (!data) {
    return { appointments: [], partRequests: [], serviceReviews: [] };
  }

  return {
    appointments: data.appointments || data.Appointments || [],
    partRequests: data.partRequests || data.PartRequests || [],
    serviceReviews: data.serviceReviews || data.ServiceReviews || [],
  };
}

export function useMyCustomerRequests({ loadVehicles = false, loadServiceTypes = false } = {}) {
  const [requests, setRequests] = useState({ appointments: [], partRequests: [], serviceReviews: [] });
  const [vehicles, setVehicles] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const tasks = [getMyRequests()];
      if (loadVehicles) {
        tasks.push(getMyVehicles());
      }
      if (loadServiceTypes) {
        tasks.push(getServiceTypes());
      }

      const results = await Promise.all(tasks);
      const requestsData = normalizeMyRequests(results[0]);

      setRequests(requestsData);

      if (loadVehicles) {
        const loadedVehicles = Array.isArray(results[1]) ? results[1] : [];
        setVehicles(loadedVehicles);
      }

      if (loadServiceTypes) {
        const typeIndex = loadVehicles ? 2 : 1;
        const loadedTypes = Array.isArray(results[typeIndex]) ? results[typeIndex] : [];
        setServiceTypes(loadedTypes);
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your records.');
    } finally {
      setIsLoading(false);
    }
  }, [loadServiceTypes, loadVehicles]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    requests,
    vehicles,
    serviceTypes,
    isLoading,
    error,
    setError,
    reload,
  };
}

export function formatCustomerRequestDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
