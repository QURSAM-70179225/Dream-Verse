// Page titles and the server-error plumbing of the API helper.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOT_FOUND_TITLE, ROUTE_TITLES, documentTitle, titleForPath } from '../src/utils/routeTitles.js';
import { ApiError, UNAUTHORIZED_EVENT, apiRequest, fallbackMessage } from '../src/services/api.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const routed = [...app.matchAll(/path="([^"*]+)"/g)].map((m) => m[1]);

test('every page in App.jsx has a title, and every title belongs to a page', () => {
  assert.ok(routed.length >= 11);
  for (const r of routed) assert.ok(ROUTE_TITLES[r], `${r} has a title`);
  for (const r of Object.keys(ROUTE_TITLES)) assert.ok(routed.includes(r), `${r} is routed`);
});

test('titles are short, unique and tolerate a trailing slash', () => {
  const titles = Object.values(ROUTE_TITLES);
  assert.equal(new Set(titles).size, titles.length);
  for (const t of titles) assert.ok(t.length > 2 && t.length <= 40, t);
  assert.equal(titleForPath('/roadmap/'), ROUTE_TITLES['/roadmap']);
  assert.equal(titleForPath('/nope'), NOT_FOUND_TITLE);
  assert.match(documentTitle('/roadmap'), /^Roadmap · DreamVerse AI$/);
  assert.match(documentTitle('/'), /^DreamVerse AI/);
});

test('server errors without a message get a friendly fallback', () => {
  assert.match(fallbackMessage(502), /server had a problem/i);
  assert.match(fallbackMessage(429), /too many requests/i);
  assert.equal(fallbackMessage(404), 'Request failed');
});

// Runs apiRequest against a fake fetch; restores the globals afterwards.
async function withFetch(response, run) {
  const realFetch = globalThis.fetch;
  const realWindow = globalThis.window;
  const events = [];
  globalThis.window = Object.assign(new EventTarget(), {});
  globalThis.window.addEventListener(UNAUTHORIZED_EVENT, () => events.push('unauthorized'));
  globalThis.fetch = async () => response;
  try {
    return await run(events);
  } finally {
    globalThis.fetch = realFetch;
    if (realWindow === undefined) delete globalThis.window;
    else globalThis.window = realWindow;
  }
}

const reply = (status, body) =>
  ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

test('a rejected token sends the "unauthorized" event so the app can sign out', async () => {
  await withFetch(reply(401, { message: 'Invalid or expired token' }), async (events) => {
    await assert.rejects(apiRequest('/progress', { token: 'abc' }), (e) => e instanceof ApiError && e.status === 401);
    assert.deepEqual(events, ['unauthorized']);
  });
});

test('a wrong password (no token sent) does not trigger a sign-out', async () => {
  await withFetch(reply(401, { message: 'Invalid email or password' }), async (events) => {
    await assert.rejects(apiRequest('/auth/login', { method: 'POST', body: {} }), /Invalid email or password/);
    assert.deepEqual(events, []);
  });
});

test('an unreadable server error becomes a readable message', async () => {
  const res = { ok: false, status: 502, json: async () => { throw new Error('not json'); } };
  await withFetch(res, async () => {
    await assert.rejects(apiRequest('/progress', { token: 't' }), /server had a problem/i);
  });
});

test('a network failure says the server cannot be reached', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  try {
    await assert.rejects(apiRequest('/health'), (e) => e.status === 0 && /cannot reach/i.test(e.message));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('a slow request announces itself once and clears when it finishes', async () => {
  const realFetch = globalThis.fetch;
  const realWindow = globalThis.window;
  const { SLOW_EVENT, apiSettings } = await import('../src/services/api.js');
  const events = [];
  globalThis.window = new EventTarget();
  globalThis.window.addEventListener(SLOW_EVENT, (e) => events.push(e.detail));
  const before = apiSettings.slowAfterMs;
  apiSettings.slowAfterMs = 20;
  try {
    globalThis.fetch = async () => {
      await new Promise((r) => setTimeout(r, 80));
      return { ok: true, status: 200, json: async () => ({}) };
    };
    await apiRequest('/progress', { token: 't' });
    assert.deepEqual(events, ['start', 'end']);

    events.length = 0;
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
    await apiRequest('/health');
    assert.deepEqual(events, [], 'a fast request shows nothing');

    globalThis.fetch = async () => {
      await new Promise((r) => setTimeout(r, 60));
      throw new TypeError('fetch failed');
    };
    await assert.rejects(apiRequest('/health'));
    assert.deepEqual(events, ['start', 'end'], 'a failed slow request also clears the notice');
  } finally {
    apiSettings.slowAfterMs = before;
    globalThis.fetch = realFetch;
    if (realWindow === undefined) delete globalThis.window;
    else globalThis.window = realWindow;
  }
});
