'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useRealtimeData - Custom hook for polling data from API endpoints
 * 
 * @param {string} endpoint - API endpoint (/api/attendance, /api/sales, /api/prices)
 * @param {object} options - Configuration options
 * @param {string} options.company - Company filter (PROtech or Revive)
 * @param {number} options.pollInterval - Polling interval in milliseconds (default: 4000ms)
 * @param {object} options.queryParams - Additional query parameters for the API
 * @param {function} options.onDataChange - Callback when data changes
 * @param {boolean} options.enabled - Enable/disable polling (default: true)
 * @returns {object} - { data, error, isLoading, refetch, lastUpdate }
 */
export function useRealtimeData(endpoint, options = {}) {
  const {
    company = 'PROtech',
    pollInterval = 4000, // 4 seconds default
    queryParams = {},
    onDataChange = null,
    enabled = true
  } = options;

  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const previousDataRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.append('company', company);
    
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    return params.toString();
  }, [company, queryParams]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setIsLoading(true);
      
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const queryString = buildQueryString();
      const url = `${endpoint}?${queryString}`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const newData = result.data;
        
        // Check if data has changed
        const dataChanged = JSON.stringify(previousDataRef.current) !== JSON.stringify(newData);
        
        if (dataChanged) {
          setData(newData);
          previousDataRef.current = newData;
          setLastUpdate(new Date());
          
          // Call change callback if provided
          if (onDataChange) {
            onDataChange(newData);
          }
        }
      }

      setError(null);
    } catch (err) {
      // Ignore abort errors
      if (err.name !== 'AbortError') {
        console.error(`Error fetching from ${endpoint}:`, err);
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, company, buildQueryString, enabled, onDataChange]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Fetch immediately on mount or when dependencies change
    fetchData();

    // Set up interval for polling
    pollIntervalRef.current = setInterval(fetchData, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchData, pollInterval]);

  return {
    data,
    error,
    isLoading,
    refetch: fetchData,
    lastUpdate
  };
}

/**
 * useSyncedRealtimeData - Enhanced version that keeps local state in sync with API
 * 
 * @param {string} endpoint - API endpoint
 * @param {object} options - Configuration options (includes all useRealtimeData options)
 * @param {object} options.localData - Local component state data
 * @param {function} options.onSync - Callback when syncing local data with server
 * @returns {object} - { data, error, isLoading, refetch, lastUpdate, isSynced }
 */
export function useSyncedRealtimeData(endpoint, options = {}) {
  const {
    localData = [],
    onSync = null,
    ...realtimeOptions
  } = options;

  const [isSynced, setIsSynced] = useState(true);
  const localDataRef = useRef(localData);

  const handleDataChange = useCallback((apiData) => {
    // Check if local data differs from server
    if (JSON.stringify(localDataRef.current) !== JSON.stringify(apiData)) {
      setIsSynced(false);
      
      // Call sync callback to update local state
      if (onSync) {
        onSync(apiData);
      }
    } else {
      setIsSynced(true);
    }
  }, [onSync]);

  const realtimeData = useRealtimeData(endpoint, {
    ...realtimeOptions,
    onDataChange: handleDataChange
  });

  useEffect(() => {
    localDataRef.current = localData;
  }, [localData]);

  return {
    ...realtimeData,
    isSynced
  };
}
