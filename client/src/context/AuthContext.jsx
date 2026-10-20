import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { UNAUTHORIZED_EVENT, apiRequest } from '../services/api.js';

const TOKEN_KEY = 'dreamverse_token';
const DEMO_KEY = 'dreamverse_demo';

const AuthContext = createContext(null);

const safeGet = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};
const safeSet = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
};
const safeRemove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
};

const demoUser = { id: 'demo', name: 'Demo Explorer', email: '', demo: true };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => safeGet(localStorage, TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Restore a session on first load.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (safeGet(sessionStorage, DEMO_KEY)) {
        setUser(demoUser);
        setToken(null);
      } else if (token) {
        try {
          const data = await apiRequest('/auth/me', { token });
          if (!cancelled) setUser(data.user);
        } catch (err) {
          // Only drop the token if the server rejected it; keep it if the API is simply offline.
          if (err.status === 401) {
            safeRemove(localStorage, TOKEN_KEY);
            if (!cancelled) setToken(null);
          }
        }
      }
      if (!cancelled) setLoading(false);
    }
    restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeAuth = useCallback((data) => {
    safeRemove(sessionStorage, DEMO_KEY);
    safeSet(localStorage, TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
      completeAuth(data);
    },
    [completeAuth]
  );

  const register = useCallback(
    async (name, email, password) => {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });
      completeAuth(data);
    },
    [completeAuth]
  );

  const startDemo = useCallback(() => {
    safeRemove(localStorage, TOKEN_KEY);
    safeSet(sessionStorage, DEMO_KEY, '1');
    setToken(null);
    setUser(demoUser);
  }, []);

  const logout = useCallback(() => {
    safeRemove(localStorage, TOKEN_KEY);
    safeRemove(sessionStorage, DEMO_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // The server rejected our token mid-session (expired or account removed): sign out cleanly.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({ user, token, loading, login, register, startDemo, logout }),
    [user, token, loading, login, register, startDemo, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
