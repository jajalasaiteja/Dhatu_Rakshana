import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setAuthToken, clearAuthToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const savedToken = sessionStorage.getItem('access_token');
      if (!savedToken) {
        if (isMounted) setLoading(false);
        return;
      }
      try {
        const userData = await apiClient('/auth/me');
        if (isMounted) {
          setUser(userData);
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (err) {
        if (err.status === 401) {
          clearAuthToken();
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier, password) => {
    const payload = identifier.includes('@')
      ? { email: identifier, password }
      : { username: identifier, password };

    const data = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setAuthToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setLoading(false);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    return data.user;
  };

  const register = async (email, password, full_name, username) => {
    await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name, username })
    });
    // Auto-login after registration
    return await login(email, password);
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    role: user?.role || 'inspector',
    isAuthenticated: Boolean(token),
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
