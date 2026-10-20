// Forgot-password pieces: the password rule, the API calls, and the links between pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passwordProblem } from '../src/utils/password.js';
import { requestPasswordReset, resetPassword } from '../src/services/account.js';

const read = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8');
const routes = new Set([...read('App.jsx').matchAll(/path="([^"*]+)"/g)].map((m) => m[1]));

test('the new-password rule matches the server (8-72 characters, a letter and a number)', () => {
  for (const ok of ['abcdefg1', 'Correct-horse-9', 'a1'.repeat(36)]) assert.equal(passwordProblem(ok), '', ok);
  for (const bad of ['', 'short1', 'onlyletters', '12345678', 'a1'.repeat(37)]) {
    assert.notEqual(passwordProblem(bad), '', bad);
  }
});

test('the reset pages are routed and reachable from the login page', () => {
  assert.ok(routes.has('/forgot-password') && routes.has('/reset-password'));
  assert.match(read('pages/Login.jsx'), /to="\/forgot-password"/);
  // Every in-app link used by the two reset pages points at a real page.
  for (const file of ['pages/ForgotPassword.jsx', 'pages/ResetPassword.jsx']) {
    for (const [, to] of read(file).matchAll(/<Link[^>]*\sto="([^"]+)"/g)) {
      assert.ok(routes.has(to), `${file} links to ${to}`);
    }
  }
});

test('the reset token is kept out of the address bar', () => {
  assert.match(read('pages/ResetPassword.jsx'), /setParams\(\{\}, \{ replace: true \}\)/);
});

test('the account helpers call the right endpoints with the right bodies', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, method: init.method, body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ message: 'ok', delivery: 'email' }) };
  };
  try {
    const a = await requestPasswordReset('ada@example.com');
    const b = await resetPassword('t'.repeat(64), 'newpass99');
    assert.equal(a.delivery, 'email');
    assert.equal(b.message, 'ok');
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.deepEqual(calls.map((c) => [c.method, c.url]), [
    ['POST', '/api/auth/forgot-password'],
    ['POST', '/api/auth/reset-password'],
  ]);
  assert.deepEqual(calls[0].body, { email: 'ada@example.com' });
  assert.deepEqual(calls[1].body, { token: 't'.repeat(64), password: 'newpass99' });
});
