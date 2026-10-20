import { useEffect, useState } from 'react';
import { SLOW_EVENT } from '../../services/api.js';

/**
 * A small notice at the bottom of the screen while any request is taking unusually long, so a
 * sleeping free server or a slow AI answer does not look like a frozen app.
 */
export default function SlowRequestNotice() {
  const [slowCount, setSlowCount] = useState(0);

  useEffect(() => {
    const onSlow = (e) => setSlowCount((n) => Math.max(0, n + (e.detail === 'start' ? 1 : -1)));
    window.addEventListener(SLOW_EVENT, onSlow);
    return () => window.removeEventListener(SLOW_EVENT, onSlow);
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {slowCount > 0 && (
        <p className="glass max-w-md px-4 py-3 text-center text-sm text-slate-200 shadow-neon-purple">
          Still working… Free hosting can take up to a minute to wake up, and AI answers can be slow. Please keep this page open.
        </p>
      )}
    </div>
  );
}
