import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loginRequest, signupRequest } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('campus_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('campus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const persist = (nextToken, nextUser) => {
    localStorage.setItem('campus_token', nextToken);
    localStorage.setItem('campus_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const login = useCallback(async (payload) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { token: t, user: u } = await loginRequest(payload);
      persist(t, u);
      return true;
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Login failed. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signup = useCallback(async (payload) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const { token: t, user: u } = await signupRequest(payload);
      persist(t, u);
      return true;
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Sign up failed. Please try again.');
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_user');
    setToken(null);
    setUser(null);
  }, []);

  // If the backend ever rejects our token (expired/invalid), force a clean logout
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('campus-auth-expired', handler);
    return () => window.removeEventListener('campus-auth-expired', handler);
  }, [logout]);

  const bumpOrderCount = useCallback(() => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, order_count: prev.order_count + 1 };
      localStorage.setItem('campus_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, signup, logout, authError, authLoading, bumpOrderCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
