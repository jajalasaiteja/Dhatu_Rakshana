import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient, {
  setAuthToken,
  clearAuthToken,
  setVisitorToken,
  clearVisitorToken
} from '../api/client';
import { formatISTDateTime } from '../utils/dateTime';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Certified Inspector Authentication State
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

  // Dedicated Visitor Authentication State (Logically Separate)
  const [visitorUser, setVisitorUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('visitor_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [visitorToken, setVisitorTokenState] = useState(() => sessionStorage.getItem('visitor_token'));

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    const handleVisitorUnauthorized = () => {
      setVisitorUser(null);
      setVisitorTokenState(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('visitor:unauthorized', handleVisitorUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('visitor:unauthorized', handleVisitorUnauthorized);
    };
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

  // Inspector Authentication Methods
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

  // Dedicated Visitor Authentication Methods
  const loginVisitor = async (username) => {
    const trimmed = (username || '').trim();
    if (!trimmed) {
      throw new Error('Visitor username is required.');
    }

    const data = await apiClient('/visitors/access', {
      method: 'POST',
      body: JSON.stringify({ username: trimmed })
    });

    const vUser = {
      username: data.username,
      session_id: data.session_id,
      role: 'visitor',
      accessed_at: data.accessed_at || formatISTDateTime(new Date())
    };

    setVisitorToken(data.access_token, vUser);
    setVisitorTokenState(data.access_token);
    setVisitorUser(vUser);

    return data;
  };

  const logoutVisitor = () => {
    clearVisitorToken();
    setVisitorUser(null);
    setVisitorTokenState(null);
  };

  const value = {
    // Inspector session
    user,
    token,
    role: user?.role || 'inspector',
    isAuthenticated: Boolean(token),
    loading,
    login,
    register,
    logout,

    // Visitor session
    visitorUser,
    visitorToken,
    isVisitorAuthenticated: Boolean(visitorToken),
    loginVisitor,
    logoutVisitor
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
