import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { apiRequest } from '../services/api.js';
import { demoPayload } from '../utils/demoData.js';

const ProgressContext = createContext(null);

// Loads the signed-in user's progress (XP, level, dream, roadmap, achievements) once and shares it.
// In demo mode it serves clearly-labeled sample data instead.
export function ProgressProvider({ children }) {
  const { user, token } = useAuth();
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [levelUp, setLevelUp] = useState(null);
  const levelRef = useRef(null);

  // Every new progress payload goes through here so a level increase is noticed wherever it
  // happens (ticking a task, a decision, a visit in the 3D world ...).
  const commit = useCallback((data) => {
    if (data && typeof data.level === 'number') {
      if (levelRef.current !== null && data.level > levelRef.current) {
        setLevelUp({ level: data.level, title: data.title });
      }
      levelRef.current = data.level;
    }
    setState({ data, loading: false, error: '' });
  }, []);

  // refresh({ silent: true }) updates the data without showing a loading state (used inside the
  // 3D world so the scene is never replaced by a spinner).
  const refresh = useCallback(async (options) => {
    if (!user) return;
    if (user.demo) {
      commit(demoPayload);
      return;
    }
    const silent = options?.silent === true;
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiRequest('/progress', { token });
      commit(data);
    } catch (err) {
      if (!silent) setState({ data: null, loading: false, error: err.message });
    }
  }, [user, token, commit]);

  // Use a progress payload the server already returned (for example after ticking a task).
  const apply = useCallback((data) => commit(data), [commit]);
  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      progress: state.data,
      loading: state.loading,
      error: state.error,
      isSample: Boolean(user?.demo),
      refresh,
      apply,
      levelUp,
      dismissLevelUp,
    }),
    [state, user, refresh, apply, levelUp, dismissLevelUp]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}
