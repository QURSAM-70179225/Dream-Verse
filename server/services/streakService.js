import { env } from '../config/env.js';
import { UserProgress } from '../models/UserProgress.js';
import { dayKey } from '../utils/day.js';
import { nextStreak, streakBonus } from '../utils/streak.js';
import { getProgress } from './progressService.js';

/**
 * Call after the user does something useful. Counts today once, and pays the streak bonus on the
 * first action of the day. Returns { counted, count, best, xpGained }.
 */
export async function recordActivity(userId, tz = 'UTC', now = new Date()) {
  const progress = await getProgress(userId);
  const today = dayKey(now, tz);
  const prev = {
    count: progress.streak?.count || 0,
    best: progress.streak?.best || 0,
    lastDay: progress.streak?.lastDay || '',
  };
  const next = nextStreak(prev, today);
  if (!next.counted) return { counted: false, count: prev.count, best: prev.best, xpGained: 0 };

  const bonus = streakBonus(next.count, env.game.streakStepXp);
  const update = {
    $set: { 'streak.count': next.count, 'streak.best': next.best, 'streak.lastDay': today },
  };
  if (bonus > 0) {
    update.$inc = { xp: bonus };
    update.$push = {
      xpLog: { $each: [{ amount: bonus, reason: `Daily streak: day ${next.count}`, at: now }], $slice: -200 },
    };
  }
  // Only succeeds if nothing else counted today in the meantime (two requests at once pay once).
  const filter = prev.lastDay
    ? { user: userId, 'streak.lastDay': prev.lastDay }
    : { user: userId, 'streak.lastDay': { $in: ['', null] } };
  const updated = await UserProgress.findOneAndUpdate(filter, update, { new: true });
  if (!updated) return { counted: false, count: prev.count, best: prev.best, xpGained: 0 };
  return { counted: true, count: next.count, best: next.best, xpGained: bonus };
}
