import { createContext, useContext, useState, useCallback } from 'react';
import { getToken, setToken as persistToken } from '../api/client';

const AuthContext = createContext(null);

const STAFF_KEY = 'clinic_staff_user';

function loadStoredStaff() {
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(loadStoredStaff);
  const [token, setTokenState] = useState(getToken);

  const applySession = useCallback((newToken, newStaff) => {
    persistToken(newToken);
    localStorage.setItem(STAFF_KEY, JSON.stringify(newStaff));
    setTokenState(newToken);
    setStaff(newStaff);
  }, []);

  const logout = useCallback(() => {
    persistToken(null);
    localStorage.removeItem(STAFF_KEY);
    setTokenState(null);
    setStaff(null);
  }, []);

  const value = { staff, token, isAuthenticated: Boolean(token), applySession, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
