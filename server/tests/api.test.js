// API behaviour that does not need a database: validation and authentication gates.
import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { signToken } from '../utils/token.js';

const api = request(createApp());

describe('validation', () => {
  it('rejects an empty registration with field-level details', async () => {
    const res = await api.post('/api/auth/register').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Validation failed');
    const paths = res.body.details.map((d) => d.path);
    assert.ok(paths.includes('name') && paths.includes('email') && paths.includes('password'));
  });

  it('rejects a weak password', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'password' });
    assert.equal(res.status, 400);
    assert.ok(res.body.details.some((d) => d.path === 'password'));
  });

  it('rejects an invalid login email', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'nope', password: 'x' });
    assert.equal(res.status, 400);
  });
});

describe('password reset requests', () => {
  it('rejects a forgot-password request without a valid email', async () => {
    for (const body of [{}, { email: 'nope' }, { email: { $gt: '' } }]) {
      const res = await api.post('/api/auth/forgot-password').send(body);
      assert.equal(res.status, 400);
    }
  });

  it('says the database is down instead of pretending an email was sent', async () => {
    const res = await api.post('/api/auth/forgot-password').send({ email: 'ada@example.com' });
    assert.equal(res.status, 503);
  });

  it('rejects a reset with a malformed token or a weak password', async () => {
    const good = 'a'.repeat(64);
    for (const body of [
      {},
      { token: 'short', password: 'abcdefg1' },
      { token: good, password: 'weak' },
      { token: { $ne: '' }, password: 'abcdefg1' },
    ]) {
      const res = await api.post('/api/auth/reset-password').send(body);
      assert.equal(res.status, 400);
    }
  });
});

describe('authentication gates', () => {
  it('requires a token on private routes', async () => {
    for (const [method, path] of [
      ['get', '/api/auth/me'],
      ['patch', '/api/auth/me'],
      ['get', '/api/dreams'],
      ['post', '/api/dreams'],
      ['get', '/api/dreams/507f1f77bcf86cd799439011'],
      ['put', '/api/dreams/507f1f77bcf86cd799439011'],
      ['get', '/api/progress'],
      ['patch', '/api/progress/milestones/507f1f77bcf86cd799439011'],
      ['get', '/api/achievements'],
      ['get', '/api/ai/status'],
      ['post', '/api/ai/generate-future'],
      ['post', '/api/ai/generate-roadmap'],
      ['post', '/api/ai/chat'],
      ['get', '/api/ai/conversation'],
      ['delete', '/api/ai/conversation'],
      ['post', '/api/simulation/decisions'],
      ['get', '/api/simulation/history'],
      ['post', '/api/progress/visit'],
    ]) {
      const res = await api[method](path).send({});
      assert.equal(res.status, 401, `${method.toUpperCase()} ${path} should be 401`);
      assert.equal(res.body.message, 'Authentication required');
    }
  });

  it('rejects a garbage token', async () => {
    const res = await api.get('/api/auth/me').set('Authorization', 'Bearer not.a.token');
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid or expired token');
  });

  it('answers 503 (not a hang) when the database is down', async () => {
    const token = signToken('507f1f77bcf86cd799439011');
    const res = await api.get('/api/dreams').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 503);
    assert.match(res.body.message, /database/i);
  });

  it('rejects a non-Bearer scheme', async () => {
    const res = await api.get('/api/auth/me').set('Authorization', 'Basic abc');
    assert.equal(res.status, 401);
  });
});
