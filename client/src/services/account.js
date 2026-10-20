import { apiRequest } from './api.js';

// Always answers the same way, whether or not the email has an account.
// `delivery` is "email", "console" (development: the link is in the server terminal) or "none".
export const requestPasswordReset = (email) =>
  apiRequest('/auth/forgot-password', { method: 'POST', body: { email } });

export const resetPassword = (token, password) =>
  apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } });
