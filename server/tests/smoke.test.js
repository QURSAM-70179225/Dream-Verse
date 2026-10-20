// The post-deployment checker, tested against pretend servers (no network, no database).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runSmoke } from '../scripts/smoke.js';

const SITE = 'https://site.example';
const ok = (status, body, headers = {}) => ({ status, headers, body: JSON.stringify(body) });

// A correctly configured API.
const healthyApi = async (url, headers) => {
  const path = new URL(url).pathname;
  const secure = { 'x-content-type-options': 'nosniff' };
  if (path === '/api/health') {
    if (headers.Origin === 'https://evil.example') return ok(403, { message: 'not allowed' }, secure);
    const cors = headers.Origin === SITE ? { 'access-control-allow-origin': SITE } : {};
    return ok(200, { status: 'ok', database: 'connected', aiMode: 'demo', mailMode: 'brevo' }, { ...secure, ...cors });
  }
  if (path === '/api/dreams') return ok(401, { message: 'Authentication required' }, secure);
  return ok(404, { message: 'Route not found' }, secure);
};

const failedNames = (results) => results.filter((r) => !r.ok).map((r) => r.name);

describe('smoke checks', () => {
  it('pass for a correctly configured API', async () => {
    const results = await runSmoke({ api: 'https://api.example/', site: `${SITE}/`, get: healthyApi });
    assert.deepEqual(failedNames(results), []);
    assert.ok(results.length >= 9);
  });

  it('flag a site that is missing from CLIENT_ORIGIN', async () => {
    const get = async (url, headers) => {
      const r = await healthyApi(url, headers);
      if (headers.Origin === SITE) return ok(403, { message: 'not allowed' });
      return r;
    };
    const results = await runSmoke({ api: 'https://api.example', site: SITE, get });
    assert.deepEqual(failedNames(results), [`Your site (${SITE}) is allowed by CORS`]);
  });

  it('flag an API that allows every website', async () => {
    const get = async (url, headers) =>
      headers.Origin === 'https://evil.example' ? ok(200, { status: 'ok' }) : healthyApi(url, headers);
    const results = await runSmoke({ api: 'https://api.example', site: SITE, get });
    assert.deepEqual(failedNames(results), ['Other websites are refused (403)']);
  });

  it('flag a database that is not connected, unless told not to care', async () => {
    const get = async (url, headers) => {
      const r = await healthyApi(url, headers);
      if (new URL(url).pathname === '/api/health' && !headers.Origin) {
        return { ...r, body: JSON.stringify({ ...JSON.parse(r.body), database: 'disconnected' }) };
      }
      return r;
    };
    const strict = await runSmoke({ api: 'https://api.example', site: SITE, get });
    assert.deepEqual(failedNames(strict), ['Database is connected']);
    const relaxed = await runSmoke({ api: 'https://api.example', site: SITE, get, requireDb: false });
    assert.deepEqual(failedNames(relaxed), []);
  });

  it('flag private routes that are open', async () => {
    const get = async (url, headers) =>
      new URL(url).pathname === '/api/dreams' ? ok(200, { dreams: [] }) : healthyApi(url, headers);
    const results = await runSmoke({ api: 'https://api.example', site: SITE, get });
    assert.deepEqual(failedNames(results), ['Private routes need a login (401)']);
  });

  it('flag plain http for a public address but accept it on localhost', async () => {
    const remote = await runSmoke({ api: 'http://api.example', site: SITE, get: healthyApi });
    assert.deepEqual(failedNames(remote), ['API address uses https (needed once deployed)']);
    const local = await runSmoke({ api: 'http://localhost:5000', site: SITE, get: healthyApi });
    assert.deepEqual(failedNames(local), []);
  });

  it('report an unreachable API as one clear failure', async () => {
    const get = async () => {
      throw new Error('connect ECONNREFUSED');
    };
    const results = await runSmoke({ api: 'https://api.example', site: SITE, get });
    assert.deepEqual(failedNames(results), ['API answers /api/health']);
    assert.match(results.at(-1).detail, /ECONNREFUSED/);
  });
});
