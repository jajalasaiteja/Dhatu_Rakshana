// Centralized API Client for Dhatu Rakshana
// Supports standalone FastAPI serving (same origin relative path), Vite dev server dynamic proxy/host targeting,
// and explicit remote deployment base URLs.

export const API_PREFIX = (import.meta.env.VITE_API_PREFIX || '/api/v1').trim();

/**
 * Resolves the backend base URL dynamically without hardcoding localhost or breaking cross-device access.
 */
export function getBaseUrl() {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

  // If in a browser environment:
  if (typeof window !== 'undefined') {
    const isDevPort = window.location.port === '5173' || window.location.port === '3000';

    // When served standalone by FastAPI (e.g. port 8000) or reverse proxy:
    // Use same-origin relative URLs ("") to prevent CORS issues, localhost binding mismatch, or cross-device breakage.
    if (!isDevPort) {
      return '';
    }

    // When running under Vite dev server (port 5173 / 3000):
    // If an explicit non-localhost envUrl was provided, use it:
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl.replace(/\/+$/, '');
    }

    // Dynamically target backend on port 8000 using the browser's current active hostname
    // (e.g., http://localhost:8000, http://127.0.0.1:8000, or http://192.168.1.100:8000)
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || '127.0.0.1';
    return `${protocol}//${hostname}:8000`;
  }

  // Non-browser / SSR fallback
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:8000';
}

export const BASE_URL = getBaseUrl();

/**
 * Standardizes API endpoint paths ensuring canonical API prefix (/api/v1) is respected.
 */
export function normalizeApiPath(endpoint) {
  if (!endpoint) return API_PREFIX;
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If already prefixed with /api/v1, /files, /standards, /health, /ready, /docs, /openapi.json
  if (
    clean.startsWith('/api/v1/') ||
    clean === '/api/v1' ||
    clean.startsWith('/files/') ||
    clean.startsWith('/standards/') ||
    clean === '/health' ||
    clean === '/ready'
  ) {
    return clean;
  }

  // If prefixed with legacy /api/, upgrade to canonical /api/v1/
  if (clean.startsWith('/api/')) {
    return `${API_PREFIX}${clean.substring(4)}`;
  }

  // Prepend canonical API prefix
  return `${API_PREFIX}${clean}`;
}

export function getAuthToken() {
  return sessionStorage.getItem('access_token') || sessionStorage.getItem('dhatu_access_token');
}

export function setAuthToken(token) {
  if (token) {
    sessionStorage.setItem('access_token', token);
    sessionStorage.setItem('dhatu_access_token', token);
  } else {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('dhatu_access_token');
  }
}

export function clearAuthToken() {
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('dhatu_access_token');
  sessionStorage.removeItem('user');
}

export function getVisitorToken() {
  return sessionStorage.getItem('visitor_token');
}

export function setVisitorToken(token, user) {
  if (token) {
    sessionStorage.setItem('visitor_token', token);
    if (user) {
      sessionStorage.setItem('visitor_user', JSON.stringify(user));
    }
  } else {
    sessionStorage.removeItem('visitor_token');
    sessionStorage.removeItem('visitor_user');
  }
}

export function clearVisitorToken() {
  sessionStorage.removeItem('visitor_token');
  sessionStorage.removeItem('visitor_user');
}

// Ensure no stale inspection caches exist in client storage
if (typeof window !== 'undefined') {
  try {
    const staleKeys = [
      'inspections',
      'records',
      'visitor_records',
      'cached_inspections',
      'inspection_cache',
      'dhatu_inspections',
      'historical_inspections'
    ];
    staleKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    });
  } catch {
    // Storage access restricted or disabled
  }
}

export async function apiClient(endpoint, options = {}) {
  const normalizedEndpoint = normalizeApiPath(endpoint);
  const url = `${BASE_URL}${normalizedEndpoint}`;
  const headers = { ...(options.headers || {}) };

  const isVisitorRequest = normalizedEndpoint.includes('/visitors/records') || options.useVisitorToken;
  const token = isVisitorRequest
    ? getVisitorToken()
    : options.forceAuthToken
    ? getAuthToken()
    : getAuthToken() ||
      (normalizedEndpoint.includes('/visitors/') && !normalizedEndpoint.includes('/visitors/logs')
        ? getVisitorToken()
        : null);

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure requests are never served from obsolete browser cache
  if (!headers['Cache-Control']) {
    headers['Cache-Control'] = 'no-cache';
  }
  if (!headers['Pragma']) {
    headers['Pragma'] = 'no-cache';
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.responseType !== 'blob') {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 401 Unauthorized
    if (response.status === 401) {
      if (isVisitorRequest) {
        clearVisitorToken();
        window.dispatchEvent(new CustomEvent('visitor:unauthorized'));
        const err = new Error('Visitor session expired or unauthorized. Please re-enter your username.');
        err.status = 401;
        err.isAuthError = true;
        throw err;
      } else {
        clearAuthToken();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        const err = new Error('Session expired or unauthorized. Please log in.');
        err.status = 401;
        err.isAuthError = true;
        throw err;
      }
    }

    // 403 Forbidden
    if (response.status === 403) {
      const err = new Error('Access forbidden: Insufficient administrative privileges.');
      err.status = 403;
      err.isForbidden = true;
      throw err;
    }

    // 404 Not Found
    if (response.status === 404) {
      let errorMsg = 'Requested inspection resource was not found.';
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorMsg;
      } catch {
        // use default error message
      }
      const notFoundErr = new Error(errorMsg);
      notFoundErr.status = 404;
      notFoundErr.isNotFound = true;
      throw notFoundErr;
    }

    // 503 Backend Initializing
    if (response.status === 503) {
      const initErr = new Error('Inspection backend is currently initializing. Please retry in a moment.');
      initErr.status = 503;
      initErr.isStartingUp = true;
      throw initErr;
    }

    // Other non-OK HTTP status
    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.detail || errorData.message || errorMsg;
      } catch {
        // use default error message
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    if (options.responseType === 'blob') {
      return await response.blob();
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
      return await response.blob();
    }
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    // Specifically catch network failures (backend stopped, connection refused, CORS failure)
    if (
      (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) ||
      error.message.includes('Failed to fetch')
    ) {
      const target = BASE_URL || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8000` : 'http://127.0.0.1:8000');
      throw new Error(`Unable to connect to backend at ${target}. Ensure FastAPI backend is running.`);
    }
    // Re-throw specific domain / HTTP errors without translating them to network disconnection
    throw error;
  }
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Downloads the authoritative processed inspection PDF report from the backend.
 * Uses authenticated GET /inspections/{id}/report, creates a blob URL, and triggers download.
 */
export async function downloadInspectionReport(inspectionId) {
  const blob = await apiClient(`/inspections/${inspectionId}/report`, {
    method: 'GET',
    responseType: 'blob',
  });

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = `dhatu-rakshana-report-${inspectionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke blob URL after brief delay
  setTimeout(() => {
    window.URL.revokeObjectURL(blobUrl);
  }, 1000);
}

/**
 * Probes the backend health check endpoint.
 */
export async function checkBackendHealth() {
  try {
    const data = await apiClient('/health', { method: 'GET' });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Convenience HTTP helpers
apiClient.get = (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' });
apiClient.post = (endpoint, body, options = {}) => {
  return apiClient(endpoint, {
    ...options,
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
};
apiClient.put = (endpoint, body, options = {}) => {
  return apiClient(endpoint, {
    ...options,
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
};
apiClient.delete = (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' });

export default apiClient;
