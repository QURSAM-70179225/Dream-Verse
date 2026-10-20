import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { levelFromXp, levelProgress, weeklyXp } from '../utils/xp.js';
import { buildFutureProfile, buildRoadmap } from '../services/futureTemplate.js';
import {
  createDreamSchema,
  milestonePatchSchema,
  registerSchema,
  updateDreamSchema,
} from '../utils/validators.js';
import { signToken, verifyToken } from '../utils/token.js';
import { Milestone } from '../models/Milestone.js';
import { ACHIEVEMENTS } from '../utils/achievementDefs.js';

describe('xp', () => {
  it('computes levels', () => {
    assert.equal(levelFromXp(0), 1);
    assert.equal(levelFromXp(499), 1);
    assert.equal(levelFromXp(500), 2);
    assert.deepEqual(levelProgress(1240), { level: 3, title: 'Builder', into: 240, needed: 500, percent: 48 });
  });

  it('buckets XP into the last 7 days and ignores older events', () => {
    const now = new Date('2026-10-19T12:00:00Z'); // a Monday
    const week = weeklyXp(
      [
        { amount: 30, at: '2026-10-19T08:00:00Z' },
        { amount: 20, at: '2026-10-19T09:00:00Z' },
        { amount: 10, at: '2026-10-17T10:00:00Z' },
        { amount: 999, at: '2026-10-01T10:00:00Z' },
      ],
      now
    );
    assert.equal(week.length, 7);
    assert.equal(week[6].day, 'Mon');
    assert.equal(week[6].xp, 50);
    assert.equal(week[4].day, 'Sat');
    assert.equal(week[4].xp, 10);
    assert.equal(week.reduce((s, d) => s + d.xp, 0), 60);
  });
});

describe('future template', () => {
  it('builds a 6-milestone roadmap labeled as a template', () => {
    const r = buildRoadmap({ career: 'AI engineer', skills: ['Python'] });
    assert.equal(r.source, 'template');
    assert.equal(r.milestones.length, 6);
    assert.match(r.title, /AI engineer/);
    for (const m of r.milestones) {
      assert.ok(m.tasks.length >= 3, `${m.title} should have at least 3 tasks`);
      assert.ok(m.timeline.length > 0);
    }
  });

  it('picks themes from keywords with sensible defaults', () => {
    const base = { career: '', city: '', home: '', lifestyle: '' };
    assert.equal(buildFutureProfile({ ...base, city: 'Tokyo' }).cityTheme, 'neon-skyline');
    assert.equal(buildFutureProfile(base).cityTheme, 'neon-city');
    assert.equal(buildFutureProfile(base).roomTheme, 'modern-apartment');
    assert.equal(buildFutureProfile({ ...base, home: 'A cozy loft' }).roomTheme, 'cozy-loft');
    assert.equal(buildFutureProfile(base).source, 'template');
  });
});

describe('validators', () => {
  it('normalizes dream input (comma lists, defaults)', () => {
    const d = createDreamSchema.parse({
      career: ' AI engineer ',
      skills: 'Python, math,,  ML ',
      goals: ['a', 'b'],
    });
    assert.equal(d.career, 'AI engineer');
    assert.deepEqual(d.skills, ['Python', 'math', 'ML']);
    assert.deepEqual(d.goals, ['a', 'b']);
    assert.equal(d.story, '');
  });

  it('requires a career or a long-enough story', () => {
    assert.equal(createDreamSchema.safeParse({}).success, false);
    assert.equal(createDreamSchema.safeParse({ story: 'too short' }).success, false);
    assert.equal(
      createDreamSchema.safeParse({ story: 'I want to live by the sea and teach.' }).success,
      true
    );
  });

  it('validates partial updates', () => {
    assert.equal(updateDreamSchema.safeParse({}).success, false);
    assert.deepEqual(updateDreamSchema.parse({ city: 'Paris' }), { city: 'Paris' });
  });

  it('normalizes and enforces registration rules', () => {
    const ok = registerSchema.parse({
      name: ' Ada ',
      email: ' ADA@Example.com ',
      password: 'abcdefg1',
    });
    assert.equal(ok.name, 'Ada');
    assert.equal(ok.email, 'ada@example.com');
    assert.equal(registerSchema.safeParse({ ...ok, password: 'abcdefgh' }).success, false); // no number
    assert.equal(registerSchema.safeParse({ ...ok, password: 'a1' }).success, false); // too short
    assert.equal(registerSchema.safeParse({ ...ok, password: `a1${'x'.repeat(80)}` }).success, false);
  });

  it('validates milestone task updates', () => {
    const id = '507f1f77bcf86cd799439011';
    assert.equal(milestonePatchSchema.safeParse({ taskId: id, done: true }).success, true);
    assert.equal(milestonePatchSchema.safeParse({ taskId: 'nope', done: true }).success, false);
    assert.equal(milestonePatchSchema.safeParse({ taskId: id, done: 'yes' }).success, false);
  });
});

describe('tokens', () => {
  it('round-trips and rejects tampering', () => {
    const id = '507f1f77bcf86cd799439011';
    const token = signToken(id);
    assert.equal(verifyToken(token).sub, id);
    assert.throws(() => verifyToken(`${token}x`), (err) => err.status === 401);
  });
});

describe('milestone progress', () => {
  it('recalculates the percentage from completed tasks', () => {
    const m = new Milestone({ tasks: [{ title: 'a', done: true }, { title: 'b' }] });
    assert.equal(m.recalc(), 50);
    m.tasks[1].done = true;
    assert.equal(m.recalc(), 100);
    assert.equal(new Milestone({ tasks: [] }).recalc(), 0);
  });
});

describe('achievements', () => {
  it('have unique keys and positive XP', () => {
    const keys = ACHIEVEMENTS.map((a) => a.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(ACHIEVEMENTS.every((a) => a.xp > 0));
  });
});
