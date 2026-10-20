export const XP_PER_LEVEL = 500;

// Keep in sync with LEVEL_TITLES in server/utils/xp.js (a test checks that they match).
export const LEVEL_TITLES = ['Explorer', 'Dreamer', 'Builder', 'Pathfinder', 'Architect', 'Visionary'];

export const levelTitle = (level) => LEVEL_TITLES[Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1];

export function levelFromXp(xp = 0) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

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
