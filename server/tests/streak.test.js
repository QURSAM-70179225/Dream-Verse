// Level titles, time-zone days and the daily streak rules. Pure logic: no database, no network.
import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, previousDayKey, resolveTimeZone } from '../utils/day.js';
import { STREAK_MAX_STEPS, nextStreak, streakBonus, streakView } from '../utils/streak.js';
import { LEVEL_TITLES, levelProgress, levelTitle, weeklyXp } from '../utils/xp.js';
import { env } from '../config/env.js';

describe('level titles', () => {
  it('map levels to titles and keep the last one for higher levels', () => {
    assert.deepEqual(LEVEL_TITLES, ['Explorer', 'Dreamer', 'Builder', 'Pathfinder', 'Architect', 'Visionary']);
    assert.equal(levelTitle(1), 'Explorer');
    assert.equal(levelTitle(3), 'Builder');
    assert.equal(levelTitle(6), 'Visionary');
    assert.equal(levelTitle(40), 'Visionary');
    assert.equal(levelTitle(0), 'Explorer');
  });

  it('are part of the level progress sent to the app', () => {
    assert.equal(levelProgress(0).title, 'Explorer');
    assert.equal(levelProgress(500).title, 'Dreamer');
    assert.equal(levelProgress(1065).level, 3);
    assert.equal(levelProgress(1065).title, 'Builder');
  });
});

describe('days and time zones', () => {
  it('falls back to UTC for missing or invalid time zones', () => {
    assert.equal(resolveTimeZone('America/Los_Angeles'), 'America/Los_Angeles');
    for (const bad of [undefined, '', 'Mars/Olympus', 'x'.repeat(100), 42, null, '../etc']) {
      assert.equal(resolveTimeZone(bad), 'UTC', String(bad));
    }
  });

  it('computes the calendar day in the given time zone', () => {
    const instant = new Date('2026-10-20T02:30:00Z'); // evening of the 19th in Los Angeles
    assert.equal(dayKey(instant, 'UTC'), '2026-10-20');
    assert.equal(dayKey(instant, 'America/Los_Angeles'), '2026-10-19');
    assert.equal(dayKey(instant, 'Asia/Tokyo'), '2026-10-20');
  });

  it('steps back one calendar day across month and year ends and leap days', () => {
    assert.equal(previousDayKey('2026-03-01'), '2026-02-28');
    assert.equal(previousDayKey('2028-03-01'), '2028-02-29');
    assert.equal(previousDayKey('2027-01-01'), '2026-12-31');
  });

  it('buckets the weekly XP chart by the user\'s day', () => {
    const now = new Date('2026-10-20T02:30:00Z');
    const log = [{ amount: 40, at: '2026-10-20T01:00:00Z' }]; // still the 19th in Los Angeles
    const la = weeklyXp(log, now, 'America/Los_Angeles');
    assert.equal(la[6].day, 'Mon');
    assert.equal(la[6].xp, 40);
    assert.equal(weeklyXp(log, now, 'UTC')[6].day, 'Tue');
    assert.equal(weeklyXp(log, now).length, 7);
  });
});

describe('streak rules', () => {
  it('pays a growing bonus that stops growing after five days', () => {
    assert.equal(streakBonus(1, 5), 5);
    assert.equal(streakBonus(3, 5), 15);
    assert.equal(streakBonus(5, 5), 25);
    assert.equal(streakBonus(30, 5), 25);
    assert.equal(streakBonus(0, 5), 0);
    assert.equal(streakBonus(4, 0), 0);
    assert.equal(STREAK_MAX_STEPS, 5);
  });

  it('starts a streak, extends it on the next day, and counts a day only once', () => {
    const first = nextStreak(undefined, '2026-10-19');
    assert.deepEqual(first, { counted: true, count: 1, best: 1, lastDay: '2026-10-19' });

    assert.equal(nextStreak(first, '2026-10-19').counted, false);

    const second = nextStreak(first, '2026-10-20');
    assert.deepEqual(second, { counted: true, count: 2, best: 2, lastDay: '2026-10-20' });

    const across = nextStreak({ count: 4, best: 4, lastDay: '2026-12-31' }, '2027-01-01');
    assert.equal(across.count, 5);
  });

  it('restarts after a missed day but remembers the best streak', () => {
    const broken = nextStreak({ count: 6, best: 9, lastDay: '2026-10-10' }, '2026-10-19');
    assert.deepEqual(broken, { counted: true, count: 1, best: 9, lastDay: '2026-10-19' });
  });

  it('shows what the next action pays and whether the streak is still alive', () => {
    const today = '2026-10-19';
    assert.deepEqual(streakView({ count: 3, best: 5, lastDay: today }, today, 5), {
      count: 3,
      best: 5,
      doneToday: true,
      todayBonus: 0,
    });
    assert.deepEqual(streakView({ count: 3, best: 5, lastDay: '2026-10-18' }, today, 5), {
      count: 3,
      best: 5,
      doneToday: false,
      todayBonus: 20,
    });
    assert.deepEqual(streakView({ count: 3, best: 5, lastDay: '2026-10-16' }, today, 5), {
      count: 0,
      best: 5,
      doneToday: false,
      todayBonus: 5,
    });
    assert.equal(streakView(undefined, today, 5).count, 0);
    assert.equal(streakView({ count: 2, best: 2, lastDay: '2026-10-18' }, today, 0).todayBonus, 0);
  });

  it('is switched off in the test setup unless a test turns it on', () => {
    assert.equal(env.game.streakStepXp, 0);
  });
});
