import { Dream } from '../models/Dream.js';
import { AppError } from '../utils/AppError.js';

// The requested dream (must belong to the user), or the user's newest one (may be null).
export async function findDream(userId, dreamId) {
  if (dreamId) {
    const dream = await Dream.findOne({ _id: dreamId, user: userId });
    if (!dream) throw new AppError('Dream not found', 404);
    return dream;
  }
  return Dream.findOne({ user: userId }).sort({ createdAt: -1 });
}

export async function requireDream(userId, dreamId, message = 'Create a dream first.') {
  const dream = await findDream(userId, dreamId);
  if (!dream) throw new AppError(message, 404);
  return dream;
}
