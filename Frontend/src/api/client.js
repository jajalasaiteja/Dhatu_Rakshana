// Centralized API Client for Dhatu Rakshana
function getBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace('localhost', '127.0.0.1');
  }
  // When running in browser:
  if (typeof window !== 'undefined') {
    // If on Vite dev server (port 5173), target FastAPI dev backend at 127.0.0.1:8000
    if (window.location.port === '5173') {
      return 'http://127.0.0.1:8000';
    }
    // When served standalone by FastAPI or reverse proxy, use same-origin relative URLs
    return '';
  }
  return 'http://127.0.0.1:8000';
}

export const BASE_URL = getBaseUrl();

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

export async function apiClient(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${normalizedEndpoint}`;
  const headers = { ...(options.headers || {}) };
  const token = getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

    if (response.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      throw new Error('Session expired or unauthorized. Please log in.');
    }

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
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      const target = BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000');
      throw new Error(`Unable to connect to backend at ${target}. Ensure FastAPI backend is running.`);
    }
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

apiClient.get = (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'GET' });
apiClient.post = (endpoint, body, options = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiClient(endpoint, {
    ...options,
    method: 'POST',
    body: isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
};
apiClient.put = (endpoint, body, options = {}) => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiClient(endpoint, {
    ...options,
    method: 'PUT',
    body: isFormData ? body : (typeof body === 'string' ? body : JSON.stringify(body)),
    headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
};
apiClient.delete = (endpoint, options = {}) => apiClient(endpoint, { ...options, method: 'DELETE' });

export default apiClient;
