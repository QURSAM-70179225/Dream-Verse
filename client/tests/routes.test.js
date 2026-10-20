// Guards against dead links: every internal link target used by the sidebar and by the 3D world
// panels must be a route that App.jsx really defines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LOCATION_IDS, buildLocation } from '../src/world/data/locations.js';
import { describe } from '../src/world/data/interactions.js';
import { demoPayload } from '../src/utils/demoData.js';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const routes = new Set([...read('App.jsx').matchAll(/path="([^"*]+)"/g)].map((m) => m[1]));

test('App.jsx defines the app pages', () => {
  for (const r of ['/dashboard', '/create', '/world', '/nova', '/roadmap', '/decisions', '/achievements']) {
    assert.ok(routes.has(r), `${r} is routed`);
  }
});

test('every sidebar link goes to a real page', () => {
  const links = [...read('components/layout/AppLayout.jsx').matchAll(/to: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(links.length >= 7);
  for (const to of links) assert.ok(routes.has(to), `sidebar link ${to}`);
});

test('every call-to-action in the 3D world goes to a real page', () => {
  const ctxs = [{}, { dream: demoPayload.dream, roadmap: demoPayload.roadmap }];
  const targets = new Set();
  for (const id of LOCATION_IDS) {
    for (const it of buildLocation(id).interactables.filter((i) => i.kind === 'info')) {
      for (const ctx of ctxs) {
        const cta = describe(it.id, ctx).cta;
        if (cta) targets.add(cta.to);
      }
    }
  }
  assert.ok(targets.has('/decisions') && targets.has('/nova'));
  for (const to of targets) assert.ok(routes.has(to), `world link ${to}`);
});
