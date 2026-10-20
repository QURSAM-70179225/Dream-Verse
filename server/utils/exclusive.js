import { AppError } from './AppError.js';

// Only one slow job per key at a time (for example one AI request per user), so a double click
// cannot spend tokens twice.
const inFlight = new Set();

export async function exclusive(key, work) {
  if (inFlight.has(key)) {
    throw new AppError('Already working on that. Please wait a moment.', 409);
  }
  inFlight.add(key);
  try {
    return await work();
  } finally {
    inFlight.delete(key);
  }
}
