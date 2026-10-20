// Full end-to-end API test against a real MongoDB.
// Runs only when TEST_MONGODB_URI is set, and only against a database whose name contains
// "test" (it is dropped before and after). Example:
//   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/dreamverse_test npm test
import './setup.js';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { Milestone } from '../models/Milestone.js';
import { User } from '../models/User.js';
import { setAiClientForTests } from '../services/aiService.js';
import { setMailerForTests } from '../services/mailer.js';
import { requestPasswordReset } from '../services/passwordResetService.js';
import { seedAchievements } from '../services/progressService.js';
import { hashResetToken } from '../utils/resetToken.js';

const URI = process.env.TEST_MONGODB_URI;
const skip = URI
  ? false
  : 'set TEST_MONGODB_URI to a throwaway database whose name contains "test" to run this suite';

describe('API integration', { skip }, () => {
  const api = request(createApp());
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const state = {};

  before(async () => {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.name.toLowerCase().includes('test')) {
      await mongoose.disconnect();
      throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test".');
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build unique indexes
    await seedAchievements();
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('registers a user without leaking the password hash', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'abcdefg1' });
    assert.equal(res.status, 201);
    assert.equal(typeof res.body.token, 'string');
    assert.equal(res.body.user.email, 'ada@example.com');
    assert.equal(JSON.stringify(res.body).includes('passwordHash'), false);
    state.ada = res.body.token;
  });

  it('rejects a duplicate email (case-insensitive)', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ name: 'Ada 2', email: 'ADA@example.com', password: 'abcdefg1' });
    assert.equal(res.status, 409);
  });

  it('logs in with the right password only', async () => {
    const bad = await api
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'wrongpass1' });
    assert.equal(bad.status, 401);
    const unknown = await api
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'abcdefg1' });
    assert.equal(unknown.status, 401);
    const ok = await api
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'abcdefg1' });
    assert.equal(ok.status, 200);
    assert.equal(typeof ok.body.token, 'string');
  });

  it('returns and updates the profile', async () => {
    const me = await api.get('/api/auth/me').set(bearer(state.ada));
    assert.equal(me.status, 200);
    assert.equal(me.body.user.name, 'Ada');
    const patched = await api.patch('/api/auth/me').set(bearer(state.ada)).send({ name: 'Ada L' });
    assert.equal(patched.body.user.name, 'Ada L');
  });

  it('creates a dream with a profile, roadmap and first achievement', async () => {
    const bad = await api.post('/api/dreams').set(bearer(state.ada)).send({});
    assert.equal(bad.status, 400);

    const res = await api
      .post('/api/dreams')
      .set(bearer(state.ada))
      .send({
        career: 'AI engineer',
        city: 'Tokyo',
        skills: 'Python, ML',
        goals: 'Build a startup, Open a café',
      });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.dream.skills, ['Python', 'ML']);
    assert.equal(res.body.futureProfile.cityTheme, 'neon-skyline');
    assert.equal(res.body.roadmap.milestones.length, 6);
    assert.ok(res.body.newAchievements.some((a) => a.key === 'first-dream'));
    assert.equal(res.body.xp, 50);
    state.dreamId = res.body.dream.id;
  });

  it('lists, reads and updates dreams; rejects bad ids', async () => {
    const list = await api.get('/api/dreams').set(bearer(state.ada));
    assert.equal(list.body.dreams.length, 1);

    const one = await api.get(`/api/dreams/${state.dreamId}`).set(bearer(state.ada));
    assert.equal(one.status, 200);
    assert.equal(one.body.roadmap.milestones.length, 6);

    const upd = await api
      .put(`/api/dreams/${state.dreamId}`)
      .set(bearer(state.ada))
      .send({ city: 'Osaka' });
    assert.equal(upd.body.dream.city, 'Osaka');
    assert.equal(upd.body.dream.career, 'AI engineer');

    const badId = await api.get('/api/dreams/abc').set(bearer(state.ada));
    assert.equal(badId.status, 400);
  });

  it("keeps users' data private", async () => {
    const reg = await api
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@example.com', password: 'abcdefg1' });
    state.bob = reg.body.token;

    assert.equal((await api.get(`/api/dreams/${state.dreamId}`).set(bearer(state.bob))).status, 404);
    assert.equal(
      (
        await api
          .put(`/api/dreams/${state.dreamId}`)
          .set(bearer(state.bob))
          .send({ city: 'Hacked' })
      ).status,
      404
    );
    assert.equal((await api.get('/api/dreams').set(bearer(state.bob))).body.dreams.length, 0);

    const adaProgress = await api.get('/api/progress').set(bearer(state.ada));
    state.milestone = adaProgress.body.roadmap.milestones[0];
    const attempt = await api
      .patch(`/api/progress/milestones/${state.milestone.id}`)
      .set(bearer(state.bob))
      .send({ taskId: state.milestone.tasks[0].id, done: true });
    assert.equal(attempt.status, 404);

    const bobProgress = await api.get('/api/progress').set(bearer(state.bob));
    assert.equal(bobProgress.body.xp, 0);
    assert.equal(bobProgress.body.dream, null);
  });

  it('summarizes progress for the dashboard', async () => {
    const res = await api.get('/api/progress').set(bearer(state.ada));
    assert.equal(res.status, 200);
    assert.equal(res.body.xp, 50);
    assert.equal(res.body.level, 1);
    assert.equal(res.body.weeklyXp.length, 7);
    assert.equal(res.body.dream.career, 'AI engineer');
    assert.equal(res.body.dream.goalItems.length, 2);
    assert.equal(res.body.roadmap.overall, 0);
  });

  it('awards task XP once, even if a task is toggled repeatedly', async () => {
    const [first] = state.milestone.tasks;
    const patch = (done) =>
      api
        .patch(`/api/progress/milestones/${state.milestone.id}`)
        .set(bearer(state.ada))
        .send({ taskId: first.id, done });

    const a = await patch(true);
    assert.equal(a.status, 200);
    assert.equal(a.body.xpGained, 10);
    assert.ok(a.body.milestone.progress > 0);
    assert.equal(a.body.progress.xp, 60);

    assert.equal((await patch(false)).body.xpGained, 0);
    const again = await patch(true);
    assert.equal(again.body.xpGained, 0);
    assert.equal(again.body.progress.xp, 60);
  });

  it('completing a milestone grants a bonus and Career Starter', async () => {
    const tasks = state.milestone.tasks;
    let last;
    for (const t of tasks) {
      last = await api
        .patch(`/api/progress/milestones/${state.milestone.id}`)
        .set(bearer(state.ada))
        .send({ taskId: t.id, done: true });
      assert.equal(last.status, 200);
    }
    assert.equal(last.body.milestone.progress, 100);
    assert.equal(last.body.milestone.status, 'completed');
    assert.ok(last.body.newAchievements.some((a) => a.key === 'career-starter'));
    // first dream 50 + one XP per task + milestone bonus 50 + Career Starter 100
    assert.equal(last.body.progress.xp, 50 + tasks.length * 10 + 50 + 100);
  });

  it('rejects a task id from a different milestone', async () => {
    const progress = await api.get('/api/progress').set(bearer(state.ada));
    const [m1, m2] = progress.body.roadmap.milestones;
    const res = await api
      .patch(`/api/progress/milestones/${m2.id}`)
      .set(bearer(state.ada))
      .send({ taskId: m1.tasks[0].id, done: true });
    assert.equal(res.status, 404);
  });

  it('lists achievements with earned state', async () => {
    const res = await api.get('/api/achievements').set(bearer(state.ada));
    assert.equal(res.status, 200);
    assert.equal(res.body.achievements.length, 6);
    const byKey = Object.fromEntries(res.body.achievements.map((a) => [a.key, a]));
    assert.equal(byKey['first-dream'].earned, true);
    assert.equal(byKey['career-starter'].earned, true);
    assert.equal(byKey['goal-achiever'].earned, false);
  });
});


describe('AI integration (fake provider)', { skip }, () => {
  const api = request(createApp());
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const saved = { ...env.ai };
  const state = {};
  let calls = [];

  const goLive = (handler) => {
    Object.assign(env.ai, { apiKey: 'k', baseUrl: 'https://ai.example/v1', model: 'm' });
    setAiClientForTests({
      complete: async (args) => {
        calls.push(args);
        return handler(args);
      },
    });
  };
  const goDemo = () => {
    Object.assign(env.ai, saved);
    setAiClientForTests(null);
  };

  const aiProfile = JSON.stringify({
    career: 'Marine biologist',
    cityTheme: 'coastal-glow',
    roomTheme: 'garden-house',
    summary: 'You could be studying ocean life from a small coastal lab, sharing what you find.',
    scenarios: [{ title: 'Grant or job?', optionA: 'Apply for a grant', optionB: 'Join a lab' }],
  });
  const aiRoadmap = JSON.stringify({
    title: 'Roadmap: Marine biologist',
    milestones: [1, 2, 3].map((n) => ({
      title: `AI step ${n}`,
      description: 'Do it',
      timeline: `Month ${n}`,
      resources: [{ title: 'Coursera', url: 'https://www.coursera.org/learn/deep-link' }],
      tasks: ['first', 'second', 'third'],
    })),
  });

  before(async () => {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.name.toLowerCase().includes('test')) {
      await mongoose.disconnect();
      throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test".');
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    await seedAchievements();

    const reg = (name) =>
      api.post('/api/auth/register').send({ name, email: `${name.toLowerCase()}@example.com`, password: 'abcdefg1' });
    state.ada = (await reg('Ada')).body.token;
    state.bob = (await reg('Bob')).body.token;
    const dream = await api
      .post('/api/dreams')
      .set(bearer(state.ada))
      .send({ career: 'Marine biologist', city: 'Lisbon', skills: 'Biology', goals: 'Publish a paper' });
    state.dreamId = dream.body.dream.id;
  });

  after(async () => {
    goDemo();
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('reports demo mode and changes nothing when no AI is configured', async () => {
    goDemo();
    const status = await api.get('/api/ai/status').set(bearer(state.ada));
    assert.deepEqual(status.body, { mode: 'demo' });

    const future = await api.post('/api/ai/generate-future').set(bearer(state.ada)).send({});
    assert.equal(future.status, 200);
    assert.equal(future.body.mode, 'demo');
    assert.equal(future.body.updated, false);
    assert.equal(future.body.futureProfile.source, 'template');

    const roadmap = await api.post('/api/ai/generate-roadmap').set(bearer(state.ada)).send({});
    assert.equal(roadmap.body.mode, 'demo');
    assert.equal(roadmap.body.updated, false);
    assert.equal(roadmap.body.roadmap.milestones.length, 6);
    assert.equal(roadmap.body.roadmap.source, 'template');
  });

  it('answers Nova chat with a labeled demo reply and stores the conversation', async () => {
    const res = await api.post('/api/ai/chat').set(bearer(state.ada)).send({ message: 'What should I do next?' });
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'demo');
    assert.equal(res.body.reply.role, 'assistant');
    assert.match(res.body.reply.content, /Demo reply/);

    const convo = await api.get('/api/ai/conversation').set(bearer(state.ada));
    assert.equal(convo.body.hasDream, true);
    assert.deepEqual(convo.body.messages.map((m) => m.role), ['user', 'assistant']);
  });

  it('validates chat input and keeps dreams private', async () => {
    const chat = (body, token = state.ada) => api.post('/api/ai/chat').set(bearer(token)).send(body);
    assert.equal((await chat({})).status, 400);
    assert.equal((await chat({ message: '   ' })).status, 400);
    assert.equal((await chat({ message: 'x'.repeat(1001) })).status, 400);
    assert.equal((await chat({ message: 'hi', dreamId: 'nope' })).status, 400);
    assert.equal((await chat({ message: 'hi', dreamId: state.dreamId }, state.bob)).status, 404);
    assert.equal(
      (await api.post('/api/ai/generate-future').set(bearer(state.bob)).send({ dreamId: state.dreamId })).status,
      404
    );
    // Bob has no dream, so there is nothing to personalize.
    assert.equal((await api.post('/api/ai/generate-roadmap').set(bearer(state.bob)).send({})).status, 404);
  });

  it('personalizes the future profile when AI is configured', async () => {
    calls = [];
    goLive(() => aiProfile);
    const res = await api.post('/api/ai/generate-future').set(bearer(state.ada)).send({ dreamId: state.dreamId });
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'live');
    assert.equal(res.body.updated, true);
    assert.equal(res.body.futureProfile.source, 'ai');
    assert.equal(res.body.futureProfile.cityTheme, 'coastal-glow');

    const progress = await api.get('/api/progress').set(bearer(state.ada));
    assert.equal(progress.body.dream.profile.source, 'ai');
    assert.match(progress.body.dream.summary, /ocean life/);
  });

  it('refuses two simultaneous generations for the same user', async () => {
    goLive(async () => {
      await new Promise((r) => setTimeout(r, 150));
      return aiProfile;
    });
    const send = () => api.post('/api/ai/generate-future').set(bearer(state.ada)).send({});
    const [a, b] = await Promise.all([send(), send()]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  });

  it('replaces a roadmap that has no progress, keeping only safe links', async () => {
    goLive(() => aiRoadmap);
    const res = await api.post('/api/ai/generate-roadmap').set(bearer(state.ada)).send({});
    assert.equal(res.status, 200);
    assert.equal(res.body.roadmap.source, 'ai');
    assert.equal(res.body.roadmap.milestones.length, 3);
    assert.equal(res.body.roadmap.milestones[0].title, 'AI step 1');
    assert.equal(res.body.roadmap.milestones[0].resources[0].url, '');
    assert.equal(await Milestone.countDocuments({}), 3); // the six template milestones are gone
    state.milestone = res.body.roadmap.milestones[0];
  });

  it('will not replace a roadmap once progress exists (no lost work, no XP farming)', async () => {
    const tick = await api
      .patch(`/api/progress/milestones/${state.milestone.id}`)
      .set(bearer(state.ada))
      .send({ taskId: state.milestone.tasks[0].id, done: true });
    assert.equal(tick.status, 200);

    calls = [];
    goLive(() => aiRoadmap);
    const res = await api.post('/api/ai/generate-roadmap').set(bearer(state.ada)).send({});
    assert.equal(res.status, 409);
    assert.match(res.body.message, /progress/);
    assert.equal(calls.length, 0); // no tokens spent
    assert.equal(await Milestone.countDocuments({}), 3);
  });

  it('chats through the provider with earlier messages as context', async () => {
    calls = [];
    goLive(() => 'Start with one small task today.');
    const res = await api.post('/api/ai/chat').set(bearer(state.ada)).send({ message: 'Help me plan' });
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'live');
    assert.equal(res.body.reply.content, 'Start with one small task today.');
    const sent = calls[0].messages;
    assert.equal(sent[0].role, 'system');
    assert.match(sent[0].content, /AI step 1/);
    assert.ok(sent.length >= 4); // system + earlier demo exchange + new message
  });

  it('answers distress with a fixed safety message and never calls the model', async () => {
    calls = [];
    goLive(() => 'should not be used');
    const res = await api.post('/api/ai/chat').set(bearer(state.ada)).send({ message: 'I want to end my life' });
    assert.equal(res.status, 200);
    assert.equal(res.body.mode, 'safety');
    assert.match(res.body.reply.content, /emergency number/);
    assert.equal(calls.length, 0);
  });

  it('shows a clear error and stores nothing when the provider fails', async () => {
    const countBefore = (await api.get('/api/ai/conversation').set(bearer(state.ada))).body.messages.length;
    const { AiProviderError } = await import('../services/ai/aiClient.js');
    goLive(() => {
      throw new AiProviderError('x', { kind: 'timeout' });
    });
    const res = await api.post('/api/ai/chat').set(bearer(state.ada)).send({ message: 'hello?' });
    assert.equal(res.status, 504);
    assert.match(res.body.message, /too long/);
    const countAfter = (await api.get('/api/ai/conversation').set(bearer(state.ada))).body.messages.length;
    assert.equal(countAfter, countBefore);
  });

  it('lets Nova chat before any dream exists, and clears a conversation', async () => {
    goDemo();
    const chat = await api.post('/api/ai/chat').set(bearer(state.bob)).send({ message: 'hi' });
    assert.equal(chat.status, 200);
    assert.match(chat.body.reply.content, /Create your dream first/);
    assert.equal((await api.get('/api/ai/conversation').set(bearer(state.bob))).body.hasDream, false);

    const del = await api.delete('/api/ai/conversation').set(bearer(state.bob));
    assert.equal(del.body.cleared, true);
    assert.equal((await api.get('/api/ai/conversation').set(bearer(state.bob))).body.messages.length, 0);
    // Ada's conversation is untouched.
    assert.ok((await api.get('/api/ai/conversation').set(bearer(state.ada))).body.messages.length > 0);
  });
});

describe('Simulation and gamification integration', { skip }, () => {
  const api = request(createApp());
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const saved = { ...env.ai };
  const state = {};

  const decide = (body, token = state.ada) => api.post('/api/simulation/decisions').set(bearer(token)).send(body);
  const custom = (n, choice = 'A') => ({ title: `Custom question ${n}`, optionA: `Option ${n}a`, optionB: `Option ${n}b`, choice });
  const progress = async (token = state.ada) => (await api.get('/api/progress').set(bearer(token))).body;

  before(async () => {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.name.toLowerCase().includes('test')) {
      await mongoose.disconnect();
      throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test".');
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    await seedAchievements();
    Object.assign(env.ai, { apiKey: '', baseUrl: '', model: '' });
    setAiClientForTests(null);

    const reg = (name) =>
      api.post('/api/auth/register').send({ name, email: `${name.toLowerCase()}@example.com`, password: 'abcdefg1' });
    state.ada = (await reg('Ada')).body.token;
    state.bob = (await reg('Bob')).body.token;
    const dream = await api
      .post('/api/dreams')
      .set(bearer(state.ada))
      .send({ career: 'Chef', city: 'Lisbon', goals: 'Open a café' });
    state.dreamId = dream.body.dream.id;
    state.scenarios = dream.body.futureProfile.scenarios;
  });

  after(async () => {
    Object.assign(env.ai, saved);
    setAiClientForTests(null);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('starts with nothing visited and no decisions', async () => {
    const p = await progress();
    assert.deepEqual(p.visited, []);
    assert.deepEqual(p.decisions, []);
    assert.equal(p.dream.profile.scenarios.length, 2);
  });

  it('validates decisions and keeps dreams private', async () => {
    assert.equal((await decide({ scenarioId: state.scenarios[0].id })).status, 400); // no choice
    assert.equal((await decide({ choice: 'A' })).status, 400); // nothing to choose from
    assert.equal((await decide({ scenarioId: 'nope', choice: 'A' })).status, 400);
    assert.equal((await decide({ scenarioId: '507f1f77bcf86cd799439011', choice: 'A' })).status, 404);
    assert.equal((await decide({ title: 'Same', optionA: 'Stay', optionB: ' stay ', choice: 'A' })).status, 400);
    const crisis = await decide({ title: 'Should I', optionA: 'end my life', optionB: 'keep going', choice: 'A' });
    assert.equal(crisis.status, 400);
    assert.match(crisis.body.message, /someone you trust/);
    // Bob has no dream, and cannot use Ada's.
    assert.equal((await decide({ scenarioId: state.scenarios[0].id, choice: 'A' }, state.bob)).status, 404);
    assert.equal((await decide({ ...custom(0), dreamId: state.dreamId }, state.bob)).status, 404);
    assert.equal((await progress()).xp, 50); // nothing above changed anything
  });

  it('plays a saved scenario without AI: labeled template, XP and Decision Maker', async () => {
    const res = await decide({ scenarioId: state.scenarios[0].id, choice: 'B' });
    assert.equal(res.status, 201);
    assert.equal(res.body.mode, 'demo');
    assert.equal(res.body.decision.source, 'template');
    assert.equal(res.body.decision.choiceKey, 'B');
    assert.equal(res.body.decision.choice, state.scenarios[0].optionB);
    assert.equal(res.body.decision.xpAwarded, 20);
    assert.equal(res.body.xpGained, 20 + 100);
    assert.ok(res.body.newAchievements.some((a) => a.key === 'decision-maker'));
    assert.equal(res.body.xp, 50 + 120);
    assert.equal(JSON.stringify(res.body).includes('scenarioKey'), false);
  });

  it('gives no XP when the same scenario is repeated', async () => {
    const res = await decide({ scenarioId: state.scenarios[0].id, choice: 'A' });
    assert.equal(res.status, 201);
    assert.equal(res.body.xpGained, 0);
    assert.equal(res.body.noXpReason, 'repeat');
    assert.equal(res.body.xp, 170);
  });

  it('caps XP-earning decisions per day, but the simulator keeps working', async () => {
    const second = await decide(custom(1)); // 2nd rewarded decision today
    assert.equal(second.body.xpGained, 20);
    const third = await decide(custom(2)); // 3rd
    assert.equal(third.body.xpGained, 20);
    const fourth = await decide(custom(3));
    assert.equal(fourth.status, 201);
    assert.equal(fourth.body.xpGained, 0);
    assert.equal(fourth.body.noXpReason, 'daily-cap');
    assert.equal(fourth.body.xp, 210);
    // The same custom question with different capitalization counts as a repeat.
    const again = await decide({ title: 'CUSTOM QUESTION 1', optionA: 'option 1a', optionB: 'OPTION 1B', choice: 'B' });
    assert.equal(again.body.noXpReason, 'repeat');
  });

  it('labels the outcome as AI when a provider writes it', async () => {
    Object.assign(env.ai, { apiKey: 'k', baseUrl: 'https://ai.example/v1', model: 'm' });
    setAiClientForTests({
      complete: async () =>
        JSON.stringify({
          headline: 'Kitchen first',
          story: 'You might spend a year in a busy kitchen, learning the pace of service before opening your own place.',
          upside: 'Real experience.',
          challenge: 'Long hours.',
          nextStep: 'Visit three kitchens.',
        }),
    });
    const res = await decide(custom(4));
    assert.equal(res.status, 201);
    assert.equal(res.body.mode, 'live');
    assert.equal(res.body.decision.source, 'ai');
    assert.equal(res.body.decision.outcome.headline, 'Kitchen first');

    // A provider failure stores nothing.
    const { AiProviderError } = await import('../services/ai/aiClient.js');
    setAiClientForTests({
      complete: async () => {
        throw new AiProviderError('x', { kind: 'timeout' });
      },
    });
    const before = (await api.get('/api/simulation/history').set(bearer(state.ada))).body.decisions.length;
    assert.equal((await decide(custom(5))).status, 504);
    const after = (await api.get('/api/simulation/history').set(bearer(state.ada))).body.decisions.length;
    assert.equal(after, before);
    Object.assign(env.ai, { apiKey: '', baseUrl: '', model: '' });
    setAiClientForTests(null);
  });

  it('lists history newest first and only for the owner', async () => {
    const mine = await api.get('/api/simulation/history?limit=3').set(bearer(state.ada));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.decisions.length, 3);
    assert.equal(mine.body.decisions[0].scenarioTitle, 'Custom question 4');
    const theirs = await api.get('/api/simulation/history').set(bearer(state.bob));
    assert.deepEqual(theirs.body.decisions, []);
    assert.equal((await api.get('/api/simulation/history?limit=500').set(bearer(state.ada))).status, 400);
    assert.equal(
      (await api.get(`/api/simulation/history?dreamId=${state.dreamId}`).set(bearer(state.bob))).status,
      404
    );
    assert.equal((await progress()).decisions.length, 3); // the dashboard shows the latest three
  });

  it('records world visits once each and grants Future Explorer after all three', async () => {
    const visit = (location, token = state.ada) =>
      api.post('/api/progress/visit').set(bearer(token)).send({ location });
    assert.equal((await visit('city')).status, 400);
    assert.equal((await visit('park')).status, 400);

    const xpBefore = (await progress()).xp;
    const a = await visit('apartment');
    assert.equal(a.body.firstVisit, true);
    assert.equal(a.body.xpGained, 10);
    assert.deepEqual(a.body.remaining, ['office', 'cafe']);

    const again = await visit('apartment');
    assert.equal(again.body.firstVisit, false);
    assert.equal(again.body.xpGained, 0);

    assert.equal((await visit('office')).body.xpGained, 10);
    const last = await visit('cafe');
    assert.equal(last.body.xpGained, 10 + 75);
    assert.ok(last.body.newAchievements.some((x) => x.key === 'future-explorer'));
    assert.deepEqual(last.body.remaining, []);
    assert.equal((await progress()).xp, xpBefore + 10 + 10 + 85);

    const ach = await api.get('/api/achievements').set(bearer(state.ada));
    const byKey = Object.fromEntries(ach.body.achievements.map((x) => [x.key, x]));
    assert.equal(byKey['future-explorer'].earned, true);
    assert.equal(byKey['decision-maker'].earned, true);

    // Another user's progress is separate.
    assert.deepEqual((await progress(state.bob)).visited, []);
  });
});

describe('Daily streak integration', { skip }, () => {
  const api = request(createApp());
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const state = {};

  before(async () => {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.name.toLowerCase().includes('test')) {
      await mongoose.disconnect();
      throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test".');
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    await seedAchievements();
    env.game.streakStepXp = 5; // other suites run with the bonus off

    const reg = (name) =>
      api.post('/api/auth/register').send({ name, email: `${name.toLowerCase()}@example.com`, password: 'abcdefg1' });
    for (const name of ['Ada', 'Bob', 'Cy']) {
      state[name] = (await reg(name)).body.token;
      const dream = await api.post('/api/dreams').set(bearer(state[name])).send({ career: 'Chef', goals: 'Open a café' });
      state[`${name}Dream`] = dream.body.dream.id;
    }
    const progress = await api.get('/api/progress').set(bearer(state.Ada));
    state.milestone = progress.body.roadmap.milestones[0];
  });

  after(async () => {
    env.game.streakStepXp = 0;
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('reports titles and an empty streak for a new user', async () => {
    const p = (await api.get('/api/progress').set(bearer(state.Ada))).body;
    assert.equal(p.title, 'Explorer');
    assert.deepEqual(p.streak, { count: 0, best: 0, doneToday: false, todayBonus: 5 });
  });

  it('pays the streak bonus once, on the first useful action of the day', async () => {
    const tick = (taskIndex, done = true) =>
      api
        .patch(`/api/progress/milestones/${state.milestone.id}`)
        .set(bearer(state.Ada))
        .set('X-Timezone', 'America/Los_Angeles')
        .send({ taskId: state.milestone.tasks[taskIndex].id, done });

    const first = await tick(0);
    assert.equal(first.body.xpGained, 10 + 5);
    assert.equal(first.body.streak.counted, true);
    assert.equal(first.body.streak.count, 1);
    assert.deepEqual(first.body.progress.streak, { count: 1, best: 1, doneToday: true, todayBonus: 0 });

    const second = await tick(1);
    assert.equal(second.body.xpGained, 10);
    assert.equal(second.body.streak.counted, false);

    // Unticking and re-ticking is not a new action.
    assert.equal((await tick(0, false)).body.xpGained, 0);
    assert.equal((await tick(0)).body.xpGained, 0);
  });

  it('counts decisions and building visits too, but only one bonus a day', async () => {
    const decision = await api
      .post('/api/simulation/decisions')
      .set(bearer(state.Bob))
      .set('X-Timezone', 'Europe/Lisbon')
      .send({ title: 'Move?', optionA: 'Stay', optionB: 'Go', choice: 'A' });
    assert.equal(decision.status, 201);
    assert.equal(decision.body.streak.counted, true);
    assert.equal(decision.body.xpGained, 20 + 100 + 5);

    const visit = await api
      .post('/api/progress/visit')
      .set(bearer(state.Bob))
      .set('X-Timezone', 'Europe/Lisbon')
      .send({ location: 'office' });
    assert.equal(visit.body.xpGained, 10);
    assert.equal(visit.body.streak.counted, false);
  });

  it('pays only one bonus when two first actions arrive at the same time', async () => {
    const visit = (location) =>
      api.post('/api/progress/visit').set(bearer(state.Cy)).send({ location });
    const [a, b] = await Promise.all([visit('apartment'), visit('cafe')]);
    const counted = [a, b].filter((r) => r.body.streak.counted);
    assert.equal(counted.length, 1);
    assert.equal(a.body.streak.xpGained + b.body.streak.xpGained, 5);
  });

  it('ignores an invalid time zone instead of failing', async () => {
    const res = await api.get('/api/progress').set(bearer(state.Ada)).set('X-Timezone', 'Not/AZone');
    assert.equal(res.status, 200);
    assert.equal(res.body.streak.count, 1);
  });
});


describe('Password reset integration', { skip }, () => {
  const api = request(createApp());
  const bearer = (token) => ({ Authorization: `Bearer ${token}` });
  const state = {};
  const sent = [];
  const mail = { fail: false };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tokenFrom = (m) => m.text.match(/reset-password\?token=([a-f0-9]{64})/)[1];
  // The server answers before it sends the email, so wait for the email to show up.
  const waitForMails = async (count) => {
    for (let i = 0; i < 150 && sent.length < count; i += 1) await sleep(20);
    return sent.length;
  };
  const waitFor = async (check) => {
    for (let i = 0; i < 150; i += 1) {
      if (await check()) return true;
      await sleep(20);
    }
    return false;
  };
  const forgot = (email) => api.post('/api/auth/forgot-password').send({ email });
  const reset = (token, password) => api.post('/api/auth/reset-password').send({ token, password });
  const login = (email, password) => api.post('/api/auth/login').send({ email, password });

  before(async () => {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
    if (!mongoose.connection.name.toLowerCase().includes('test')) {
      await mongoose.disconnect();
      throw new Error('Refusing to run: TEST_MONGODB_URI database name must contain "test".');
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
    setMailerForTests({
      mode: 'brevo',
      send: async (m) => {
        mail.onSend?.();
        if (mail.fail) throw new Error('email service down');
        sent.push(m);
      },
    });
    for (const name of ['Ada', 'Bob', 'Cy']) {
      const res = await api
        .post('/api/auth/register')
        .send({ name, email: `${name.toLowerCase()}@example.com`, password: 'abcdefg1' });
      state[name] = res.body.token;
    }
  });

  after(async () => {
    setMailerForTests(null);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });

  it('gives the same answer for an unknown email and sends nothing', async () => {
    const res = await forgot('nobody@example.com');
    assert.equal(res.status, 200);
    assert.equal(res.body.delivery, 'email');
    state.generic = res.body;
    // Same work without the website in between, so the outcome does not depend on timing.
    assert.deepEqual(await requestPasswordReset('nobody@example.com'), { sent: false, reason: 'no-account' });
    await sleep(150);
    assert.equal(sent.length, 0);
  });

  it('emails a link for a known email, with exactly the same answer', async () => {
    const res = await forgot('ADA@example.com');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, state.generic);
    assert.equal(await waitForMails(1), 1);
    assert.equal(sent[0].to, 'ada@example.com');
    state.adaToken = tokenFrom(sent[0]);
  });

  it('stores only a hash of the token, with a one-hour expiry', async () => {
    const user = await User.findOne({ email: 'ada@example.com' }).select('+resetTokenHash +resetTokenExpires');
    assert.equal(user.resetTokenHash, hashResetToken(state.adaToken));
    assert.notEqual(user.resetTokenHash, state.adaToken);
    const minutes = (user.resetTokenExpires.getTime() - Date.now()) / 60000;
    assert.ok(minutes > 58 && minutes <= 60, `expires in ${minutes} minutes`);
  });

  it('does not send a second email inside the one-minute cooldown', async () => {
    const res = await forgot('ada@example.com');
    assert.equal(res.status, 200);
    assert.deepEqual(await requestPasswordReset('ada@example.com'), { sent: false, reason: 'cooldown' });
    await sleep(150);
    assert.equal(sent.length, 1);
  });

  it('refuses unknown, malformed and weak requests without changing anything', async () => {
    const wrong = await reset('b'.repeat(64), 'newpass99');
    assert.equal(wrong.status, 400);
    assert.match(wrong.body.message, /invalid or has expired/i);
    assert.equal((await reset('not-a-token', 'newpass99')).status, 400);
    const weak = await reset(state.adaToken, 'weak');
    assert.equal(weak.status, 400);
    assert.equal(weak.body.message, 'Validation failed');
    assert.equal((await login('ada@example.com', 'abcdefg1')).status, 200, 'old password still works');
  });

  it('sets the new password, and the link works only once', async () => {
    await sleep(1100); // logins are compared by whole seconds; make the old login clearly older
    const res = await reset(state.adaToken, 'newpass99');
    assert.equal(res.status, 200);
    assert.equal((await login('ada@example.com', 'abcdefg1')).status, 401);
    const fresh = await login('ada@example.com', 'newpass99');
    assert.equal(fresh.status, 200);
    state.adaFresh = fresh.body.token;
    const again = await reset(state.adaToken, 'another99x');
    assert.equal(again.status, 400);
    assert.equal((await login('ada@example.com', 'newpass99')).status, 200, 'password unchanged by the reused link');
  });

  it('signs out logins that were issued before the reset', async () => {
    const old = await api.get('/api/auth/me').set(bearer(state.Ada));
    assert.equal(old.status, 401);
    assert.match(old.body.message, /password was changed/i);
    const fresh = await api.get('/api/auth/me').set(bearer(state.adaFresh));
    assert.equal(fresh.status, 200);
    const bob = await api.get('/api/auth/me').set(bearer(state.Bob));
    assert.equal(bob.status, 200, 'other accounts are not affected');
  });

  it('rejects an expired link', async () => {
    const before = sent.length;
    await forgot('bob@example.com');
    assert.equal(await waitForMails(before + 1), before + 1);
    const token = tokenFrom(sent.at(-1));
    await User.updateOne(
      { email: 'bob@example.com' },
      { $set: { resetTokenExpires: new Date(Date.now() - 1000) } }
    );
    const res = await reset(token, 'newpass99');
    assert.equal(res.status, 400);
    assert.equal((await login('bob@example.com', 'abcdefg1')).status, 200, 'password unchanged');
  });

  it('lets only one of two simultaneous uses of the same link win', async () => {
    // Bob's cooldown is still running from the previous test; reset it so a new link can be sent.
    await User.updateOne({ email: 'bob@example.com' }, { $unset: { resetRequestedAt: 1 } });
    const before = sent.length;
    await forgot('bob@example.com');
    assert.equal(await waitForMails(before + 1), before + 1);
    const token = tokenFrom(sent.at(-1));
    const [a, b] = await Promise.all([reset(token, 'firstpass1'), reset(token, 'secondpass2')]);
    assert.deepEqual([a.status, b.status].sort(), [200, 400]);
  });

  it('removes the link and allows a retry when the email cannot be sent', async () => {
    mail.fail = true;
    const attempted = new Promise((resolve) => {
      mail.onSend = resolve;
    });
    const res = await forgot('cy@example.com');
    assert.equal(res.status, 200, 'the website is not told about delivery problems');
    await attempted; // the send was tried, so the link had been stored just before
    mail.onSend = null;
    const cleaned = await waitFor(async () => {
      const user = await User.findOne({ email: 'cy@example.com' }).select('+resetTokenHash +resetRequestedAt');
      return user.resetTokenHash === undefined && user.resetRequestedAt === undefined;
    });
    assert.ok(cleaned, 'the stored link and the cooldown are removed after a failed send');

    mail.fail = false;
    const before = sent.length;
    await forgot('cy@example.com');
    assert.equal(await waitForMails(before + 1), before + 1);
    assert.equal(sent.at(-1).to, 'cy@example.com');
  });
});
