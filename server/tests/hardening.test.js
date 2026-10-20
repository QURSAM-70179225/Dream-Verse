// Security behaviour of the HTTP layer. None of these need a database.
import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import http from 'node:http';
import { after } from 'node:test';
import { env } from '../config/env.js';
import { runSmoke } from '../scripts/smoke.js';

const api = request(createApp());
const USER_ID = '507f1f77bcf86cd799439011';
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

describe('CORS', () => {
  it('lets the configured website call the API', async () => {
    const res = await api.get('/api/health').set('Origin', 'http://localhost:5173');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
  });

  it('answers a clean 403 (not a 500) to any other website', async () => {
    const res = await api.get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(res.status, 403);
    assert.match(res.body.message, /not allowed/i);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('still serves requests that carry no Origin header (curl, health checks)', async () => {
    const res = await api.get('/api/health');
    assert.equal(res.status, 200);
  });
});

describe('response hardening', () => {
  it('sends security headers and hides the framework', async () => {
    const res = await api.get('/api/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  it('rejects oversized JSON bodies with 413', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(150_000) });
    assert.equal(res.status, 413);
  });

  it('refuses database-operator objects where text is expected', async () => {
    const res = await api.post('/api/auth/login').send({ email: { $gt: '' }, password: 'whatever1' });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Validation failed');
  });

  it('ignores a __proto__ key in the body instead of polluting objects', async () => {
    const res = await api
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name":"Ada","email":"ada@example.com","password":"short","__proto__":{"admin":true}}');
    assert.equal(res.status, 400);
    assert.equal({}.admin, undefined);
  });
});

describe('token checks', () => {
  const expectRejected = async (token) => {
    const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid or expired token');
  };

  it('rejects a token signed with a different secret', async () => {
    await expectRejected(jwt.sign({ sub: USER_ID }, 'some-other-secret-some-other-secret'));
  });

  it('rejects an expired token', async () => {
    await expectRejected(jwt.sign({ sub: USER_ID }, env.jwtSecret, { expiresIn: -60 }));
  });

  it('rejects an unsigned ("alg: none") token', async () => {
    await expectRejected(`${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: USER_ID })}.`);
  });

  it('rejects a token whose payload was edited after signing', async () => {
    const [h, , s] = jwt.sign({ sub: USER_ID }, env.jwtSecret).split('.');
    await expectRejected(`${h}.${b64({ sub: '507f1f77bcf86cd799439099' })}.${s}`);
  });
});

describe('post-deployment smoke script', () => {
  const server = http.createServer(createApp());
  let base;

  it('passes against this very app (database not required here)', async () => {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
    const results = await runSmoke({ api: base, site: env.clientOrigins[0], requireDb: false });
    const failed = results.filter((r) => !r.ok);
    assert.deepEqual(failed, []);
  });

  after(() => {
    server.closeAllConnections?.();
    server.close();
  });
});
