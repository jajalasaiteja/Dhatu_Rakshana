const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthToken() {
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
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = { ...(options.headers || {}) };
  const token = getAuthToken();

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
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
      } catch (e) {
        // use default error message
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(`Unable to connect to backend at ${BASE_URL}. Ensure FastAPI is running.`);
    }
    throw error;
  }
}

export function resolveMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export default apiClient;
