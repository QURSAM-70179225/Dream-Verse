import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

test('GET /api/health reports status, database and AI mode', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(['connected', 'disconnected'].includes(res.body.database));
  assert.ok(['demo', 'live'].includes(res.body.aiMode));
});

test('unknown routes return a JSON 404', async () => {
  const res = await request(app).get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.match(res.body.message, /Route not found/);
});

test('malformed JSON returns a 400', async () => {
  const res = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{bad json');
  assert.equal(res.status, 400);
});
