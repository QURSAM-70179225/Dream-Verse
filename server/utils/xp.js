import { dayKey, previousDayKey } from './day.js';

export const XP_PER_LEVEL = 500;

// Server-controlled XP amounts. The client never decides how much XP is awarded.
export const XP = {
  task: 10,
  milestone: 50,
  decision: 20, // per new scenario, see MAX_XP_DECISIONS_PER_DAY
  visit: 10, // first visit to each interior of the 3D world
};

// Decisions beyond this many XP-earning ones per day (in the user's time zone) still work but give no XP.
export const MAX_XP_DECISIONS_PER_DAY = 3;

// The interiors of the 3D world that count for "Future Explorer".
export const WORLD_INTERIORS = ['apartment', 'office', 'cafe'];

export function levelFromXp(xp = 0) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

// Level titles. Level 1 = first entry; levels past the end keep the last title.
export const LEVEL_TITLES = ['Explorer', 'Dreamer', 'Builder', 'Pathfinder', 'Architect', 'Visionary'];

export const levelTitle = (level) => LEVEL_TITLES[Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1];

export function levelProgress(xp = 0) {
  const into = xp % XP_PER_LEVEL;
  return {
    level: levelFromXp(xp),
    title: levelTitle(levelFromXp(xp)),
    into,
    needed: XP_PER_LEVEL,
    percent: Math.round((into / XP_PER_LEVEL) * 100),
  };
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * XP earned on each of the last 7 days (in the given time zone), oldest first, ending today.
 * `xpLog` entries look like { amount, reason, at }.
 */
export function weeklyXp(xpLog = [], now = new Date(), timeZone = 'UTC') {
  const keys = [dayKey(now, timeZone)];
  for (let i = 0; i < 6; i += 1) keys.unshift(previousDayKey(keys[0]));
  const days = keys.map((key) => {
    const [y, m, d] = key.split('-').map(Number);
    return { key, day: DAY_LABELS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], xp: 0 };
  });
  const byKey = new Map(days.map((d) => [d.key, d]));
  for (const entry of xpLog) {
    const bucket = byKey.get(dayKey(new Date(entry.at), timeZone));
    if (bucket) bucket.xp += entry.amount;
  }
  return days.map(({ day, xp }) => ({ day, xp }));
}
