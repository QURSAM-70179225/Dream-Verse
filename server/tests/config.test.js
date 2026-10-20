// Configuration safety checks that need no database and no HTTP server.
import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isMailConfigured, parseTrustProxy, startupProblems } from '../config/env.js';

const base = {
  nodeEnv: 'production',
  jwtSecret: 'a-long-random-secret-value-1234567890',
  clientOrigins: ['https://dreamverse.example'],
  mongoUri: 'mongodb+srv://user:pw@cluster0.example.mongodb.net/dreamverse',
  bcryptRounds: 12,
  mail: { brevoApiKey: 'xkeysib-example', from: 'DreamVerse AI <noreply@example.com>' },
};

describe('TRUST_PROXY parsing', () => {
  it('turns hop counts into numbers and "true" into true', () => {
    assert.equal(parseTrustProxy('1'), 1);
    assert.equal(parseTrustProxy(' 2 '), 2);
    assert.equal(parseTrustProxy('true'), true);
    assert.equal(parseTrustProxy('TRUE'), true);
  });

  it('is off for empty, missing or unknown values', () => {
    for (const v of [undefined, '', 'false', 'yes', '-1', '1.5']) {
      assert.equal(parseTrustProxy(v), false, `value ${String(v)}`);
    }
  });
});

describe('startup checks', () => {
  it('accepts a correct production configuration', () => {
    assert.deepEqual(startupProblems(base), { fatal: [], warnings: [] });
  });

  it('stops production when the JWT secret is missing, short or the example value', () => {
    for (const jwtSecret of ['', 'short', 'change-me-to-a-long-random-string']) {
      const r = startupProblems({ ...base, jwtSecret });
      assert.equal(r.fatal.length, 1, `secret "${jwtSecret}"`);
    }
  });

  it('only warns about the JWT secret outside production', () => {
    const r = startupProblems({ ...base, nodeEnv: 'development', jwtSecret: '' });
    assert.equal(r.fatal.length, 0);
    assert.equal(r.warnings.length, 1);
  });

  it('warns about localhost addresses and weak hashing in production', () => {
    const r = startupProblems({
      ...base,
      clientOrigins: ['http://localhost:5173'],
      mongoUri: 'mongodb://127.0.0.1:27017/dreamverse',
      bcryptRounds: 4,
    });
    assert.equal(r.fatal.length, 0);
    assert.equal(r.warnings.length, 3);
  });

  it('warns in production when password reset emails cannot be sent', () => {
    const r = startupProblems({ ...base, mail: { brevoApiKey: '', from: '' } });
    assert.equal(r.fatal.length, 0);
    assert.equal(r.warnings.length, 1);
    assert.match(r.warnings[0], /reset emails/i);
  });

  it('needs both the Brevo key and a sender address before email counts as configured', () => {
    assert.equal(isMailConfigured(base.mail), true);
    assert.equal(isMailConfigured({ ...base.mail, brevoApiKey: '' }), false);
    assert.equal(isMailConfigured({ ...base.mail, from: '' }), false);
    assert.equal(isMailConfigured(undefined), false);
  });

  it('does not nag about localhost during development', () => {
    const r = startupProblems({
      ...base,
      nodeEnv: 'development',
      clientOrigins: ['http://localhost:5173'],
      mongoUri: 'mongodb://127.0.0.1:27017/dreamverse',
    });
    assert.deepEqual(r, { fatal: [], warnings: [] });
  });
});
