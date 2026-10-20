import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_RADIUS,
  cameraPosition,
  keysToInput,
  lerpAngle,
  movePlayer,
  moveVector,
  nearestInteractable,
  overlapsCollider,
  zoneAt,
} from '../world/engine/movement.js';
import { LOCATION_IDS, buildLocation } from '../world/data/locations.js';
import { DEFAULT_LOOK, SKIN, randomLook, sanitizeLook } from '../world/data/avatar.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const BOUNDS = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };

test('moveVector follows the camera yaw and never exceeds length 1', () => {
  assert.deepEqual(moveVector(0, 0, 1), { x: 0, z: 0 });
  const fwd = moveVector(0, 1, 0);
  assert.ok(near(fwd.x, 0) && near(fwd.z, -1));
  const right = moveVector(1, 0, 0);
  assert.ok(near(right.x, 1) && near(right.z, 0));
  const turned = moveVector(0, 1, Math.PI / 2); // camera at +x looking toward -x
  assert.ok(near(turned.x, -1) && near(turned.z, 0));
  const diag = moveVector(1, 1, 0.7);
  assert.ok(near(Math.hypot(diag.x, diag.z), 1));
  const overshoot = moveVector(5, 0, 0);
  assert.ok(near(Math.hypot(overshoot.x, overshoot.z), 1));
});

test('keysToInput cancels opposite keys', () => {
  assert.deepEqual(keysToInput(new Set(['forward'])), { x: 0, y: 1 });
  assert.deepEqual(keysToInput(new Set(['forward', 'back'])), { x: 0, y: 0 });
  assert.deepEqual(keysToInput(new Set(['left', 'back'])), { x: -1, y: -1 });
});

test('lerpAngle takes the short way around', () => {
  assert.ok(near(lerpAngle(0, 1, 0.5), 0.5));
  const a = lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(near(Math.abs(a), Math.PI));
});

test('movePlayer is blocked by boxes and slides along them', () => {
  const box = { x: 0, z: 0, w: 2, d: 2 };
  const blocked = movePlayer({ x: 2, z: 0 }, { x: -1.5, z: 0 }, [box], BOUNDS);
  assert.ok(near(blocked.x, 1 + PLAYER_RADIUS));
  const slide = movePlayer({ x: 1.5, z: 0.5 }, { x: -0.3, z: 0.4 }, [box], BOUNDS);
  assert.ok(slide.x >= 1 + PLAYER_RADIUS - 1e-9, 'stays outside the box');
  assert.ok(slide.z > 0.5, 'keeps sliding along the wall');
});

test('movePlayer is blocked by circles and clamps to the room bounds', () => {
  const tree = { x: 0, z: 0, r: 1 };
  const p = movePlayer({ x: 0, z: 3 }, { x: 0, z: -2.5 }, [tree], BOUNDS);
  assert.ok(near(Math.hypot(p.x, p.z), 1 + PLAYER_RADIUS, 1e-6));
  const edge = movePlayer({ x: 9.5, z: 0 }, { x: 5, z: 0 }, [], BOUNDS);
  assert.ok(near(edge.x, 10 - PLAYER_RADIUS));
});

test('a center that ends up inside a box is pushed out through the nearest face', () => {
  const box = { x: 0, z: 0, w: 4, d: 2 };
  const p = movePlayer({ x: 0, z: 0.8 }, { x: 0, z: 0 }, [box], BOUNDS);
  assert.ok(near(p.z, 1 + PLAYER_RADIUS));
});

test('nearestInteractable picks the closest one inside its radius', () => {
  const list = [
    { id: 'a', x: 0, z: 0, r: 2 },
    { id: 'b', x: 1, z: 0, r: 2 },
  ];
  assert.equal(nearestInteractable({ x: 0.9, z: 0 }, list).id, 'b');
  assert.equal(nearestInteractable({ x: -0.5, z: 0 }, list).id, 'a');
  assert.equal(nearestInteractable({ x: 9, z: 9 }, list), null);
});

test('zoneAt and cameraPosition', () => {
  const zones = [{ name: 'Park', minX: 0, maxX: 5, minZ: 0, maxZ: 5 }];
  assert.equal(zoneAt(zones, 1, 1, 'Road'), 'Park');
  assert.equal(zoneAt(zones, 9, 9, 'Road'), 'Road');
  const cam = cameraPosition({ x: 1, y: 1, z: 1 }, 0, 0.5, 10);
  assert.ok(cam.z > 1 && cam.y > 1 && near(cam.x, 1));
});

test('avatar looks are sanitized and random looks are valid', () => {
  assert.deepEqual(sanitizeLook(null), DEFAULT_LOOK);
  const bad = sanitizeLook({ skin: 'javascript:alert(1)', hairStyle: 'mohawk', top: '#7c3aed' });
  assert.equal(bad.skin, DEFAULT_LOOK.skin);
  assert.equal(bad.hairStyle, DEFAULT_LOOK.hairStyle);
  assert.equal(bad.top, '#7c3aed');
  const rnd = randomLook(() => 0.999);
  assert.deepEqual(sanitizeLook(rnd), rnd);
  assert.ok(SKIN.includes(rnd.skin));
});

for (const id of LOCATION_IDS) {
  test(`layout "${id}": spawns, interactables and portals are consistent`, () => {
    const loc = buildLocation(id, { roomTheme: 'cozy-loft', cityTheme: 'neon-skyline', milestones: [100, 40, 0] });
    assert.ok(loc.props.length > 20);
    assert.ok(loc.interactables.length >= 3);

    const ids = new Set();
    for (const it of loc.interactables) {
      assert.ok(!ids.has(it.id), `duplicate interactable ${it.id}`);
      ids.add(it.id);
      assert.ok(it.x > loc.bounds.minX && it.x < loc.bounds.maxX, `${it.id} x inside bounds`);
      assert.ok(it.z > loc.bounds.minZ && it.z < loc.bounds.maxZ, `${it.id} z inside bounds`);
      assert.ok(!overlapsCollider(it.x, it.z, loc.colliders), `${it.id} must be reachable (not inside a collider)`);
      if (it.kind === 'portal') {
        assert.ok(LOCATION_IDS.includes(it.to), `${it.id} leads somewhere real`);
        const target = buildLocation(it.to);
        assert.ok(target.spawns[it.spawn], `${it.id} has spawn "${it.spawn}" in ${it.to}`);
      }
    }

    for (const [name, sp] of Object.entries(loc.spawns)) {
      assert.ok(!overlapsCollider(sp.x, sp.z, loc.colliders), `spawn ${name} is free`);
      assert.ok(sp.x > loc.bounds.minX && sp.x < loc.bounds.maxX && sp.z > loc.bounds.minZ && sp.z < loc.bounds.maxZ);
      const hit = nearestInteractable(sp, loc.interactables);
      assert.ok(!hit, `spawn ${name} should not start inside a prompt radius (got ${hit?.id})`);
    }

    for (const p of loc.props) {
      for (const key of ['x', 'z']) assert.ok(Number.isFinite(p[key]), `${p.s} ${key}`);
      assert.ok(p.m, 'every prop has a material');
    }
  });
}

test('every non-city location can be left and the city can reach all of them', () => {
  const city = buildLocation('city');
  const targets = new Set(city.interactables.filter((i) => i.kind === 'portal').map((i) => i.to));
  assert.deepEqual([...targets].sort(), ['apartment', 'cafe', 'office']);
  for (const id of targets) {
    const loc = buildLocation(id);
    const exit = loc.interactables.find((i) => i.kind === 'portal');
    assert.equal(exit.to, 'city');
    assert.ok(city.spawns[exit.spawn]);
  }
});

test('the whole city is walkable from the default spawn to every portal (no sealed pockets)', () => {
  const city = buildLocation('city');
  const step = 0.5;
  const key = (x, z) => `${Math.round(x / step)}:${Math.round(z / step)}`;
  const start = city.spawns.default;
  const seen = new Set([key(start.x, start.z)]);
  const queue = [[start.x, start.z]];
  while (queue.length) {
    const [x, z] = queue.pop();
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx;
      const nz = z + dz;
      if (nx < city.bounds.minX + PLAYER_RADIUS || nx > city.bounds.maxX - PLAYER_RADIUS) continue;
      if (nz < city.bounds.minZ + PLAYER_RADIUS || nz > city.bounds.maxZ - PLAYER_RADIUS) continue;
      const k = key(nx, nz);
      if (seen.has(k) || overlapsCollider(nx, nz, city.colliders)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  for (const it of city.interactables) {
    assert.ok(seen.has(key(it.x, it.z)), `${it.id} is reachable on foot`);
  }
});

test('interiors: every interactable is reachable from the spawn', () => {
  for (const id of ['apartment', 'office', 'cafe']) {
    const loc = buildLocation(id);
    const step = 0.25;
    const key = (x, z) => `${Math.round(x / step)}:${Math.round(z / step)}`;
    const start = loc.spawns.default;
    const seen = new Set([key(start.x, start.z)]);
    const queue = [[start.x, start.z]];
    while (queue.length) {
      const [x, z] = queue.pop();
      for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < loc.bounds.minX + PLAYER_RADIUS || nx > loc.bounds.maxX - PLAYER_RADIUS) continue;
        if (nz < loc.bounds.minZ + PLAYER_RADIUS || nz > loc.bounds.maxZ - PLAYER_RADIUS) continue;
        const k = key(nx, nz);
        if (seen.has(k) || overlapsCollider(nx, nz, loc.colliders)) continue;
        seen.add(k);
        queue.push([nx, nz]);
      }
    }
    for (const it of loc.interactables) {
      assert.ok(seen.has(key(it.x, it.z)), `${id}: ${it.id} is reachable on foot`);
    }
  }
});

test('every interactable has real copy, with or without a dream', async () => {
  const { describe, cityLabel } = await import('../world/data/interactions.js');
  const { demoPayload } = await import('../utils/demoData.js');
  const empty = {};
  const demo = { dream: demoPayload.dream, roadmap: demoPayload.roadmap };
  for (const id of LOCATION_IDS) {
    for (const it of buildLocation(id).interactables.filter((i) => i.kind === 'info')) {
      for (const ctx of [empty, demo]) {
        const out = describe(it.id, ctx);
        assert.notEqual(out.title, 'Nothing here', `${it.id} has copy`);
        assert.ok(out.lines.length > 0 && out.lines.every((l) => typeof l === 'string' && l.length > 0), it.id);
      }
    }
  }
  assert.ok(describe('off-board', demo).lines.some((l) => l.includes('Learn Python - 100%')));
  assert.equal(cityLabel(demoPayload.dream), 'Tokyo');
  assert.equal(cityLabel(null), 'Neon City');
});

test('the office whiteboard reflects roadmap progress', () => {
  const none = buildLocation('office', { milestones: [] });
  const some = buildLocation('office', { milestones: [100, 50, 0, 0, 0, 0] });
  assert.ok(some.props.length > none.props.length);
});
