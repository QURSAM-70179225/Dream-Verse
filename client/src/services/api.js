// "?." keeps this file importable from plain Node tests, where import.meta.env does not exist.
const BASE_URL = import.meta.env?.VITE_API_URL || '/api';

// Sent on window when the server rejects a token we sent (expired, or the account was deleted),
// so the app can sign the user out instead of showing errors on every page.
export const UNAUTHORIZED_EVENT = 'dreamverse:unauthorized';

// Free hosting puts an idle server to sleep and takes about a minute to wake it, and AI answers can
// be slow. When a request takes longer than this, the app shows an "still working" notice.
export const SLOW_EVENT = 'dreamverse:slow';
export const apiSettings = { slowAfterMs: 6000 };

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// "Today" for streaks and daily limits is the user's own calendar day.
function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

// Used when the server (or a proxy in front of it) answered without a readable message.
export function fallbackMessage(status) {
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'The server had a problem. Please try again in a moment.';
  return 'Request failed';
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tz = browserTimeZone();
  if (tz) headers['X-Timezone'] = tz;
  if (token) headers.Authorization = `Bearer ${token}`;

  const announce = (state) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SLOW_EVENT, { detail: state }));
  };
  let slow = false;
  const timer = setTimeout(() => {
    slow = true;
    announce('start');
  }, apiSettings.slowAfterMs);
  const finished = () => {
    clearTimeout(timer);
    if (slow) announce('end');
  };

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    finished();
    throw new ApiError('Cannot reach the DreamVerse server. Is it running?', 0);
  }

  const data = await res.json().catch(() => ({}));
  finished();
  if (!res.ok) {
    if (res.status === 401 && token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data.message || fallbackMessage(res.status), res.status, data.details);
  }
  return data;
}

export const getHealth = () => apiRequest('/health');
