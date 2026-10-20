import { previousDayKey } from './day.js';

// Daily streak rules (pure functions, no database).
// Doing something useful (completing a task, making a decision, first visit to a building) counts
// the day. The first useful action of a day pays a small bonus that grows with the streak:
// step * min(streak day, 5). Only one bonus per day, so it cannot be farmed.
export const STREAK_MAX_STEPS = 5;

export const streakBonus = (count, step) => Math.max(0, step) * Math.min(Math.max(count, 0), STREAK_MAX_STEPS);

const EMPTY = { count: 0, best: 0, lastDay: '' };

/** The streak after an activity on `today`. counted=false when today was already counted. */
export function nextStreak(prev = EMPTY, today) {
  const before = { ...EMPTY, ...prev };
  if (before.lastDay === today) {
    return { counted: false, count: before.count, best: before.best, lastDay: before.lastDay };
  }
  const count = before.lastDay === previousDayKey(today) ? before.count + 1 : 1;
  return { counted: true, count, best: Math.max(before.best, count), lastDay: today };
}

/** What the app shows: the streak that is still alive today and what the next action would pay. */
export function streakView(streak = EMPTY, today, step) {
  const s = { ...EMPTY, ...streak };
  if (s.lastDay === today) {
    return { count: s.count, best: s.best, doneToday: true, todayBonus: 0 };
  }
  const alive = s.lastDay === previousDayKey(today);
  const count = alive ? s.count : 0;
  return { count, best: s.best, doneToday: false, todayBonus: streakBonus(count + 1, step) };
}
