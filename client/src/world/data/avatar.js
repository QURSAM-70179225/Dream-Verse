// Avatar options and persistence. The look is stored on this device only (localStorage).

export const SKIN = ['#f1c9a5', '#e0ac82', '#c68a5d', '#a86a42', '#7a4a2c', '#5a3520'];
export const HAIR = ['#1b1b1b', '#4a2f1d', '#8a5a2b', '#d9a441', '#c2410c', '#a855f7', '#22d3ee'];
export const TOP = ['#7c3aed', '#22d3ee', '#f472b6', '#f8fafc', '#1e293b', '#16a34a'];
export const BOTTOM = ['#1e293b', '#334155', '#4338ca', '#78350f'];
export const ACCENT = ['#22d3ee', '#f472b6', '#fbbf24', '#a855f7', '#4ade80'];
export const HAIR_STYLES = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Bun' },
  { id: 'none', label: 'None' },
];

// Level needed to use an option (anything not listed is free from level 1). Level unlocks are
// cosmetic and checked in the browser only; the look is stored on this device.
export const UNLOCKS = {
  hairStyle: { long: 2, bun: 3 },
  hair: { '#a855f7': 3, '#22d3ee': 4 },
  top: { '#f472b6': 2, '#16a34a': 3 },
  bottom: { '#4338ca': 2 },
  accent: { '#fbbf24': 2, '#a855f7': 3, '#4ade80': 4 },
};

export const requiredLevel = (key, value) => UNLOCKS[key]?.[value] ?? 1;
export const isUnlocked = (key, value, level = Infinity) => level >= requiredLevel(key, value);

export const DEFAULT_LOOK = {
  skin: SKIN[1],
  hair: HAIR[1],
  hairStyle: 'short',
  top: TOP[0],
  bottom: BOTTOM[0],
  accent: ACCENT[0],
};

const OPTIONS = {
  skin: SKIN,
  hair: HAIR,
  hairStyle: HAIR_STYLES.map((h) => h.id),
  top: TOP,
  bottom: BOTTOM,
  accent: ACCENT,
};

export const LOOK_KEY = 'dreamverse_avatar';

/** Keeps only known values, so a stale or tampered localStorage entry can never break rendering. */
export function sanitizeLook(value, level = Infinity) {
  const out = { ...DEFAULT_LOOK };
  if (!value || typeof value !== 'object') return out;
  Object.keys(OPTIONS).forEach((key) => {
    if (OPTIONS[key].includes(value[key]) && isUnlocked(key, value[key], level)) out[key] = value[key];
  });
  return out;
}

/** A random look that only uses options unlocked at `level`. */
export function randomLook(rand = Math.random, level = Infinity) {
  const pick = (key, list) => {
    const open = list.filter((v) => isUnlocked(key, v, level));
    return open[Math.floor(rand() * open.length)];
  };
  return {
    skin: pick('skin', SKIN),
    hair: pick('hair', HAIR),
    hairStyle: pick('hairStyle', OPTIONS.hairStyle),
    top: pick('top', TOP),
    bottom: pick('bottom', BOTTOM),
    accent: pick('accent', ACCENT),
  };
}

/** How many options (outside skin, which is always free) are unlocked at `level`, and in total. */
export function unlockCounts(level = Infinity) {
  let total = 0;
  let open = 0;
  Object.keys(UNLOCKS).forEach((key) => {
    OPTIONS[key].forEach((v) => {
      total += 1;
      if (isUnlocked(key, v, level)) open += 1;
    });
  });
  return { open, total };
}

export function loadLook(level = Infinity) {
  try {
    const raw = localStorage.getItem(LOOK_KEY);
    return raw ? sanitizeLook(JSON.parse(raw), level) : { ...DEFAULT_LOOK };
  } catch {
    return { ...DEFAULT_LOOK };
  }
}

export function saveLook(look) {
  try {
    localStorage.setItem(LOOK_KEY, JSON.stringify(look));
  } catch {
    /* storage unavailable: the look just won't persist */
  }
}
