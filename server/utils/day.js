// "Today" depends on the user's time zone, so daily rules (streak, decision XP cap) use the
// browser's IANA time zone (sent in the X-Timezone header). Unknown or invalid values fall back to UTC.

export function resolveTimeZone(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return value;
  } catch {
    return 'UTC';
  }
}

/** The calendar day of `date` in the time zone, as "YYYY-MM-DD". */
export function dayKey(date = new Date(), timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** "2026-03-01" -> "2026-02-28" (pure calendar arithmetic, no time zone involved). */
export function previousDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}
