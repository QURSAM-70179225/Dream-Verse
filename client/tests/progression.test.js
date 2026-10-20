// Level titles and level-gated avatar options.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACCENT,
  BOTTOM,
  DEFAULT_LOOK,
  HAIR,
  HAIR_STYLES,
  SKIN,
  TOP,
  UNLOCKS,
  isUnlocked,
  randomLook,
  requiredLevel,
  sanitizeLook,
  unlockCounts,
} from '../src/world/data/avatar.js';
import { LEVEL_TITLES, levelProgress, levelTitle } from '../src/utils/xp.js';
import { demoPayload } from '../src/utils/demoData.js';

const OPTIONS = {
  skin: SKIN,
  hair: HAIR,
  hairStyle: HAIR_STYLES.map((h) => h.id),
  top: TOP,
  bottom: BOTTOM,
  accent: ACCENT,
};

test('level titles match the server and are part of the level progress', () => {
  const server = readFileSync(new URL('../../server/utils/xp.js', import.meta.url), 'utf8');
  const list = server.match(/LEVEL_TITLES = \[([^\]]+)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  assert.deepEqual(list, LEVEL_TITLES);
  assert.equal(levelTitle(1), 'Explorer');
  assert.equal(levelTitle(99), 'Visionary');
  assert.equal(levelProgress(1240).title, 'Builder');
  assert.equal(demoPayload.title, 'Builder');
});

test('the default look and every skin tone are free at level 1', () => {
  for (const [key, value] of Object.entries(DEFAULT_LOOK)) assert.ok(isUnlocked(key, value, 1), key);
  for (const tone of SKIN) assert.ok(isUnlocked('skin', tone, 1));
  assert.ok(isUnlocked('hairStyle', 'short', 1) && isUnlocked('hairStyle', 'none', 1));
});

test('every unlock refers to a real option and a level the titles can reach', () => {
  for (const [key, table] of Object.entries(UNLOCKS)) {
    for (const [value, level] of Object.entries(table)) {
      assert.ok(OPTIONS[key].includes(value), `${key}:${value} exists`);
      assert.ok(level >= 2 && level <= LEVEL_TITLES.length, `${key}:${value} level ${level}`);
    }
  }
  assert.equal(requiredLevel('accent', '#4ade80'), 4);
  assert.equal(requiredLevel('accent', '#22d3ee'), 1);
});

test('a saved look is reset only where the level is too low', () => {
  const fancy = { ...DEFAULT_LOOK, hairStyle: 'bun', accent: '#4ade80', top: '#f472b6', bottom: '#4338ca' };
  const l1 = sanitizeLook(fancy, 1);
  assert.equal(l1.hairStyle, DEFAULT_LOOK.hairStyle);
  assert.equal(l1.accent, DEFAULT_LOOK.accent);
  assert.equal(l1.top, DEFAULT_LOOK.top);
  assert.equal(l1.bottom, DEFAULT_LOOK.bottom);
  const l2 = sanitizeLook(fancy, 2);
  assert.equal(l2.top, '#f472b6');
  assert.equal(l2.bottom, '#4338ca');
  assert.equal(l2.hairStyle, DEFAULT_LOOK.hairStyle); // bun needs level 3
  assert.deepEqual(sanitizeLook(fancy, 5), fancy);
  assert.deepEqual(sanitizeLook(fancy), fancy); // no level given: nothing is locked
});

test('random looks only use unlocked options', () => {
  for (let i = 0; i < 300; i += 1) {
    const look = randomLook(Math.random, 1);
    for (const [key, value] of Object.entries(look)) assert.ok(isUnlocked(key, value, 1), `${key}:${value}`);
  }
  let sawBun = false;
  for (let i = 0; i < 300 && !sawBun; i += 1) sawBun = randomLook(Math.random, 3).hairStyle === 'bun';
  assert.ok(sawBun, 'bun appears once unlocked');
});

test('unlock counts grow with the level and reach the total', () => {
  const a = unlockCounts(1);
  const b = unlockCounts(3);
  const c = unlockCounts(6);
  assert.ok(a.open < b.open && b.open < c.open);
  assert.equal(c.open, c.total);
});
