import { useState, useEffect, useCallback } from 'react';
import { fetchClaims } from '../services/api';

/**
 * Manages the claims list state including pagination and filters.
 * Returns data, loading/error state, and a refresh function.
 */
export function useClaims(filters) {
  const [claims, setClaims]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchClaims(filters);
      setClaims(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  return { claims, pagination, loading, error, refresh: load };
}
