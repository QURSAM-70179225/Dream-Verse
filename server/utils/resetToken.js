import { createHash, randomBytes } from 'node:crypto';

export const RESET_TTL_MINUTES = 60;
export const RESET_TTL_MS = RESET_TTL_MINUTES * 60 * 1000;
// A person can ask for a new link at most once a minute (stops email spam to one address).
export const RESET_COOLDOWN_MS = 60 * 1000;

export const hashResetToken = (token) => createHash('sha256').update(String(token)).digest('hex');

/** A fresh random token. Only `token` goes in the email; only `tokenHash` is stored. */
export function createResetToken(now = new Date()) {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token), expiresAt: new Date(now.getTime() + RESET_TTL_MS) };
}

export const isCoolingDown = (requestedAt, now = new Date()) =>
  Boolean(requestedAt) && now.getTime() - new Date(requestedAt).getTime() < RESET_COOLDOWN_MS;
