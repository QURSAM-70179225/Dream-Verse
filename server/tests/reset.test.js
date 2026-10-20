// Password reset pieces that need neither a database nor a mail server.
import './setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESET_COOLDOWN_MS,
  RESET_TTL_MS,
  createResetToken,
  hashResetToken,
  isCoolingDown,
} from '../utils/resetToken.js';
import { buildResetEmail, createMailer, parseSender } from '../services/mailer.js';
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from '../utils/validators.js';

const NO_MAIL = { brevoApiKey: '', from: '' };

describe('reset tokens', () => {
  it('are 64 hex characters, unique, and stored only as a different hash', () => {
    const a = createResetToken();
    const b = createResetToken();
    assert.match(a.token, /^[a-f0-9]{64}$/);
    assert.notEqual(a.token, b.token);
    assert.match(a.tokenHash, /^[a-f0-9]{64}$/);
    assert.notEqual(a.tokenHash, a.token);
    assert.equal(hashResetToken(a.token), a.tokenHash);
    assert.notEqual(hashResetToken(b.token), a.tokenHash);
  });

  it('expire one hour after they are made', () => {
    const now = new Date('2026-01-01T10:00:00Z');
    assert.equal(createResetToken(now).expiresAt.getTime() - now.getTime(), RESET_TTL_MS);
    assert.equal(RESET_TTL_MS, 60 * 60 * 1000);
  });

  it('allow a new request only after the cooldown', () => {
    const asked = new Date('2026-01-01T10:00:00Z');
    assert.equal(isCoolingDown(undefined, asked), false);
    assert.equal(isCoolingDown(asked, new Date(asked.getTime() + RESET_COOLDOWN_MS - 1)), true);
    assert.equal(isCoolingDown(asked, new Date(asked.getTime() + RESET_COOLDOWN_MS)), false);
  });
});

describe('reset email', () => {
  it('greets by first name and contains the link, the time limit and an ignore notice', () => {
    const link = 'https://app.example/reset-password?token=abc';
    const { subject, text } = buildResetEmail({ name: 'Ada Lovelace', link });
    assert.match(subject, /reset/i);
    assert.match(text, /^Hi Ada,/);
    assert.ok(text.includes(link));
    assert.match(text, /60 minutes/);
    assert.match(text, /ignore this email/i);
  });

  it('copes with a missing name', () => {
    assert.match(buildResetEmail({ name: '', link: 'x' }).text, /^Hi there,/);
  });
});

describe('mailer without an email service', () => {
  const message = { to: 'ada@example.com', subject: 'Subject', text: 'Open https://x/reset-password?token=SECRET' };

  it('prints the message in the terminal during development', async () => {
    const logs = [];
    const mailer = createMailer({ mail: NO_MAIL, production: false, log: (l) => logs.push(l) });
    assert.equal(mailer.mode, 'console');
    await mailer.send(message);
    assert.equal(logs.length, 1);
    assert.ok(logs[0].includes('SECRET') && logs[0].includes('ada@example.com'));
    assert.match(logs[0], /nothing was sent/i);
  });

  it('never prints a reset link in production logs', async () => {
    const logs = [];
    const mailer = createMailer({ mail: NO_MAIL, production: true, log: (l) => logs.push(l) });
    await mailer.send(message);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].includes('SECRET'), false);
    assert.equal(logs[0].includes('ada@example.com'), false);
  });
});

describe('mailer over HTTPS (Brevo)', () => {
  const BREVO = { brevoApiKey: 'xkeysib-secret', from: 'DreamVerse AI <noreply@example.com>' };
  const message = { to: 'ada@example.com', subject: 'Subject', text: 'Open https://x/reset-password?token=SECRET' };
  const okFetch = (calls) => async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 201, text: async () => '{"messageId":"1"}' };
  };

  it('splits "Name <email>" senders', () => {
    assert.deepEqual(parseSender('DreamVerse AI <noreply@example.com>'), { name: 'DreamVerse AI', email: 'noreply@example.com' });
    assert.deepEqual(parseSender('"Quoted Name" <a@b.co>'), { name: 'Quoted Name', email: 'a@b.co' });
    assert.deepEqual(parseSender('a@b.co'), { email: 'a@b.co' });
    assert.deepEqual(parseSender('<a@b.co>'), { name: undefined, email: 'a@b.co' });
  });

  it('is used only when both the key and a sender address are set', () => {
    assert.equal(createMailer({ mail: BREVO }).mode, 'brevo');
    assert.equal(createMailer({ mail: { brevoApiKey: 'k', from: '' } }).mode, 'console');
    assert.equal(createMailer({ mail: { brevoApiKey: '', from: 'a@b.co' } }).mode, 'console');
  });

  it('posts the message to Brevo with the key in a header, never in the body', async () => {
    const calls = [];
    const mailer = createMailer({ mail: BREVO, production: true, fetchImpl: okFetch(calls) });
    await mailer.send(message);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers['api-key'], 'xkeysib-secret');
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.sender, { name: 'DreamVerse AI', email: 'noreply@example.com' });
    assert.deepEqual(body.to, [{ email: 'ada@example.com' }]);
    assert.equal(body.subject, 'Subject');
    assert.equal(body.textContent, message.text);
    assert.equal(calls[0].init.body.includes('xkeysib-secret'), false);
  });

  it("reports the provider's reason when it refuses, without leaking the key", async () => {
    const fetchImpl = async () => ({ ok: false, status: 400, text: async () => '{"message":"Sender is not valid"}' });
    const mailer = createMailer({ mail: BREVO, fetchImpl });
    await assert.rejects(mailer.send(message), (e) => /HTTP 400/.test(e.message) && /Sender is not valid/.test(e.message) && !e.message.includes('xkeysib-secret'));
  });

  it('reports a network failure clearly', async () => {
    const fetchImpl = async () => {
      throw new TypeError('fetch failed');
    };
    await assert.rejects(createMailer({ mail: BREVO, fetchImpl }).send(message), /could not be reached/);
  });
});

describe('reset validation', () => {
  const token = 'a'.repeat(64);

  it('forgot-password needs a valid email and normalizes it', () => {
    assert.equal(forgotPasswordSchema.parse({ email: '  ADA@Example.com ' }).email, 'ada@example.com');
    assert.equal(forgotPasswordSchema.safeParse({ email: 'nope' }).success, false);
    assert.equal(forgotPasswordSchema.safeParse({ email: { $gt: '' } }).success, false);
  });

  it('reset-password needs a well-formed token and a password that follows the sign-up rules', () => {
    assert.equal(resetPasswordSchema.safeParse({ token, password: 'abcdefg1' }).success, true);
    for (const bad of ['', 'short', 'g'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), { $ne: 1 }]) {
      assert.equal(resetPasswordSchema.safeParse({ token: bad, password: 'abcdefg1' }).success, false);
    }
    for (const password of ['short1', 'onlyletters', '12345678', 'a1'.repeat(40)]) {
      assert.equal(resetPasswordSchema.safeParse({ token, password }).success, false, password);
      assert.equal(
        registerSchema.safeParse({ name: 'Ada', email: 'a@b.co', password }).success,
        false,
        `same rule as sign-up: ${password}`
      );
    }
  });
});
